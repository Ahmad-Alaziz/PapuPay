import type { Dictionary } from "./en";

/**
 * Polish copy for the PapuPay landing page.
 * Must match the shape of `en.ts` (enforced by the `Dictionary` type).
 */
export const pl: Dictionary = {
  meta: {
    title: "PapuPay: cyfrowe menu, opinie Google i karty lojalnościowe dla restauracji, barów i kawiarni",
    description:
      "Jedna naklejka na stoliku, jeden panel. Z PapuPay goście otwierają Twoje cyfrowe menu, w kilka sekund wystawiają opinię w Google i zbierają pieczątki lojalnościowe jednym dotknięciem lub skanem.",
    ogAlt: "PapuPay: menu, opinie i stali goście jednym dotknięciem.",
  },

  nav: {
    skip: "Przejdź do treści",
    home: "PapuPay, strona główna",
    main: "Nawigacja główna",
    footer: "Stopka",
    links: {
      features: "Funkcje",
      how: "Jak to działa",
      benefits: "Korzyści",
      pricing: "Cennik",
      faq: "FAQ",
    },
    contact: "Kontakt",
    openMenu: "Otwórz menu",
    closeMenu: "Zamknij menu",
    language: "Język",
  },

  hero: {
    eyebrow: "Dla restauracji, barów i kawiarni",
    title: ["Menu.", "Opinie.", "Stali goście."],
    subtitle:
      "PapuPay to jedna naklejka na Twoich stolikach i jeden panel za nią. Goście otwierają cyfrowe menu, w kilka sekund wystawiają opinię w Google i zbierają pieczątki lojalnościowe, a wszystko jednym dotknięciem lub skanem.",
    primaryCta: "Zobacz demo",
    secondaryCta: "Skontaktuj się",
    highlights: ["Cyfrowe menu z panelem", "Link do opinii Google", "Karty lojalnościowe"],
  },

  mockup: {
    label:
      "Podgląd strony lokalu w PapuPay: przyciski do menu, opinii w Google i karta lojalnościowa z siedmioma z dziesięciu pieczątek.",
    venue: "Café Papaya",
    greeting: "Miło Cię znowu widzieć!",
    menu: "Zobacz menu",
    menuSub: "Śniadania, kawa i napoje",
    review: "Wystaw opinię",
    reviewSub: "Google otwiera się od razu",
    loyalty: "Twoja karta",
    loyaltySub: "7 z 10 pieczątek",
    notificationTitle: "Pieczątka dodana!",
    notificationBody: "Jeszcze 3 do darmowej kawy.",
    sticker: "Dotknij lub zeskanuj",
    tagline: "Dotknij. Zeskanuj. Wracaj.",
  },

  problem: {
    eyebrow: "Problem",
    title: "Papierowe menu, brak opinii, zapomniane karty z pieczątkami.",
    intro:
      "Większość lokali żongluje drukowanym menu, kartką z prośbą o opinię, której nikt nie używa, i kartą lojalnościową, która leży w szufladzie. Każde z nich zabiera czas, a żadne nie mówi, kim są Twoi stali goście.",
    guests: {
      title: "Z czym mierzą się goście",
      items: [
        "Menu nieaktualne, lepiące się albo bez dzisiejszych dań.",
        "Papierowe karty zostawione w domu, więc pieczątki się nie sumują.",
        "Brak prostej chwili, by podziękować opinią po udanej wizycie.",
        "Inna karta, aplikacja albo formularz w każdym ulubionym miejscu.",
      ],
    },
    owners: {
      title: "Co tracą właściciele",
      items: [
        "Pieniądze i czas na dodruk menu przy każdej zmianie ceny lub dania.",
        "Opinie zadowolonych gości, którzy wystawiliby je, gdyby zajęło to sekundę.",
        "Stałych gości, których nie rozpoznajesz i nie nagradzasz, bo wszystko jest na papierze.",
        "Godziny spędzone na osobnych narzędziach do menu, opinii i lojalności.",
      ],
    },
  },

  features: {
    eyebrow: "Funkcje",
    title: "Trzy narzędzia. Jedno dotknięcie.",
    intro: "Zacznij od tego, czego potrzebujesz dziś, a resztę włącz, kiedy będziesz gotowy. Wszystko działa z tej samej naklejki i tego samego panelu.",
    earlyAccess: "Wczesny dostęp",
    menu: {
      tag: "Cyfrowe menu",
      title: "Menu, które zmienisz w kilka sekund.",
      body: "Edytuj dania, ceny i zdjęcia w panelu, a każdy stolik od razu widzi zmianę. Bez dodruku i bez skreślonych cen.",
      points: [
        "Prosty panel dla całego zespołu",
        "Zmiany od razu widoczne na każdym stoliku",
        "Naklejki z kodem QR na stoliki w zestawie",
      ],
      mock: {
        window: "Edytor menu",
        section: "Kawa",
        items: [
          { name: "Flat white", price: "14,00" },
          { name: "Cappuccino", price: "13,00" },
          { name: "Iced latte", price: "16,00" },
        ],
        editing: "15,00",
        saved: "Zapisano. Widoczne na wszystkich stolikach",
        phoneTitle: "Kawa",
        currency: "zł",
      },
    },
    reviews: {
      tag: "Opinie Google",
      title: "Więcej opinii w Google, bez niezręcznego proszenia.",
      body: "Jedno dotknięcie przenosi zadowolonych gości prosto do formularza opinii w Google. Bez szukania lokalu i bez dodatkowych kartek na stoliku.",
      points: [
        "Otwiera bezpośrednio formularz opinii Google",
        "Działa z tej samej naklejki na stoliku",
        "Adres docelowy zmienisz w każdej chwili",
      ],
      mock: {
        question: "Jak minęła wizyta?",
        button: "Oceń nas w Google",
        thanks: "Dziękujemy!",
        ratingLabel: "Ocena 5 na 5",
      },
    },
    loyalty: {
      tag: "Karty lojalnościowe",
      title: "Karta lojalnościowa, której nikt nie zostawi w domu.",
      body: "Goście dotykają tagu NFC przy ladzie, PapuPay otwiera się od razu jako App Clip, a pieczątka trafia na ich kartę. Karty ze wszystkich lokali PapuPay są w jednym miejscu.",
      points: [
        "Dotknij tagu NFC, by zebrać pieczątkę",
        "Wszystkie karty lojalnościowe w jednym miejscu",
        "Ty decydujesz o nagrodach",
      ],
      mock: {
        title: "Moje karty",
        cards: [
          { venue: "Café Papaya", stamps: 7, total: 10, reward: "Darmowa kawa" },
          { venue: "Lime Bar", stamps: 3, total: 8, reward: "Darmowy koktajl" },
          { venue: "Pizzeria Verde", stamps: 5, total: 6, reward: "Darmowy deser" },
        ],
        tap: "Dotknij, by zebrać",
        stamps: "pieczątek",
      },
    },
  },

  how: {
    eyebrow: "Jak to działa",
    title: "Gotowe w czterech krokach.",
    intro: "Bez okablowania i bez konfiguracji po stronie gości.",
    steps: [
      {
        title: "Skonfiguruj lokal",
        body: "Dodaj menu, link do opinii Google i nagrody w panelu.",
      },
      {
        title: "Przyklej naklejki",
        body: "Naklejki QR na stoliki, a tag NFC przy ladzie.",
      },
      {
        title: "Goście dotykają lub skanują",
        body: "Jedno dotknięcie lub skan otwiera menu, opinię w kilka sekund albo kartę lojalnościową.",
      },
      {
        title: "Stali goście wracają",
        body: "Pieczątki rosną z każdą wizytą, aż odblokuje się nagroda, a goście mają powód, by wrócić.",
      },
    ],
  },

  benefits: {
    eyebrow: "Korzyści",
    title: ["Więcej stałych gości.", "Więcej opinii.", "Mniej zachodu."],
    intro: "Co się zmienia, gdy menu, opinie i lojalność są pod jednym dotknięciem.",
    owners: {
      loyalty: {
        tag: "Lojalność",
        title: "Goście wracają częściej",
        metric: "powracających wizyt",
        body: "Karta z pieczątkami, która zawsze jest w kieszeni, daje gościom powód, by znowu wybrać Ciebie.",
      },
      reviews: {
        tag: "Opinie Google",
        title: "Więcej opinii co miesiąc",
        metric: "opinii miesięcznie",
        body: "Prośba we właściwym momencie, jednym dotknięciem, zamienia udane wizyty w publiczne opinie.",
      },
      menus: {
        tag: "Cyfrowe menu",
        title: "Zmiany w menu w kilka sekund",
        metric: "czasu na aktualizację menu",
        body: "Zmień cenę albo oznacz danie jako niedostępne z telefonu. Bez grafika i drukarni.",
      },
      allInOne: {
        tag: "Wszystko w jednym",
        title: "Jedna naklejka, trzy narzędzia",
        body: "Włączaj funkcje, kiedy ich potrzebujesz. Ta sama naklejka, ten sam panel.",
        features: ["Cyfrowe menu", "Opinie Google", "Karty lojalnościowe"],
      },
    },
    chart: {
      before: "Przed",
      after: "Z PapuPay",
    },
    guests: {
      tag: "Dla Twoich gości",
      title: "Lepiej dla ludzi przy stoliku",
      items: [
        { title: "Zawsze aktualne menu", body: "Dzisiejsze dania i ceny, za każdym razem." },
        { title: "Karty, które się nie gubią", body: "Pieczątki są w telefonie, nie w szufladzie." },
        { title: "Wszystko w jednym miejscu", body: "Wszystkie lokale i karty PapuPay razem." },
        { title: "Podziękuj w kilka sekund", body: "Opinia jest o jedno dotknięcie." },
      ],
    },
    footnote: "* Przykładowe dane poglądowe.",
  },

  demo: {
    eyebrow: "Demo",
    title: "Zobacz PapuPay oczami swoich gości.",
    body: "Przejdź przez stronę lokalu: otwórz menu, wystaw opinię i zbierz pieczątkę.",
    button: "Wypróbuj demo",
    dialogTitle: "Interaktywne demo już wkrótce",
    dialogBody:
      "Dopracowujemy ostatnie szczegóły. W międzyczasie napisz do nas, a chętnie pokażemy PapuPay na żywo i omówimy, jak sprawdzi się w Twoim lokalu.",
    dialogCta: "Skontaktuj się",
    dialogClose: "Zamknij",
  },

  pricing: {
    eyebrow: "Cennik",
    title: "Zacznij od małego. Resztę włącz, kiedy zechcesz.",
    intro: "Proste plany dla restauracji, barów i kawiarni każdej wielkości. Pomożemy we wdrożeniu.",
    featured: "Najczęściej wybierany",
  },

  faq: {
    eyebrow: "FAQ",
    title: "O to pytają właściciele.",
    items: [
      {
        q: "Czy goście muszą pobierać aplikację?",
        a: "Nie. Menu i link do opinii otwierają się od razu w przeglądarce telefonu. Karty lojalnościowe otwierają się na iPhonie jako lekki App Clip, więc nie trzeba instalować pełnej aplikacji. Dopracowujemy szczegóły na wszystkich telefonach i portfelach, a przy wdrożeniu wszystko wyjaśnimy.",
      },
      {
        q: "Czy mogę sam aktualizować menu?",
        a: "Tak. Panel jest stworzony dla właścicieli i obsługi. Zmieniasz dania, ceny i zdjęcia, a zmiana od razu jest widoczna na każdym stoliku.",
      },
      {
        q: "Jak działa link do opinii Google?",
        a: "Łączymy Twoją naklejkę z formularzem opinii Twojego lokalu w Google. Gość dotyka lub skanuje i od razu trafia do formularza, gotowy wystawić gwiazdki i komentarz.",
      },
      {
        q: "Czy mogę zacząć od jednej funkcji?",
        a: "Tak. Wiele lokali zaczyna od cyfrowego menu, a opinie i lojalność dodaje później. To ta sama naklejka i ten sam panel, więc dla gości nic się nie zmienia.",
      },
      {
        q: "Czy program lojalnościowy jest już dostępny?",
        a: "Karty lojalnościowe są we wczesnym dostępie. Napisz do nas, a powiemy, na jakim etapie jesteśmy i jak dołączyć do pierwszych lokali.",
      },
      {
        q: "Jak zacząć?",
        a: "Napisz do nas przez formularz poniżej. Poznamy Twój lokal i pomożemy wybrać funkcje, które do niego pasują.",
      },
    ],
  },

  contact: {
    eyebrow: "Kontakt",
    title: "Sprawmy, by goście wracali.",
    body: "Opowiedz nam o swoim lokalu. Odpowiemy mailowo.",
    points: [
      "Krótka rozmowa o Twoim lokalu",
      "Prezentacja PapuPay na żywo",
      "Pomoc w wyborze funkcji",
    ],
    form: {
      name: "Imię i nazwisko",
      namePlaceholder: "Jak się nazywasz?",
      email: "E-mail",
      emailPlaceholder: "ty@twojakawiarnia.pl",
      message: "Wiadomość",
      messagePlaceholder: "Opowiedz o swoim lokalu: rodzaj, lokalizacja, które funkcje Cię interesują…",
      required: "wymagane",
      optional: "opcjonalne",
      submit: "Wyślij wiadomość",
      sending: "Wysyłanie…",
      success: "Dziękujemy! Wiadomość została wysłana. Wkrótce się odezwiemy.",
      errors: {
        email: "Podaj poprawny adres e-mail, żebyśmy mogli odpowiedzieć.",
        message: "Napisz krótką wiadomość (co najmniej 10 znaków).",
        tooLong: "Ten tekst jest trochę za długi. Skróć go, proszę.",
        rateLimited: "Wysłano kilka wiadomości w krótkim czasie. Spróbuj ponownie za kilka minut.",
        server: "Coś poszło nie tak i wiadomość nie została wysłana. Spróbuj ponownie później.",
      },
      honeypot: "Zostaw to pole puste",
    },
  },

  footer: {
    tagline: "Cyfrowe menu, opinie Google i karty lojalnościowe. Jednym dotknięciem.",
    rights: "Wszelkie prawa zastrzeżone.",
  },

  notFound: {
    title: "Tej strony nie ma w menu.",
    body: "Strona, której szukasz, nie istnieje.",
    cta: "Wróć na stronę główną",
  },
};
