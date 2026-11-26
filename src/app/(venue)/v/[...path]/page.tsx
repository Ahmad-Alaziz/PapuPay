import { notFound } from "next/navigation";
import VenueEntry from "@/components/venue/venue-entry";
import VenueBootstrap, {
  venueScreens,
  type VenueScreen,
} from "@/components/venue/venue-bootstrap";

const slug = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export function generateStaticParams() {
  return venueScreens.map((screen) => ({
    path: screen === "home" ? ["sweeto"] : ["sweeto", screen],
  }));
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const [venue, destination = "home"] = path;
  if (
    path.length > 2 ||
    !venue ||
    !slug.test(venue) ||
    !venueScreens.includes(destination as VenueScreen)
  )
    notFound();
  if (path.length === 2 && destination === "home") notFound();
  return (
    <VenueEntry>
      <VenueBootstrap screen={destination as VenueScreen} venue={venue} />
    </VenueEntry>
  );
}
