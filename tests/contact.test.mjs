import assert from "node:assert/strict";
import { test } from "node:test";

const { LIMITS, readQuoteRequest } = await import("../lib/contact/validation.ts");

const form = (values) => (key) => values[key] ?? null;
const VALID = {
  name: "  Ana Costa ",
  email: "ana@exemplo.pt",
  phone: "",
  type: "motorista",
  message: "Preciso de separar as comissões da empresa.",
};

test("a complete request passes, trimmed, with the phone optional", () => {
  const result = readQuoteRequest(form(VALID));
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { ...VALID, name: "Ana Costa" });
});

test("an empty form explains every required field", () => {
  const result = readQuoteRequest(form({}));
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["email", "message", "name", "type"]);
  assert.equal(result.errors.phone, undefined, "phone stays optional");
});

test("email and phone are checked for shape", () => {
  const bad = readQuoteRequest(form({ ...VALID, email: "ana@exemplo", phone: "12ab" }));
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.phone);

  const good = readQuoteRequest(form({ ...VALID, phone: "+351 912 345 678" }));
  assert.equal(good.ok, true);
});

test("only the two offered types are accepted", () => {
  const result = readQuoteRequest(form({ ...VALID, type: "outro" }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.type);
});

test("overlong input is refused and what was typed is kept for the form", () => {
  const long = "a".repeat(LIMITS.message + 1);
  const result = readQuoteRequest(form({ ...VALID, message: long }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.message);
  assert.equal(result.values.message, long);
  assert.equal(result.values.email, VALID.email);
});

test("non-text values are treated as empty", () => {
  const result = readQuoteRequest(form({ ...VALID, name: { file: true } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
});
