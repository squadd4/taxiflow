"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { requestQuote } from "@/lib/contact/actions";
import { LIMITS, type QuoteField, type QuoteState } from "@/lib/contact/validation";
import buttons from "../ButtonLink.module.css";
import styles from "./Contact.module.css";

const INITIAL: QuoteState = { status: "idle" };
const FIELD_ORDER: QuoteField[] = ["name", "email", "phone", "type", "message"];
const id = (field: string) => `orcamento-${field}`;

function Field({
  field,
  label,
  optional,
  hint,
  error,
  children,
}: {
  field: QuoteField;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id(field)}>
        {label}
        {optional && <span className={styles.optional}> (opcional)</span>}
      </label>
      {hint && (
        <p id={`${id(field)}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id(field)}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

/** aria-describedby for a field: its hint and, when present, its error. */
const describedBy = (field: QuoteField, error?: string, hint?: boolean) =>
  [hint && `${id(field)}-hint`, error && `${id(field)}-error`].filter(Boolean).join(" ") || undefined;

export default function Contact() {
  const [state, formAction, pending] = useActionState(requestQuote, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  // Move focus to what changed: the first invalid field, or the result message.
  useEffect(() => {
    if (state.status === "invalid") {
      const first = FIELD_ORDER.find((field) => state.errors?.[field]);
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    } else if (state.status === "sent" || state.status === "error") {
      noticeRef.current?.focus();
    }
  }, [state]);

  return (
    <section id="contacto" className={styles.section} aria-labelledby="contacto-title">
      <div className={styles.layout}>
        <div className={styles.intro}>
          <h2 id="contacto-title" className={styles.heading}>
            Pede um orçamento
          </h2>
          <p className={styles.lead}>
            Conta-nos como trabalhas, sozinho ou com frota, e o que precisas que a aplicação
            faça. Respondemos por email com uma proposta.
          </p>
        </div>

        {state.status === "sent" ? (
          <div ref={noticeRef} className={styles.done} role="status" tabIndex={-1}>
            <p className={styles.doneTitle}>Pedido enviado</p>
            <p className={styles.doneText}>
              Obrigado. Vamos ler o que escreveste e responder para o email que indicaste.
            </p>
          </div>
        ) : (
          <form ref={formRef} action={formAction} className={styles.form} noValidate>
            <Field field="name" label="Nome" error={errors.name}>
              <input
                id={id("name")}
                className={styles.input}
                name="name"
                autoComplete="name"
                maxLength={LIMITS.name}
                required
                defaultValue={values.name}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy("name", errors.name)}
              />
            </Field>

            <div className={styles.pair}>
              <Field field="email" label="Email" error={errors.email}>
                <input
                  id={id("email")}
                  className={styles.input}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={LIMITS.email}
                  required
                  defaultValue={values.email}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={describedBy("email", errors.email)}
                />
              </Field>
              <Field field="phone" label="Telemóvel" optional error={errors.phone}>
                <input
                  id={id("phone")}
                  className={styles.input}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={LIMITS.phone}
                  defaultValue={values.phone}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={describedBy("phone", errors.phone)}
                />
              </Field>
            </div>

            <fieldset
              className={styles.choice}
              data-invalid={Boolean(errors.type)}
              aria-describedby={errors.type ? `${id("type")}-error` : undefined}
            >
              <legend className={styles.label}>A aplicação é para</legend>
              <div className={styles.options} role="radiogroup" aria-invalid={Boolean(errors.type)}>
                <label className={styles.option}>
                  <input
                    type="radio"
                    name="type"
                    value="motorista"
                    required
                    defaultChecked={values.type === "motorista"}
                  />
                  <span>Mim, como motorista</span>
                </label>
                <label className={styles.option}>
                  <input
                    type="radio"
                    name="type"
                    value="empresa"
                    defaultChecked={values.type === "empresa"}
                  />
                  <span>A minha empresa de táxis</span>
                </label>
              </div>
              {errors.type && (
                <p id={`${id("type")}-error`} className={styles.error}>
                  {errors.type}
                </p>
              )}
            </fieldset>

            <Field
              field="message"
              label="O que precisas que a aplicação faça"
              hint="Por exemplo: comissões da empresa, várias viaturas, turnos e folgas, relatórios para a contabilidade."
              error={errors.message}
            >
              <textarea
                id={id("message")}
                className={`${styles.input} ${styles.textarea}`}
                name="message"
                rows={5}
                maxLength={LIMITS.message}
                required
                defaultValue={values.message}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={describedBy("message", errors.message, true)}
              />
            </Field>

            <input type="hidden" name="requestId" value={state.requestId ?? ""} />

            {/* Honeypot: invisible to people, tempting to bots. */}
            <div className={styles.trap} aria-hidden="true">
              <label htmlFor={id("website")}>Não preencher</label>
              <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" />
            </div>

            {state.status === "error" && (
              <div ref={noticeRef} className={styles.failed} role="alert" tabIndex={-1}>
                {state.message}
                {state.contactEmail && (
                  <>
                    {" "}
                    Se preferires, escreve-nos para{" "}
                    <a className={styles.failedLink} href={`mailto:${state.contactEmail}`}>
                      {state.contactEmail}
                    </a>
                    .
                  </>
                )}
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="submit"
                className={`${buttons.button} ${buttons.primary} ${styles.submit}`}
                disabled={pending}
              >
                {pending ? "A enviar…" : "Pedir orçamento"}
              </button>
              <p className={styles.note}>Usamos estes dados apenas para responder ao teu pedido.</p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
