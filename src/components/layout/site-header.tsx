"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { MenuIcon, XIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { sectionIds } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  locale: Locale;
  nav: Dictionary["nav"];
};

export function SiteHeader({ locale, nav }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: `#${sectionIds.features}`, label: nav.links.features },
    { href: `#${sectionIds.how}`, label: nav.links.how },
    { href: `#${sectionIds.benefits}`, label: nav.links.benefits },
    { href: `#${sectionIds.pricing}`, label: nav.links.pricing },
    { href: `#${sectionIds.faq}`, label: nav.links.faq },
  ];

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border py-2 pr-2 pl-4 transition-[background-color,box-shadow,border-color] duration-300 sm:pl-5",
          scrolled || open
            ? "border-border bg-cream/90 shadow-[0_10px_30px_-18px_rgb(23_61_43/0.45)] backdrop-blur-md"
            : "border-transparent bg-transparent",
        )}
      >
        <Link
          href={`/${locale}`}
          aria-label={nav.home}
          className="rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-leaf"
        >
          <Logo />
        </Link>

        <nav aria-label={nav.main} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-leaf/80 transition-colors outline-none hover:bg-leaf/[0.06] hover:text-leaf focus-visible:outline-3 focus-visible:outline-leaf"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={nav.language} className="hidden sm:flex" />
          <Button asChild size="lg" className="hidden md:inline-flex">
            <a href={`#${sectionIds.contact}`}>{nav.contact}</a>
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? nav.closeMenu : nav.openMenu}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <m.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-2 max-w-6xl rounded-3xl border bg-cream p-3 shadow-xl lg:hidden"
          >
            <nav aria-label={nav.main}>
              <ul className="flex flex-col">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-2xl px-4 py-3 font-heading text-lg font-semibold text-leaf outline-none hover:bg-peach focus-visible:outline-3 focus-visible:outline-leaf"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-2 flex items-center justify-between gap-3 border-t px-1 pt-3">
              <LanguageSwitcher locale={locale} label={nav.language} />
              <Button asChild size="lg">
                <a href={`#${sectionIds.contact}`} onClick={() => setOpen(false)}>
                  {nav.contact}
                </a>
              </Button>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
