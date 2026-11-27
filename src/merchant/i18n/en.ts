export const en = {
  meta: {
    title: "PapuPay for venues",
  },
  shell: {
    skip: "Skip to content",
    navLabel: "Dashboard",
    languageLabel: "Language",
    soon: "Soon",
    loading: "Loading your dashboard…",
  },
  nav: {
    overview: "Overview",
    branding: "Branding",
    wifi: "Wi-Fi",
    reviews: "Google reviews",
    menu: "Menu",
    loyalty: "Loyalty card",
    team: "Team",
    publish: "Publish",
  },
  home: {
    eyebrow: "Merchant dashboard",
    title: "Set up what your guests see when they tap",
    body: "Configure the banner, Wi-Fi, Google review link, menu and loyalty card that open in the App Clip and on Android.",
    progressTitle: "We're building it",
    progressBody: "Sections open up as they're ready. Sign-in by invitation comes first.",
    steps: [
      { title: "Sign-in by invitation", body: "Owners and managers get an email link. No passwords." },
      { title: "Venue settings", body: "Banner, logo, Wi-Fi, Google review link and menu PDFs, with a live phone preview." },
      { title: "Loyalty card", body: "Reward, how stamps are earned, limits and expiry. Existing members keep their rules." },
      { title: "Publish", body: "Review your changes and publish them to the App Clip and web app." },
    ],
  },
};

export type DashboardDictionary = typeof en;
