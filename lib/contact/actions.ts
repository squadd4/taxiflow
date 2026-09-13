"use server";

import { deliverQuote, type DeliveryFailure } from "./delivery";
import { readQuoteRequest, type QuoteState } from "./validation";

const KEPT = "Os teus dados continuam no formulário.";

const MESSAGES: Record<DeliveryFailure, string> = {
  timeout: `O envio demorou demasiado e não conseguimos confirmar que o pedido chegou. ${KEPT} Carrega outra vez em Pedir orçamento: não fica repetido.`,
  unavailable: `Não conseguimos ligar ao sistema de pedidos. ${KEPT} Tenta outra vez daqui a alguns minutos.`,
  rejected: `O pedido não foi aceite por um problema do nosso lado. ${KEPT} Tenta outra vez daqui a alguns minutos.`,
  "not-configured": `Neste momento o formulário não está a receber pedidos. ${KEPT}`,
};

const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Receives the quote request form and sends it to the Google Sheets web app
 * (CONTACT_WEBHOOK_URL). A failed attempt keeps the typed values and the request
 * reference, so sending again never creates a duplicate row.
 */
export async function requestQuote(_previous: QuoteState, formData: FormData): Promise<QuoteState> {
  // Bots fill the hidden field; pretend it worked and deliver nothing.
  if (String(formData.get("website") ?? "").trim()) return { status: "sent" };

  const result = readQuoteRequest((key) => formData.get(key));
  if (!result.ok) return { status: "invalid", errors: result.errors, values: result.values };

  const previousId = String(formData.get("requestId") ?? "");
  const id = REQUEST_ID.test(previousId) ? previousId : crypto.randomUUID();
  const receivedAt = new Date().toISOString();
  const url = process.env.CONTACT_WEBHOOK_URL?.trim();

  if (!url && process.env.NODE_ENV !== "production") {
    console.info("[orçamento] CONTACT_WEBHOOK_URL is not set; request not delivered:", { ...result.data, id });
    return { status: "sent" };
  }

  const delivery = await deliverQuote(result.data, {
    url,
    secret: process.env.CONTACT_WEBHOOK_SECRET?.trim(),
    id,
    receivedAt,
  });
  if (delivery.ok) return { status: "sent" };

  // Last resort so no request is lost: the whole request is kept in the server logs.
  console.error(
    `[orçamento] NOT DELIVERED (${delivery.reason}: ${delivery.detail}). Recover this request:`,
    JSON.stringify({ ...result.data, id, receivedAt }),
  );
  return {
    status: "error",
    message: MESSAGES[delivery.reason],
    contactEmail: process.env.CONTACT_EMAIL?.trim() || undefined,
    requestId: id,
    values: result.data,
  };
}
