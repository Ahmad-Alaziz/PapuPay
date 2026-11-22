import Image from "next/image";

export const sweetoScreens = ["menu", "card", "reviews", "wifi"] as const;
type Screen = "home" | (typeof sweetoScreens)[number];

const headings: Record<Screen, string> = {
  home: "Sweeto",
  menu: "Menu Sweeto",
  card: "Karta lojalnościowa Sweeto",
  reviews: "Opinie o Sweeto",
  wifi: "Wi-Fi w Sweeto",
};

const descriptions: Partial<Record<Screen, string>> = {
  home: "Menu i opinie znajdziesz poniżej. Kartę lojalnościową i ustawienia Wi-Fi otworzysz w PapuPay na iPhonie.",
  card: "Otwórz PapuPay na iPhonie, aby wyświetlić kartę lojalnościową.",
  wifi: "Otwórz PapuPay na iPhonie, aby połączyć się z siecią Wi-Fi w lokalu.",
};

export function SweetoGuestPage({ screen }: { screen: Screen }) {
  const description = descriptions[screen];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-12">
      <Image src="/assets/sweeto/logo-blue.png" alt="" width={398} height={63} className="h-auto w-40" unoptimized />
      <h1 className="text-4xl font-extrabold">{headings[screen]}</h1>
      {description && <p className="text-lg text-muted-foreground">{description}</p>}
      <div className="flex flex-wrap gap-3">
        <a
          className="rounded-full bg-leaf px-5 py-3 font-semibold text-cream hover:bg-leaf-soft"
          href="/assets/sweeto/menu.pdf"
        >
          Zobacz menu (PDF)
        </a>
        <a
          className="rounded-full border border-leaf px-5 py-3 font-semibold hover:bg-peach"
          href="https://search.google.com/local/writereview?placeid=ChIJZSkE8-IzGUcRewjXh2vCRK8"
        >
          Zostaw opinię w Google
        </a>
      </div>
    </main>
  );
}
