import { Suspense } from "react";
import { AssetUpload } from "@/components/dashboard/asset-upload";
import { DashboardFrameFallback } from "@/components/dashboard/dashboard-frame";
import { Field, Panel, SelectField, pickMessage } from "@/components/dashboard/form";
import { VenueSettingsPage } from "@/components/dashboard/venue-settings-page";
import { Button } from "@/components/ui/button";
import { saveBranding } from "@/merchant/actions/venue-settings";
import { getDashboardDictionary } from "@/merchant/i18n";
import { fonts, themePresetNames, themePresets, uploadRules } from "@/merchant/venue-rules";
import { getVenueDraft, requireVenue } from "@/merchant/venues";

export default function BrandingPage(props: PageProps<"/dashboard/venues/[slug]/branding">) {
  return (
    <Suspense fallback={<DashboardFrameFallback />}>
      <Branding {...props} />
    </Suspense>
  );
}

async function Branding({ params, searchParams }: PageProps<"/dashboard/venues/[slug]/branding">) {
  const { context, venue } = await requireVenue((await params).slug);
  const [{ locale, t }, query, draft] = await Promise.all([getDashboardDictionary(), searchParams, getVenueDraft(venue.id)]);
  const copy = t.venue.branding;
  const imageTypes = uploadRules.BANNER.types.join(",");

  return (
    <VenueSettingsPage
      locale={locale}
      t={t}
      context={context}
      venue={venue}
      section="branding"
      title={copy.title}
      body={copy.body}
      notice={pickMessage(t.venue.notices, query.notice)}
      error={pickMessage(copy.errors, query.error)}
      draft={draft}
    >
      <Panel id="banner-title" title={copy.bannerTitle} description={copy.bannerBody}>
        <AssetUpload
          venueId={venue.id}
          kind="BANNER"
          current={draft.banner}
          accept={imageTypes}
          hint={t.venue.upload.imageHint}
          labels={t.venue.upload}
          title={copy.bannerTitle}
        />
      </Panel>

      <Panel id="logo-title" title={copy.logoTitle} description={copy.logoBody}>
        <AssetUpload
          venueId={venue.id}
          kind="LOGO"
          current={draft.logo}
          accept={imageTypes}
          hint={t.venue.upload.imageHint}
          labels={t.venue.upload}
          title={copy.logoTitle}
        />
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="font-semibold">{copy.logoWhiteTitle}</h3>
          <p className="mt-1 mb-4 text-sm leading-relaxed text-muted-foreground">{copy.logoWhiteBody}</p>
          <AssetUpload
            venueId={venue.id}
            kind="LOGO_WHITE"
            current={draft.logoWhite}
            accept={imageTypes}
            hint={t.venue.upload.imageHint}
            labels={t.venue.upload}
            title={copy.logoWhiteTitle}
            surface="dark"
          />
        </div>
      </Panel>

      <form action={saveBranding} className="grid gap-6">
        <input type="hidden" name="venueId" value={venue.id} />
        <Panel id="details-title" title={copy.detailsTitle}>
          <div className="grid gap-5">
            <Field id="venue-name" name="venueName" label={copy.nameLabel} defaultValue={venue.name} required minLength={2} maxLength={80} />
            <Field id="venue-address" name="address" label={copy.addressLabel} hint={copy.addressHint} defaultValue={draft.address} maxLength={160} autoComplete="street-address" />
            <Field id="venue-map" name="mapUrl" type="url" label={copy.mapLabel} hint={copy.mapHint} defaultValue={draft.mapUrl} placeholder="https://maps.app.goo.gl/…" />
          </div>
        </Panel>

        <Panel id="theme-title" title={copy.themeTitle} description={copy.themeBody}>
          <fieldset>
            <legend className="text-sm font-semibold">{copy.themeLabel}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {themePresetNames.map((preset) => {
                const colours = themePresets[preset];
                return (
                  <label
                    key={preset}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white/60 p-4 has-[:checked]:border-leaf has-[:checked]:ring-3 has-[:checked]:ring-leaf/15 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-leaf"
                  >
                    <input type="radio" name="themePreset" value={preset} defaultChecked={draft.themePreset === preset} className="sr-only" />
                    <span aria-hidden="true" className="flex -space-x-1.5">
                      {[colours.background, colours.surface, colours.accent, colours.ink].map((colour) => (
                        <span key={colour} className="size-6 rounded-full border-2 border-white shadow-sm" style={{ background: colour }} />
                      ))}
                    </span>
                    <span className="text-sm font-semibold">{copy.presets[preset]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <SelectField
            id="venue-font"
            name="font"
            label={copy.fontLabel}
            defaultValue={draft.font ?? ""}
            className="mt-6 max-w-sm"
            options={[{ value: "", label: copy.fontDefault }, ...fonts.map((font) => ({ value: font, label: copy.fonts[font] }))]}
          />
        </Panel>

        <div>
          <Button type="submit" size="lg">
            {t.venue.save}
          </Button>
        </div>
      </form>
    </VenueSettingsPage>
  );
}
