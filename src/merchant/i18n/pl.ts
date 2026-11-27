import type { DashboardDictionary } from "./en";

export const pl: DashboardDictionary = {
  meta: {
    title: "PapuPay dla lokali",
  },
  shell: {
    skip: "Przejdź do treści",
    navLabel: "Panel",
    languageLabel: "Język",
    soon: "Wkrótce",
    loading: "Ładowanie panelu…",
  },
  nav: {
    overview: "Przegląd",
    branding: "Wygląd",
    wifi: "Wi-Fi",
    reviews: "Opinie Google",
    menu: "Menu",
    loyalty: "Karta lojalnościowa",
    team: "Zespół",
    publish: "Publikacja",
  },
  home: {
    eyebrow: "Panel lokalu",
    title: "Ustaw, co zobaczą goście po zbliżeniu telefonu",
    body: "Skonfiguruj baner, Wi-Fi, link do opinii Google, menu i kartę lojalnościową, które otwierają się w App Clipie i na Androidzie.",
    progressTitle: "Budujemy to",
    progressBody: "Sekcje będą się otwierać, gdy będą gotowe. Najpierw logowanie przez zaproszenie.",
    steps: [
      { title: "Logowanie przez zaproszenie", body: "Właściciele i menedżerowie dostają link e-mailem. Bez haseł." },
      { title: "Ustawienia lokalu", body: "Baner, logo, Wi-Fi, link do opinii Google i menu w PDF, z podglądem na telefonie." },
      { title: "Karta lojalnościowa", body: "Nagroda, zasady zbierania pieczątek, limity i ważność. Obecni członkowie zachowują swoje zasady." },
      { title: "Publikacja", body: "Przejrzyj zmiany i opublikuj je w App Clipie i aplikacji webowej." },
    ],
  },
};
