import { launchBrand } from "./launch-brand-data";

export const venueScreens = [
  "home",
  "menu",
  "card",
  "reviews",
  "wifi",
  "wallet",
  "test",
  "restore",
  "staff",
] as const;
export type VenueScreen = (typeof venueScreens)[number];

const headings: Record<VenueScreen, string> = {
  home: "Sweeto",
  menu: "Menu Sweeto",
  card: "Karta lojalnościowa Sweeto",
  reviews: "Opinie o Sweeto",
  wifi: "Wi-Fi w Sweeto",
  wallet: "Portfel · Sweeto",
  test: "Test karty Sweeto",
  restore: "Odzyskaj kartę Sweeto",
  staff: "Panel obsługi · PapuPay",
};

export default function VenueBootstrap({
  screen,
  venue = "sweeto",
}: {
  screen: VenueScreen;
  venue?: string;
}) {
  const sweeto = venue === "sweeto" || venue === "maka-maslo";
  const home = screen === "home";
  return (
    <main
      className="venue-bootstrap"
      data-sweeto={sweeto && !home && screen !== "staff" ? "true" : undefined}
      data-home={home ? "true" : undefined}
    >
      {home && (
        <div className="venue-bootstrap-lockup" role="img" aria-label="PapuPay">
          <img src={launchBrand.mark} width={38} height={40} alt="" />
          <img src={launchBrand.wordmark} width={132} height={27} alt="" />
        </div>
      )}
      <div className="venue-bootstrap-content">
        {!home &&
          (sweeto && screen !== "staff" ? (
            <img
              className="venue-bootstrap-brand"
              src="/assets/sweeto/logo-white.png"
              alt=""
              width={398}
              height={63}
            />
          ) : (
            <img
              className="venue-bootstrap-papu"
              src="/assets/papupay-wordmark.svg"
              alt=""
              width={110}
              height={28}
            />
          ))}
        <h1>{sweeto || screen === "staff" ? headings[screen] : "PapuPay"}</h1>
        {sweeto && screen === "home" && (
          <p>Menu deserów, karta lojalnościowa i Wi-Fi przy ladzie.</p>
        )}
        {sweeto && screen === "menu" && (
          <p>Wybierz desery i zamów przy ladzie.</p>
        )}
        {sweeto && screen !== "staff" && (
          <div className="venue-bootstrap-links">
            <a href="/assets/sweeto/menu.pdf">Zobacz menu (PDF)</a>
            <a href="https://search.google.com/local/writereview?placeid=ChIJZSkE8-IzGUcRewjXh2vCRK8">
              Oceń w Google
            </a>
          </div>
        )}
        <noscript>
          <p>
            Włącz JavaScript, aby korzystać z karty lojalnościowej, listy
            deserów i pozostałych funkcji PapuPay.
          </p>
        </noscript>
      </div>
    </main>
  );
}
