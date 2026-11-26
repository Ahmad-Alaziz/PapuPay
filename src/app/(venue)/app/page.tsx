import type { Metadata } from "next";
import VenueEntry from "@/components/venue/venue-entry";
import VenueBootstrap from "@/components/venue/venue-bootstrap";

export const metadata: Metadata = {
  itunes: { appId: "6826778125", appArgument: "https://papupay.com/app" },
};

export default function FullAppPage() {
  return (
    <VenueEntry>
      <VenueBootstrap screen="home" />
    </VenueEntry>
  );
}
