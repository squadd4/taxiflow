/** Quote request form: field rules and messages. No imports, so it is testable in Node. */

export type ClientType = "motorista" | "empresa";

export interface QuoteRequest {
  name: string;
  email: string;
  phone: string;
  type: ClientType;
  message: string;
}

export type QuoteField = keyof QuoteRequest;
export type QuoteErrors = Partial<Record<QuoteField, string>>;

export interface QuoteState {
  status: "idle" | "invalid" | "sent" | "error";
  errors?: QuoteErrors;
  /** What the person typed, so the form can be filled back in after a failed attempt. */
  values?: Partial<Record<QuoteField, string>>;
}

export const LIMITS = { name: 120, email: 200, phone: 30, message: 3000 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s()-]+$/;

export type QuoteResult =
  | { ok: true; data: QuoteRequest }
  | { ok: false; errors: QuoteErrors; values: Partial<Record<QuoteField, string>> };

/** Reads and checks the fields. `get` is `formData.get` or any key lookup. */
export function readQuoteRequest(get: (key: string) => unknown): QuoteResult {
  const text = (key: QuoteField) => {
    const value = get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const values = {
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    type: text("type"),
    message: text("message"),
  };
  const errors: QuoteErrors = {};

  if (!values.name) errors.name = "Escreve o teu nome.";
  else if (values.name.length > LIMITS.name) errors.name = `Usa no máximo ${LIMITS.name} caracteres.`;

  if (!values.email) errors.email = "Escreve o teu email para te podermos responder.";
  else if (values.email.length > LIMITS.email || !EMAIL.test(values.email))
    errors.email = "Este email parece incompleto. Confirma se tem @ e domínio, por exemplo nome@exemplo.pt.";

  const digits = values.phone.replace(/\D/g, "");
  if (
    values.phone &&
    (values.phone.length > LIMITS.phone || !PHONE.test(values.phone) || digits.length < 9 || digits.length > 15)
  )
    errors.phone = "Confirma o número: só algarismos, com o indicativo se não for português.";

  if (values.type !== "motorista" && values.type !== "empresa")
    errors.type = "Escolhe se a app é para ti como motorista ou para uma empresa.";

  if (!values.message) errors.message = "Conta-nos em poucas linhas o que precisas que a app faça.";
  else if (values.message.length > LIMITS.message)
    errors.message = `A mensagem é longa demais. Resume em até ${LIMITS.message} caracteres.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors, values };
  return { ok: true, data: { ...values, type: values.type as ClientType } };
}
