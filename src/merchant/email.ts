import "server-only";
import type { Locale } from "@/i18n/config";
import { escapeHtml, sendTransactionalEmail, transactionalEmailConfigured } from "@/lib/mailjet";

const copy = {
  en: {
    loginSubject: "Your PapuPay sign-in link",
    loginIntro: "Use this link to sign in to the PapuPay dashboard. It works once and expires in 15 minutes.",
    loginButton: "Sign in to PapuPay",
    loginIgnore: "If you didn't ask to sign in, you can ignore this email.",
    inviteSubject: (org: string) => `You're invited to manage ${org} on PapuPay`,
    inviteIntro: (org: string, role: string) =>
      `You've been invited to join ${org} on PapuPay as ${role}. PapuPay is where you set up the menu, Wi-Fi, Google reviews and loyalty card your guests open with a tap.`,
    inviteButton: "Accept the invitation",
    inviteExpiry: "The invitation expires in 7 days.",
    roles: { OWNER: "an owner", MANAGER: "a manager", STAFF: "staff" },
  },
  pl: {
    loginSubject: "Twój link do logowania w PapuPay",
    loginIntro: "Użyj tego linku, aby zalogować się do panelu PapuPay. Działa jeden raz i wygasa po 15 minutach.",
    loginButton: "Zaloguj się do PapuPay",
    loginIgnore: "Jeśli to nie Ty prosisz o logowanie, zignoruj tę wiadomość.",
    inviteSubject: (org: string) => `Zaproszenie do zarządzania ${org} w PapuPay`,
    inviteIntro: (org: string, role: string) =>
      `Zaproszono Cię do ${org} w PapuPay jako ${role}. W PapuPay ustawisz menu, Wi-Fi, opinie Google i kartę lojalnościową, które goście otwierają jednym zbliżeniem telefonu.`,
    inviteButton: "Przyjmij zaproszenie",
    inviteExpiry: "Zaproszenie wygasa po 7 dniach.",
    roles: { OWNER: "właściciel", MANAGER: "menedżer", STAFF: "obsługa" },
  },
} as const;

function layout(intro: string, button: string, url: string, footer: string) {
  const text = `${intro}\n\n${url}\n\n${footer}\n\nPapuPay`;
  const html = `<!doctype html><html><body style="margin:0;background:#fff5e7;font-family:Arial,Helvetica,sans-serif;color:#173d2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffbf5;border:1px solid #efd6b8;border-radius:24px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:22px;font-weight:800;letter-spacing:-0.5px">papupay</p>
<p style="margin:0 0 28px;font-size:16px;line-height:1.55">${escapeHtml(intro)}</p>
<p style="margin:0 0 28px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#ff762f;color:#173d2b;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:999px">${escapeHtml(button)}</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#46594e">${escapeHtml(footer)}</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#46594e;word-break:break-all">${escapeHtml(url)}</p>
</td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}

async function deliver(to: string, subject: string, body: { text: string; html: string }, url: string, campaign: string) {
  if (!transactionalEmailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("Account email is not configured.");
    // Local development without Mailjet keys: print the link instead of sending it.
    console.info(`\n[papupay] ${campaign} for ${to}:\n${url}\n`);
    return;
  }
  await sendTransactionalEmail({ to, subject, ...body, campaign });
}

export function sendLoginEmail(to: string, locale: Locale, url: string) {
  const t = copy[locale];
  return deliver(to, t.loginSubject, layout(t.loginIntro, t.loginButton, url, t.loginIgnore), url, "papupay_sign_in");
}

export function sendInvitationEmail(
  to: string,
  locale: Locale,
  url: string,
  organization: string,
  role: keyof (typeof copy)["en"]["roles"],
) {
  const t = copy[locale];
  return deliver(
    to,
    t.inviteSubject(organization),
    layout(t.inviteIntro(organization, t.roles[role]), t.inviteButton, url, t.inviteExpiry),
    url,
    "papupay_invitation",
  );
}
