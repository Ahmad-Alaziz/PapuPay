import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Manrope, Outfit } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import { PapayaMarkSymbol } from "@/components/brand/logo";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { hasLocale, locales, ogLocales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { siteConfig } from "@/lib/site";
import "../globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#fff5e7",
  colorScheme: "light",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { meta } = getDictionary(lang);

  return {
    metadataBase: new URL(siteConfig.url),
    title: meta.title,
    description: meta.description,
    applicationName: siteConfig.name,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        ...Object.fromEntries(locales.map((locale) => [locale, `/${locale}`])),
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      url: `/${lang}`,
      title: meta.title,
      description: meta.description,
      locale: ogLocales[lang],
      alternateLocale: locales.filter((locale) => locale !== lang).map((locale) => ogLocales[locale]),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html lang={lang} className={`${outfit.variable} ${manrope.variable}`}>
      <body className="min-h-dvh overflow-x-clip">
        <PapayaMarkSymbol />
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-leaf px-5 py-3 font-semibold text-cream focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          {dict.nav.skip}
        </a>
        <MotionProvider>
          <SiteHeader locale={lang} nav={dict.nav} />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <SiteFooter locale={lang} nav={dict.nav} footer={dict.footer} />
        </MotionProvider>
      </body>
    </html>
  );
}
