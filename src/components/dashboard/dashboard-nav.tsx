import Link from "next/link";
import {
  BookOpen,
  LayoutDashboard,
  Palette,
  Rocket,
  Stamp,
  Star,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { DashboardDictionary } from "@/merchant/i18n";
import { cn } from "@/lib/utils";

type Section = keyof DashboardDictionary["nav"];

const sections: { key: Section; icon: LucideIcon; href?: string }[] = [
  { key: "overview", icon: LayoutDashboard, href: "/dashboard" },
  { key: "branding", icon: Palette },
  { key: "wifi", icon: Wifi },
  { key: "reviews", icon: Star },
  { key: "menu", icon: BookOpen },
  { key: "loyalty", icon: Stamp },
  { key: "team", icon: Users },
  { key: "publish", icon: Rocket },
];

/**
 * Sections without an href aren't built yet and render as disabled items.
 * Vertical list on large screens, a horizontal scroller on phones.
 */
export function DashboardNav({
  nav,
  label,
  soon,
  current,
}: {
  nav: DashboardDictionary["nav"];
  label: string;
  soon: string;
  current: Section;
}) {
  return (
    <nav aria-label={label}>
      <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {sections.map(({ key, icon: Icon, href }) => {
          const active = key === current;
          const itemClass =
            "flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap lg:whitespace-normal";
          return (
            <li key={key}>
              {href ? (
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
                  {nav[key]}
                </Link>
              ) : (
                <span aria-disabled="true" className={cn(itemClass, "text-leaf/45")}>
                  <Icon aria-hidden="true" className="size-4.5 shrink-0" />
                  {nav[key]}
                  <span className="ml-auto shrink-0 rounded-full bg-leaf/[0.06] px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-leaf/55 uppercase">
                    {soon}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
