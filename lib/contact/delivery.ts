import type { QuoteRequest } from "./validation";

/** Why a quote request did not reach the spreadsheet. */
export type DeliveryFailure = "not-configured" | "timeout" | "unavailable" | "rejected";

export type DeliveryResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; reason: DeliveryFailure; detail: string };

export interface DeliveryOptions {
  url?: string;
  secret?: string;
  /** Stable reference: retries of the same request are written once by the script. */
  id: string;
  receivedAt: string;
  fetch?: typeof fetch;
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
}

const GOOGLE_SCRIPT = /(^|\.)script\.google(usercontent)?\.com$/;

/**
 * Posts a quote request as JSON to the Google Apps Script web app (or any webhook),
 * retrying timeouts and temporary failures. Never throws.
 */
export async function deliverQuote(
  data: QuoteRequest,
  options: DeliveryOptions,
): Promise<DeliveryResult> {
  const { url, secret, id, receivedAt, attempts = 2, timeoutMs = 9000, retryDelayMs = 700 } = options;
  if (!url) return { ok: false, reason: "not-configured", detail: "CONTACT_WEBHOOK_URL is not set" };

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return { ok: false, reason: "not-configured", detail: "CONTACT_WEBHOOK_URL is not a valid URL" };
  }

  const send = options.fetch ?? fetch;
  // Google answers 200 with an HTML page when access or the URL is wrong, so only JSON counts there.
  const needsJson = GOOGLE_SCRIPT.test(host);
  const body = JSON.stringify({ ...data, id, receivedAt, source: "taxiflow-landing", token: secret ?? "" });

  let result: DeliveryResult = { ok: false, reason: "unavailable", detail: "not attempted" };
  for (let attempt = 1; attempt <= attempts; attempt++) {
    result = await attemptDelivery(send, url, body, needsJson, timeoutMs);
    if (result.ok || result.reason === "rejected") return result;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
  }
  return result;
}

async function attemptDelivery(
  send: typeof fetch,
  url: string,
  body: string,
  needsJson: boolean,
  timeoutMs: number,
): Promise<DeliveryResult> {
  let response: Response;
  try {
    response = await send(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = (error as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, reason: "timeout", detail: `no answer after ${timeoutMs} ms` };
    }
    return { ok: false, reason: "unavailable", detail: String((error as Error)?.message ?? error) };
  }

  if (response.status === 429 || response.status >= 500) {
    return { ok: false, reason: "unavailable", detail: `HTTP ${response.status}` };
  }
  if (!response.ok) return { ok: false, reason: "rejected", detail: `HTTP ${response.status}` };

  const text = await response.text().catch(() => "");
  let answer: { ok?: unknown; duplicate?: unknown; error?: unknown } | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "ok" in parsed) answer = parsed;
  } catch {
    // Not JSON: judged below.
  }

  if (answer) {
    if (answer.ok === true) return { ok: true, duplicate: answer.duplicate === true };
    const error = String(answer.error ?? "ok=false");
    return {
      ok: false,
      reason: error === "script-error" ? "unavailable" : "rejected",
      detail: `webhook answered ${error}`,
    };
  }
  if (needsJson) {
    return { ok: false, reason: "rejected", detail: `unexpected answer: ${text.slice(0, 120).replace(/\s+/g, " ")}` };
  }
  return { ok: true, duplicate: false };
}
