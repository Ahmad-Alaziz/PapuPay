/** Field limits shared by the contact form and the /api/contact route. */
export const contactLimits = {
  name: 200,
  email: 254,
  messageMin: 10,
  messageMax: 5000,
} as const;

/** Name of the hidden honeypot field. Real users never fill it in. */
export const honeypotField = "company_website";

export type ContactErrorCode = "validation" | "rate_limited" | "server";

export type ContactResponse = { ok: true } | { ok: false; error: ContactErrorCode };
