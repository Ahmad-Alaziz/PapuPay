import { lazy, Suspense, useState } from "react";
import { ArrowUpRight, QrCode, MapPin, ArrowLeft } from "lucide-react";
import { resolveRoute, qrPath } from "./routing";
import "./entry.css";
const OrderingApp = lazy(() => import("./App"));
function Wordmark() {
  return (
    <a className="entry-brand" href="/" aria-label="PapuPay home">
      <img src="/assets/papaya-3d.webp" alt="" />
      <span>
        Papu<span>Pay</span>
      </span>
    </a>
  );
}
export default function Entry() {
  const route = resolveRoute(new URL(location.href));
  const [en, setEn] = useState(false);
  const t = (pl: string, english: string) => (en ? english : pl);
  if (route.kind === "order")
    return (
      <Suspense
        fallback={
          <main className="entry-loading" aria-live="polite">
            Pora na papu…
          </main>
        }
      >
        <OrderingApp context={route.context} />
      </Suspense>
    );
  const landing = route.kind === "landing";
  return (
    <div className="entry-page" lang={en ? "en" : "pl"}>
      <header className="entry-header">
        <Wordmark />
        <div className="entry-header-actions">
          <button
            onClick={() => setEn(!en)}
            aria-label={en ? "Zmień na polski" : "Switch to English"}
          >
            {en ? "EN" : "PL"}
          </button>
          {landing && (
            <a href="/app">
              {t("Zajrzyj do demo", "Explore the demo")}
              <ArrowUpRight size={17} />
            </a>
          )}
        </div>
      </header>
      {landing ? (
        <main className="coming-soon">
          <div className="coming-copy">
            <span className="coming-label">
              <i /> COMING SOON
            </span>
            <h1>
              {t("Pora na", "Good food.")}
              <br />
              <span>{t("coś dobrego.", "Great company.")}</span>
            </h1>
            <p>
              {t(
                "Jeden skan. Smaki całej hali. Więcej czasu dla siebie i ludzi przy Twoim stoliku.",
                "One scan. A whole food hall. More time for you and the people around your table.",
              )}
            </p>
            <div className="coming-note">
              <QrCode size={23} />
              <span>
                {t("Mały skan. Wielkie mniam.", "Little scan. Big yum.")}
              </span>
            </div>
          </div>
          <div className="coming-art" aria-hidden="true">
            <div className="papaya-orbit" />
            <span className="coming-spark one">✳</span>
            <img src="/assets/papaya-3d.webp" alt="" />
            <span className="coming-spark two">✦</span>
            <div className="coming-sticker">
              {t("dobrze być", "better")}
              <br />
              <b>{t("razem.", "together.")}</b>
            </div>
          </div>
        </main>
      ) : (
        <main className="entry-context">
          <a className="entry-back" href="/">
            <ArrowLeft size={17} />
            {t("Strona główna", "Home")}
          </a>
          <span className="coming-label">
            <QrCode size={18} />
            {route.kind === "invalid"
              ? t("SPRAWDŹ KOD QR", "CHECK YOUR QR")
              : t("ZACZNIJ OD STOLIKA", "START AT YOUR TABLE")}
          </span>
          <h1>
            {route.kind === "invalid"
              ? t(
                  "Ten link nie prowadzi do stolika.",
                  "This link doesn’t lead to a table.",
                )
              : t("Twoje miejsce. Twoje smaki.", "Your table. Your cravings.")}
          </h1>
          <p>
            {route.kind === "invalid"
              ? t(
                  "Zeskanuj ponownie kod na swoim stoliku albo poproś obsługę o pomoc. Nie chcemy pomylić Twojego miejsca.",
                  "Scan the code on your table again, or ask a member of staff. We don’t want to send you to the wrong place.",
                )
              : t(
                  "W hali zeskanuj kod QR na stoliku. Ustawimy właściwe miejsce za Ciebie. A na razie? Rozgość się w naszym demo.",
                  "At the food hall, scan your table’s QR. We’ll open the right place for you. Until then, make yourself at home in our demo.",
                )}
          </p>
          <a className="entry-hall" href={qrPath("24")}>
            <img src="/assets/hall.jpg" alt="Hala Koszyki" />
            <div>
              <span className="entry-demo">
                {t("WERSJA DEMO", "DEMO EXPERIENCE")}
              </span>
              <h2>Hala Koszyki</h2>
              <p>
                <MapPin size={15} />
                Warszawa · {t("stolik", "table")} 24
              </p>
              <span className="entry-hall-action">
                {t("Wypróbuj demo", "Try the demo")}
                <ArrowUpRight size={19} />
              </span>
            </div>
          </a>
          <small>
            {t(
              "Niezależny koncept. Zamówienia i płatności są symulowane.",
              "Independent concept. Orders and payments are simulated.",
            )}
          </small>
        </main>
      )}
      <footer className="entry-footer">
        <span>© 2026 PapuPay</span>
        <span>
          {t("Dobre jedzenie łączy.", "Good food brings us together.")}
        </span>
      </footer>
    </div>
  );
}
