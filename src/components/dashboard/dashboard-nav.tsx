import Link from "next/link";
import {
  BookOpen,
  LayoutDashboard,
  Palette,
  Rocket,
  ShieldCheck,
  Stamp,
  Star,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { DashboardDictionary } from "@/merchant/i18n";
import { cn } from "@/lib/utils";

export type DashboardSection = keyof DashboardDictionary["nav"] | "admin";

// `venue` sections live under /dashboard/venues/<slug>/<key>.
const sections: { key: keyof DashboardDictionary["nav"]; icon: LucideIcon; href?: string; venue?: boolean; settings?: boolean }[] = [
  { key: "overview", icon: LayoutDashboard, href: "/dashboard" },
  { key: "branding", icon: Palette, venue: true, settings: true },
  { key: "wifi", icon: Wifi, venue: true, settings: true },
  { key: "reviews", icon: Star, venue: true, settings: true },
  { key: "menu", icon: BookOpen, venue: true, settings: true },
  { key: "loyalty", icon: Stamp, settings: true },
  { key: "team", icon: Users, href: "/dashboard/team", settings: true },
  { key: "publish", icon: Rocket, settings: true },
];

const itemClass =
  "flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap lg:whitespace-normal";

function NavLink({ href, active, icon: Icon, children }: { href: string; active: boolean; icon: LucideIcon; children: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        itemClass,
        "transition-colors outline-none focus-visible:outline-3 focus-visible:outline-leaf",
        active ? "bg-leaf text-cream" : "text-leaf hover:bg-leaf/[0.07]",
      )}
    >
      <Icon aria-hidden="true" className="size-4.5 shrink-0" />
      {children}
    </Link>
  );
}

/**
 * Sections without an href aren't built yet and render as disabled items.
 * Settings sections are hidden from roles that can't edit them.
 * Vertical list on large screens, a horizontal scroller on phones.
 */
export function DashboardNav({
  t,
  current,
  showSettings,
  showAdmin,
  venueSlug,
}: {
  t: DashboardDictionary;
  current: DashboardSection;
  showSettings: boolean;
  showAdmin: boolean;
  /** The venue the settings links open; without one they render as unavailable. */
  venueSlug?: string;
}) {
  return (
    <nav aria-label={t.shell.navLabel}>
      <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {sections
          .filter((section) => showSettings || !section.settings)
          .map(({ key, icon: Icon, href: fixed, venue }) => {
            const href = venue && venueSlug ? `/dashboard/venues/${venueSlug}/${key}` : fixed;
            return (
            <li key={key}>
              {href ? (
                <NavLink href={href} active={key === current} icon={Icon}>
                  {t.nav[key]}
                </NavLink>
              ) : (
                <span aria-disabled="true" className={cn(itemClass, "text-leaf/45")}>
                  <Icon aria-hidden="true" className="size-4.5 shrink-0" />
                  {t.nav[key]}
                  <span className="ml-auto shrink-0 rounded-full bg-leaf/[0.06] px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-leaf/55 uppercase">
                    {t.shell.soon}
                  </span>
                </span>
              )}
            </li>
            );
          })}
        {showAdmin ? (
          <li className="lg:mt-4 lg:border-t lg:border-border lg:pt-4">
            <NavLink href="/dashboard/admin" active={current === "admin"} icon={ShieldCheck}>
              {t.shell.admin}
            </NavLink>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
