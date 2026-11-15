import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/section";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CurrentYear } from "@/components/layout/current-year";
import { sectionIds } from "@/lib/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  locale: Locale;
  nav: Dictionary["nav"];
  footer: Dictionary["footer"];
};

export function SiteFooter({ locale, nav, footer }: Props) {
  const links = [
    { href: `#${sectionIds.features}`, label: nav.links.features },
    { href: `#${sectionIds.how}`, label: nav.links.how },
    { href: `#${sectionIds.benefits}`, label: nav.links.benefits },
    { href: `#${sectionIds.pricing}`, label: nav.links.pricing },
    { href: `#${sectionIds.faq}`, label: nav.links.faq },
    { href: `#${sectionIds.contact}`, label: nav.contact },
  ];

  return (
    <footer className="pt-6 pb-10">
      <Container>
        <div className="flex flex-col gap-8 border-t pt-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{footer.tagline}</p>
          </div>
          <nav aria-label={nav.footer}>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="rounded text-leaf/80 underline-offset-4 outline-none hover:text-leaf hover:underline focus-visible:outline-3 focus-visible:outline-leaf"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col-reverse gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CurrentYear /> PapuPay. {footer.rights}
          </p>
          <LanguageSwitcher locale={locale} label={nav.language} className="self-start" />
        </div>
      </Container>
    </footer>
  );
}
