"use client";

import { useId, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactLimits, honeypotField, type ContactResponse } from "@/lib/contact";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Copy = Dictionary["contact"]["form"];
type Field = "name" | "email" | "message";
type Status = "idle" | "sending" | "success" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: Record<Field, string>, copy: Copy): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (values.name.length > contactLimits.name) errors.name = copy.errors.tooLong;
  if (!EMAIL_PATTERN.test(values.email) || values.email.length > contactLimits.email) {
    errors.email = copy.errors.email;
  }
  if (values.message.length < contactLimits.messageMin) errors.message = copy.errors.message;
  else if (values.message.length > contactLimits.messageMax) errors.message = copy.errors.tooLong;
  return errors;
}

const inputClass =
  "h-12 rounded-2xl border-input bg-white px-4 text-base text-leaf focus-visible:border-leaf focus-visible:ring-leaf/25 md:text-base";

export function ContactForm({ copy, locale }: { copy: Copy; locale: Locale }) {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    };

    const nextErrors = validate(values, copy);
    setErrors(nextErrors);
    setServerError(null);
    const firstInvalid = (["name", "email", "message"] as const).find((field) => nextErrors[field]);
    if (firstInvalid) {
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, locale, [honeypotField]: String(data.get(honeypotField) ?? "") }),
      });
      const result = (await response.json().catch(() => null)) as ContactResponse | null;

      if (response.ok && result?.ok) {
        setStatus("success");
        form.reset();
        return;
      }
      const code = result && !result.ok ? result.error : "server";
      setServerError(code === "rate_limited" ? copy.errors.rateLimited : copy.errors.server);
      setStatus("error");
    } catch {
      setServerError(copy.errors.server);
      setStatus("error");
    }
  }

  const fieldProps = (field: Field) => ({
    id: `${id}-${field}`,
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined,
    onChange: () => errors[field] && setErrors((current) => ({ ...current, [field]: undefined })),
  });

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`${id}-${field}-error`} className="mt-2 text-sm font-semibold text-destructive">
        {errors[field]}
      </p>
    ) : null;

  const sending = status === "sending";

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5" aria-busy={sending}>
      <div>
        <Label htmlFor={`${id}-name`} className="mb-2 text-sm font-bold text-leaf">
          {copy.name} <span className="font-medium text-muted-foreground">({copy.optional})</span>
        </Label>
        <Input
          {...fieldProps("name")}
          autoComplete="name"
          maxLength={contactLimits.name}
          placeholder={copy.namePlaceholder}
          className={inputClass}
        />
        {fieldError("name")}
      </div>

      <div>
        <Label htmlFor={`${id}-email`} className="mb-2 text-sm font-bold text-leaf">
          {copy.email} <span className="font-medium text-muted-foreground">({copy.required})</span>
        </Label>
        <Input
          {...fieldProps("email")}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={contactLimits.email}
          placeholder={copy.emailPlaceholder}
          className={inputClass}
        />
        {fieldError("email")}
      </div>

      <div>
        <Label htmlFor={`${id}-message`} className="mb-2 text-sm font-bold text-leaf">
          {copy.message} <span className="font-medium text-muted-foreground">({copy.required})</span>
        </Label>
        <Textarea
          {...fieldProps("message")}
          required
          rows={5}
          maxLength={contactLimits.messageMax}
          placeholder={copy.messagePlaceholder}
          className={`${inputClass} h-auto min-h-36 py-3`}
        />
        {fieldError("message")}
      </div>

      {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-hp`}>{copy.honeypot}</label>
        <input id={`${id}-hp`} type="text" name={honeypotField} tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" size="xl" disabled={sending} className="w-full sm:w-auto">
        {sending ? (
          <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
        ) : (
          <Send data-icon="inline-start" aria-hidden="true" />
        )}
        {sending ? copy.sending : copy.submit}
      </Button>

      <div role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <m.p
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-2xl bg-lime p-4 font-semibold text-leaf"
            >
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              {copy.success}
            </m.p>
          ) : null}
          {status === "error" && serverError ? (
            <m.p
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-2xl bg-[#fde4e1] p-4 font-semibold text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              {serverError}
            </m.p>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
}
