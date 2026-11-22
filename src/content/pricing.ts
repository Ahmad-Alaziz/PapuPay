import type { Locale } from "@/i18n/config";

/**
 * Pricing configuration.
 *
 * ⚠️  Every value marked `PLACEHOLDER` is a stand-in. Replace it before launch.
 * Text is defined per locale ("en" and "pl") so each tier stays in one place.
 */

type Localized<T> = Record<Locale, T>;

export type PricingTier = {
  id: string;
  /** Highlights the card and shows the "Most popular" badge. */
  featured?: boolean;
  name: Localized<string>;
  description: Localized<string>;
  /** `null` hides the price until a public amount is set. */
  price: {
    amount: string;
    currency: string;
    period: Localized<string>;
  } | null;
  features: Localized<string[]>;
  cta: {
    label: Localized<string>;
    href: string;
  };
};

export const pricingTiers: PricingTier[] = [
  {
    id: "essentials",
    name: { en: "Essentials", pl: "Podstawowy" }, // PLACEHOLDER
    description: {
      en: "A digital menu and more Google reviews, from one sticker.", // PLACEHOLDER
      pl: "Cyfrowe menu i więcej opinii Google z jednej naklejki.", // PLACEHOLDER
    },
    price: null,
    features: {
      // PLACEHOLDER
      en: [
        "Digital menu with admin dashboard",
        "QR code stickers for your tables",
        "Google review link",
        "Unlimited menu updates",
      ],
      // PLACEHOLDER
      pl: [
        "Cyfrowe menu z panelem administracyjnym",
        "Naklejki z kodem QR na stoliki",
        "Link do opinii Google",
        "Nielimitowane zmiany w menu",
      ],
    },
    cta: { label: { en: "Get started", pl: "Zacznij" }, href: "#contact" },
  },
  {
    id: "all-in-one",
    featured: true,
    name: { en: "All-in-one", pl: "Wszystko w jednym" }, // PLACEHOLDER
    description: {
      en: "Menus, reviews and a loyalty programme that brings regulars back.", // PLACEHOLDER
      pl: "Menu, opinie i program lojalnościowy, dzięki któremu goście wracają.", // PLACEHOLDER
    },
    price: null,
    features: {
      // PLACEHOLDER
      en: [
        "Everything in Essentials",
        "Loyalty cards with your own rewards",
        "NFC tag for your counter",
        "Priority support",
      ],
      // PLACEHOLDER
      pl: [
        "Wszystko z planu Podstawowego",
        "Karty lojalnościowe z Twoimi nagrodami",
        "Tag NFC przy ladzie",
        "Priorytetowe wsparcie",
      ],
    },
    cta: { label: { en: "Get started", pl: "Zacznij" }, href: "#contact" },
  },
  {
    id: "ask-us",
    name: { en: "Not sure? Ask us", pl: "Nie wiesz? Zapytaj" },
    description: {
      en: "Not sure which features fit your venue, or have several locations? Tell us about your business and we'll help you choose, with no commitment.",
      pl: "Nie wiesz, które funkcje pasują do Twojego lokalu, albo masz kilka lokalizacji? Opowiedz nam o swoim biznesie, a pomożemy wybrać, bez zobowiązań.",
    },
    price: null,
    features: {
      en: [
        "A short conversation about your venue",
        "A live walkthrough of PapuPay",
        "A recommendation that fits your setup",
      ],
      pl: [
        "Krótka rozmowa o Twoim lokalu",
        "Prezentacja PapuPay na żywo",
        "Rekomendacja dopasowana do Ciebie",
      ],
    },
    cta: { label: { en: "Ask us", pl: "Zapytaj nas" }, href: "#contact" },
  },
];
