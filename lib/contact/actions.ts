"use server";

import { readQuoteRequest, type QuoteState } from "./validation";

/**
 * Receives the quote request form. Valid requests are posted as JSON to
 * CONTACT_WEBHOOK_URL (a Google Apps Script web app, Make, Zapier, Formspree…),
 * so delivery can change without touching the site.
 */
export async function requestQuote(_previous: QuoteState, formData: FormData): Promise<QuoteState> {
  // Bots fill the hidden field; pretend it worked and deliver nothing.
  if (String(formData.get("website") ?? "").trim()) return { status: "sent" };

  const result = readQuoteRequest((key) => formData.get(key));
  if (!result.ok) return { status: "invalid", errors: result.errors, values: result.values };

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[orçamento] CONTACT_WEBHOOK_URL is not set; request not delivered:", result.data);
      return { status: "sent" };
    }
    console.error("[orçamento] CONTACT_WEBHOOK_URL is not set; a quote request was not delivered.");
    return { status: "error", values: result.data };
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...result.data,
        receivedAt: new Date().toISOString(),
        source: "taxiflow-landing",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { status: "sent" };
  } catch (error) {
    console.error("[orçamento] delivery failed:", error);
    return { status: "error", values: result.data };
  }
}
