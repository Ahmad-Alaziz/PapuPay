import { Suspense } from "react";
import QRCode from "qrcode";
import { DashboardFrameFallback } from "@/components/dashboard/dashboard-frame";
import { Field, Panel, SelectField, pickMessage } from "@/components/dashboard/form";
import { VenueSettingsPage } from "@/components/dashboard/venue-settings-page";
import { Button } from "@/components/ui/button";
import { saveWifi } from "@/merchant/actions/venue-settings";
import { getDashboardDictionary } from "@/merchant/i18n";
import { wifiQrPayload } from "@/merchant/venue-rules";
import { getVenueDraft, getWifiPassword, requireVenue } from "@/merchant/venues";

export default function WifiPage(props: PageProps<"/dashboard/venues/[slug]/wifi">) {
  return (
    <Suspense fallback={<DashboardFrameFallback />}>
      <WifiSettings {...props} />
    </Suspense>
  );
}

async function WifiSettings({ params, searchParams }: PageProps<"/dashboard/venues/[slug]/wifi">) {
  const { context, venue } = await requireVenue((await params).slug);
  const [{ locale, t }, query, draft] = await Promise.all([getDashboardDictionary(), searchParams, getVenueDraft(venue.id)]);
  const copy = t.venue.wifi;
  const wifi = draft.wifi;

  // The test code needs the real password, so it's only built for people who can edit the venue.
  const testCode = wifi
    ? await QRCode.toString(
        wifiQrPayload(wifi.ssid, wifi.security, wifi.security === "NOPASS" ? "" : await getWifiPassword(venue.id), wifi.hidden),
        { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#173d2b", light: "#ffffff" } },
      )
    : null;

  return (
    <VenueSettingsPage
      locale={locale}
      t={t}
      context={context}
      venue={venue}
      section="wifi"
      title={copy.title}
      body={copy.body}
      notice={pickMessage(t.venue.notices, query.notice)}
      error={pickMessage(copy.errors, query.error)}
      draft={draft}
    >
      <Panel id="network-title" title={copy.formTitle}>
        <form action={saveWifi} className="grid gap-5">
          <input type="hidden" name="venueId" value={venue.id} />
          <Field id="wifi-ssid" name="ssid" label={copy.ssidLabel} hint={copy.ssidHint} defaultValue={wifi?.ssid} required maxLength={32} autoComplete="off" spellCheck={false} />
          <SelectField
            id="wifi-security"
            name="security"
            label={copy.securityLabel}
            defaultValue={wifi?.security ?? "WPA"}
            options={(["WPA", "WEP", "NOPASS"] as const).map((value) => ({ value, label: copy.security[value] }))}
          />
          <Field
            id="wifi-password"
            name="password"
            type="password"
            label={copy.passwordLabel}
            hint={wifi?.hasPassword ? copy.passwordKeep : copy.passwordHint}
            autoComplete="new-password"
            maxLength={64}
          />
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input type="checkbox" name="hidden" defaultChecked={wifi?.hidden} className="mt-0.5 size-4 accent-leaf" />
            {copy.hiddenLabel}
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg">
              {t.venue.save}
            </Button>
            {wifi ? (
              <Button type="submit" name="intent" value="clear" variant="outline" size="lg" formNoValidate>
                {copy.clear}
              </Button>
            ) : null}
          </div>
        </form>
      </Panel>

      {testCode ? (
        <Panel id="wifi-test-title" title={copy.testTitle} description={copy.testBody}>
          <details className="group">
            <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-leaf/25 px-4 py-2 text-sm font-semibold outline-none hover:border-leaf focus-visible:outline-3 focus-visible:outline-leaf group-open:mb-5">
              {copy.testShow}
            </summary>
            <div
              role="img"
              aria-label={copy.testTitle}
              className="w-56 rounded-2xl border border-border bg-white p-3 [&_svg]:size-full"
              // Generated on the server by the qrcode library from the saved network.
              dangerouslySetInnerHTML={{ __html: testCode }}
            />
          </details>
        </Panel>
      ) : null}
    </VenueSettingsPage>
  );
}
