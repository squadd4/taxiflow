import assert from "node:assert/strict";
import { test } from "node:test";

const { deliverQuote } = await import("../lib/contact/delivery.ts");

const DATA = {
  name: "Ana Costa",
  email: "ana@exemplo.pt",
  phone: "",
  type: "empresa",
  message: "Temos 3 viaturas e 5 motoristas.",
};
const APPS_SCRIPT = "https://script.google.com/macros/s/AKfy-test/exec";
const BASE = {
  url: APPS_SCRIPT,
  secret: "s3gredo",
  id: "8d7f0b2e-1c2d-4e5f-9a0b-123456789abc",
  receivedAt: "2026-09-13T10:00:00.000Z",
  retryDelayMs: 1,
  timeoutMs: 40,
};

/** fetch stand-in: answers in order ([status, body], an Error, or "hang" until aborted). */
function fakeFetch(...answers) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (answer === "hang") {
      return new Promise((_, reject) =>
        init.signal.addEventListener("abort", () => reject(init.signal.reason)),
      );
    }
    if (answer instanceof Error) throw answer;
    const [status, body] = answer;
    return new Response(body, { status });
  };
  fn.calls = calls;
  return fn;
}

test("without a URL nothing is sent", async () => {
  const fetch = fakeFetch([200, '{"ok":true}']);
  const result = await deliverQuote(DATA, { ...BASE, url: undefined, fetch });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-configured");
  assert.equal(fetch.calls.length, 0);
});

test("a JSON ok from the script is a delivery, with every field, the reference and the secret", async () => {
  const fetch = fakeFetch([200, '{"ok":true}']);
  const result = await deliverQuote(DATA, { ...BASE, fetch });
  assert.deepEqual(result, { ok: true, duplicate: false });
  assert.equal(fetch.calls.length, 1);
  const [call] = fetch.calls;
  assert.equal(call.url, APPS_SCRIPT);
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers["Content-Type"], "application/json");
  assert.deepEqual(call.body, {
    ...DATA,
    id: BASE.id,
    receivedAt: BASE.receivedAt,
    source: "taxiflow-landing",
    token: "s3gredo",
  });
});

test("a repeated reference is reported as a duplicate, still a success", async () => {
  const result = await deliverQuote(DATA, { ...BASE, fetch: fakeFetch([200, '{"ok":true,"duplicate":true}']) });
  assert.deepEqual(result, { ok: true, duplicate: true });
});

test("an HTML page from Google is a rejection, not a success, and is not retried", async () => {
  const fetch = fakeFetch([200, "<!doctype html><title>Iniciar sessão</title>"]);
  const result = await deliverQuote(DATA, { ...BASE, fetch });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "rejected");
  assert.equal(fetch.calls.length, 1);
});

test("a wrong secret is rejected once, without retrying", async () => {
  const fetch = fakeFetch([200, '{"ok":false,"error":"unauthorized"}']);
  const result = await deliverQuote(DATA, { ...BASE, fetch });
  assert.equal(result.reason, "rejected");
  assert.match(result.detail, /unauthorized/);
  assert.equal(fetch.calls.length, 1);
});

test("a script error or an unavailable server is retried with the same reference", async () => {
  const fetch = fakeFetch([200, '{"ok":false,"error":"script-error"}'], [503, "busy"], [200, '{"ok":true}']);
  const result = await deliverQuote(DATA, { ...BASE, attempts: 3, fetch });
  assert.deepEqual(result, { ok: true, duplicate: false });
  assert.equal(fetch.calls.length, 3);
  assert.ok(fetch.calls.every((call) => call.body.id === BASE.id));
});

test("persistent failures give up after the attempts and say why", async () => {
  const down = fakeFetch([502, "bad gateway"]);
  const unavailable = await deliverQuote(DATA, { ...BASE, fetch: down });
  assert.equal(unavailable.reason, "unavailable");
  assert.equal(down.calls.length, 2);

  const offline = fakeFetch(new TypeError("fetch failed"));
  assert.equal((await deliverQuote(DATA, { ...BASE, fetch: offline })).reason, "unavailable");
});

test("no answer in time is a timeout, retried once", async () => {
  const fetch = fakeFetch("hang");
  const result = await deliverQuote(DATA, { ...BASE, fetch });
  assert.equal(result.reason, "timeout");
  assert.equal(fetch.calls.length, 2);
});

test("other webhooks only need a 2xx answer", async () => {
  const make = "https://hook.eu1.make.com/abc";
  const accepted = await deliverQuote(DATA, { ...BASE, url: make, fetch: fakeFetch([200, "Accepted"]) });
  assert.deepEqual(accepted, { ok: true, duplicate: false });
  const missing = await deliverQuote(DATA, { ...BASE, url: make, fetch: fakeFetch([404, "no"]) });
  assert.equal(missing.reason, "rejected");
});

test("a malformed URL is reported as a configuration problem", async () => {
  const result = await deliverQuote(DATA, { ...BASE, url: "script.google.com/exec", fetch: fakeFetch([200, "{}"]) });
  assert.equal(result.reason, "not-configured");
});
