import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Logo, PapayaMarkSymbol } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/section";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import papaya from "@/assets/papaya-illustration.png";
import { manrope, outfit } from "./fonts";
import "./globals.css";

// Unknown URLs carry no locale, so this page uses the default one. The link home
// goes through `/`, which redirects to the visitor's language (see vercel.json).
const { notFound } = getDictionary(defaultLocale);

export const metadata: Metadata = {
  title: notFound.title,
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale} className={`${outfit.variable} ${manrope.variable}`}>
      <body className="min-h-dvh overflow-x-clip">
        <PapayaMarkSymbol />
        <main>
          <Container className="flex flex-col items-center py-24 text-center sm:py-32">
            {/* `/` is a Vercel redirect, not a Next.js route, so this needs a full page load. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" aria-label="PapuPay">
              <Logo />
            </a>
            <Image src={papaya} alt="" className="mt-16 h-auto w-36 -rotate-12" sizes="9rem" />
            <p className="mt-8 font-heading text-7xl font-extrabold text-papaya-ink">404</p>
            <h1 className="mt-4 max-w-lg text-3xl font-bold sm:text-4xl">{notFound.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{notFound.body}</p>
            <Button asChild size="xl" className="mt-10">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/">
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                {notFound.cta}
              </a>
            </Button>
          </Container>
        </main>
      </body>
    </html>
  );
}
