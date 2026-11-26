import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./venue.css";

export const metadata: Metadata = {
  title: "PapuPay · Sweeto",
  description: "Menu, karta lojalnościowa i Wi-Fi w PapuPay.",
  applicationName: "PapuPay",
  icons: {
    icon: { url: "/assets/sweeto/favicon.svg", type: "image/svg+xml" },
    apple: "/assets/papupay-app-192.png",
  },
  manifest: "/guest.webmanifest",
  robots: { index: false, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#102e24",
  colorScheme: "light",
};

// A distinct root layout intentionally excludes the marketing site's header,
// footer, Tailwind reset, and font/global styles.
export default function VenueLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
