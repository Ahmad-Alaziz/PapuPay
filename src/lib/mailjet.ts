import "server-only";

const MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send";

type ContactEmail = {
  name?: string;
  email: string;
  message: string;
  locale: string;
};

type MailjetConfig = {
  apiKey: string;
  secretKey: string;
  sender: string;
  recipients: string[];
};

export class MailjetConfigError extends Error {}

function readConfig(): MailjetConfig {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const sender = process.env.MAILJET_SENDER_EMAIL;
  const recipients = (process.env.CONTACT_RECIPIENTS ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (!apiKey || !secretKey || !sender || recipients.length === 0) {
    throw new MailjetConfigError(
      "Missing MAILJET_API_KEY, MAILJET_SECRET_KEY, MAILJET_SENDER_EMAIL or CONTACT_RECIPIENTS.",
    );
  }
  return { apiKey, secretKey, sender, recipients };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Sends a contact form submission to CONTACT_RECIPIENTS via the Mailjet Send API v3.1. */
export async function sendContactEmail({ name, email, message, locale }: ContactEmail): Promise<void> {
  const config = readConfig();
  const from = name ? `${name} <${email}>` : email;
  const subject = `PapuPay contact form: ${name || email}`;

  const text = [`From: ${from}`, `Language: ${locale}`, "", message].join("\n");
  const html = `
    <p><strong>From:</strong> ${escapeHtml(name || "(no name)")} &lt;${escapeHtml(email)}&gt;</p>
    <p><strong>Language:</strong> ${escapeHtml(locale)}</p>
    <hr />
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;

  const response = await fetch(MAILJET_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.secretKey}`).toString("base64")}`,
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: config.sender, Name: "PapuPay website" },
          To: config.recipients.map((address) => ({ Email: address })),
          ReplyTo: { Email: email, ...(name ? { Name: name } : {}) },
          Subject: subject,
          TextPart: text,
          HTMLPart: html,
          CustomCampaign: "papupay_contact_form",
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const result = (await response.json().catch(() => null)) as {
    Messages?: { Status?: string }[];
  } | null;

  if (!response.ok || result?.Messages?.[0]?.Status !== "success") {
    throw new Error(`Mailjet send failed with HTTP ${response.status}`);
  }
}
