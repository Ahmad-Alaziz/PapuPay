import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Outfit } from "next/font/google";
import { PapayaMarkSymbol } from "@/components/brand/logo";
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

export const metadata: Metadata = {
  title: { default: "PapuPay · Panel", template: "%s · PapuPay" },
  applicationName: "PapuPay",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fff5e7",
  colorScheme: "light",
};

// Separate root layout: the merchant dashboard shares the landing page's design
// tokens but none of its header, footer or locale-prefixed routes. Everything
// that depends on the request (language, and later the signed-in user) renders
// inside <DashboardShell>'s Suspense boundary.
export default function DashboardRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={`${outfit.variable} ${manrope.variable}`}>
      <body className="min-h-dvh overflow-x-clip">
        <PapayaMarkSymbol />
        {children}
      </body>
    </html>
  );
}
