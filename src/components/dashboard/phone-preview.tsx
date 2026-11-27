import { BookOpen, Stamp, Star, Wifi, type LucideIcon } from "lucide-react";
import type { DashboardDictionary } from "@/merchant/i18n";
import { draftChecklist, type VenueDraft } from "@/merchant/venues";
import { themePresets } from "@/merchant/venue-rules";

const fontStacks: Record<string, string> = {
  bricolage: "var(--font-outfit), system-ui, sans-serif",
  "dm-sans": "system-ui, sans-serif",
  manrope: "var(--font-manrope), system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  system: "system-ui, -apple-system, sans-serif",
};

/**
 * A rough sketch of the guest home screen from the draft, using the theme's
 * colours. It helps merchants see their changes; it isn't the real app.
 */
export function PhonePreview({
  name,
  draft,
  t,
}: {
  name: string;
  draft: VenueDraft;
  t: DashboardDictionary["venue"];
}) {
  const theme = themePresets[draft.themePreset];
  const ready = draftChecklist(draft);
  const actions: { key: keyof typeof t.preview; icon: LucideIcon; on: boolean }[] = [
    { key: "menu", icon: BookOpen, on: ready.menu },
    { key: "loyalty", icon: Stamp, on: true },
    { key: "reviews", icon: Star, on: ready.reviews },
    { key: "wifi", icon: Wifi, on: ready.wifi },
  ];

  return (
    <figure className="mx-auto w-full max-w-[18rem]">
      <div className="rounded-[2.6rem] bg-leaf p-2.5 shadow-[0_30px_60px_-30px_rgb(23_61_43/0.6)]">
        <div
          className="overflow-hidden rounded-[2.1rem]"
          style={{ background: theme.background, color: theme.ink, fontFamily: fontStacks[draft.font ?? theme.font] }}
          aria-hidden="true"
        >
          <div className="relative grid aspect-[4/3] place-items-center" style={{ background: theme.surface }}>
            {draft.banner ? (
              // eslint-disable-next-line @next/next/no-img-element -- user upload from Storage
              <img src={draft.banner.url} alt="" className="size-full object-contain" />
            ) : (
              <span className="text-xs font-semibold opacity-60">{t.preview.noBanner}</span>
            )}
            {draft.banner && draft.logoWhite ? (
              // eslint-disable-next-line @next/next/no-img-element -- user upload from Storage
              <img src={draft.logoWhite.url} alt="" className="absolute top-3 left-3 h-7 max-w-[60%] object-contain" />
            ) : null}
          </div>
          <div className="px-4 pt-4 pb-5">
            {draft.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- user upload from Storage
              <img src={draft.logo.url} alt="" className="mb-2 h-8 max-w-[70%] object-contain object-left" />
            ) : null}
            <p className="text-lg leading-tight font-bold">{name}</p>
            {draft.address ? (
              <p className="mt-0.5 text-xs" style={{ color: theme.muted }}>
                {draft.address}
              </p>
            ) : null}
            <ul className="mt-4 grid gap-2">
              {actions.map(({ key, icon: Icon, on }) => (
                <li
                  key={key}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold"
                  style={
                    on
                      ? { background: theme.surface, color: theme.ink }
                      : { border: `1px dashed ${theme.muted}`, color: theme.muted, opacity: 0.55 }
                  }
                >
                  <Icon className="size-3.5" style={{ color: on ? theme.accent : undefined }} />
                  {t.preview[key]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-leaf">{t.previewTitle}.</span> {t.previewNote}
      </figcaption>
    </figure>
  );
}
