import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";

export const metadata: Metadata = {
  title: "Sweeto | PapuPay",
  robots: { index: false, follow: true },
};

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className="[--font-manrope:system-ui] [--font-outfit:system-ui]">
      <body>{children}</body>
    </html>
  );
}
