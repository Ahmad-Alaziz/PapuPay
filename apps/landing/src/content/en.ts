/**
 * English copy for the PapuPay landing page.
 * `pl.ts` must match this shape exactly (enforced by the `Dictionary` type).
 * Pricing copy lives in `pricing.ts`, benefit figures in `stats.ts`.
 */
export const en = {
  meta: {
    title: "PapuPay: digital menus, Google reviews and loyalty cards for restaurants, bars and cafés",
    description:
      "One table sticker, one dashboard. With PapuPay your guests open your digital menu, leave a Google review in seconds and collect loyalty stamps with a single tap or scan.",
    ogAlt: "PapuPay: menus, reviews and regulars from one tap.",
  },

  nav: {
    skip: "Skip to content",
    home: "PapuPay home",
    main: "Main navigation",
    footer: "Footer",
    links: {
      features: "Features",
      how: "How it works",
      benefits: "Benefits",
      pricing: "Pricing",
      faq: "FAQ",
    },
    contact: "Contact us",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
  },

  hero: {
    eyebrow: "For restaurants, bars and cafés",
    title: ["Menus.", "Reviews.", "Regulars."],
    subtitle:
      "PapuPay is one sticker on your tables and one dashboard behind it. Guests open your digital menu, leave a Google review in seconds and collect loyalty stamps, all from a single tap or scan.",
    primaryCta: "See the demo",
    secondaryCta: "Contact us",
    highlights: ["Digital menu with dashboard", "Google review link", "Loyalty cards"],
  },

  mockup: {
    label:
      "Preview of a venue page in PapuPay: buttons for the menu, a Google review and a loyalty card with seven of ten stamps collected.",
    venue: "Café Papaya",
    greeting: "Welcome back!",
    menu: "See the menu",
    menuSub: "Breakfast, coffee & drinks",
    review: "Leave a review",
    reviewSub: "Opens Google in one tap",
    loyalty: "Your loyalty card",
    loyaltySub: "7 of 10 stamps",
    notificationTitle: "Stamp added!",
    notificationBody: "3 more until a free coffee.",
    sticker: "Tap or scan",
    tagline: "Tap. Scan. Come back.",
  },

  problem: {
    eyebrow: "The problem",
    title: "Paper menus, missing reviews, forgotten stamp cards.",
    intro:
      "Most venues juggle a printed menu, a review card nobody uses and a loyalty card that lives in a drawer at home. Each one costs time, and none of them tells you who your regulars are.",
    guests: {
      title: "What guests put up with",
      items: [
        "Menus that are out of date, sticky or missing what's actually on today.",
        "Paper stamp cards left at home, so the stamps never add up.",
        "No easy moment to say thanks with a review after a great visit.",
        "A different card, app or sign-up form for every place they like.",
      ],
    },
    owners: {
      title: "What owners lose",
      items: [
        "Money and time reprinting menus for every price or dish change.",
        "Reviews from happy guests who would have left one if it took a second.",
        "Regulars you can't recognise or reward, because the data is on paper.",
        "Hours spent juggling separate tools for menus, reviews and loyalty.",
      ],
    },
  },

  features: {
    eyebrow: "Features",
    title: "Three tools. One tap.",
    intro: "Start with what you need today and switch on the rest when you're ready. Everything runs from the same sticker and the same dashboard.",
    earlyAccess: "Early access",
    menu: {
      tag: "Digital menu",
      title: "A menu you can change in seconds.",
      body: "Edit dishes, prices and photos from your dashboard and every table sees the update straight away. No reprinting, no crossed-out prices.",
      points: [
        "Easy admin dashboard for your whole team",
        "Changes go live instantly on every table",
        "QR code stickers for your tables included",
      ],
      mock: {
        window: "Menu editor",
        section: "Coffee",
        items: [
          { name: "Flat white", price: "14.00" },
          { name: "Cappuccino", price: "13.00" },
          { name: "Iced latte", price: "16.00" },
        ],
        editing: "15.00",
        saved: "Saved. Live on all tables",
        phoneTitle: "Coffee",
        currency: "PLN",
      },
    },
    reviews: {
      tag: "Google reviews",
      title: "More Google reviews, without the awkward ask.",
      body: "One tap takes happy guests straight to your Google review form. No searching for your venue, no extra cards on the table.",
      points: [
        "Opens your Google review form directly",
        "Works from the same table sticker",
        "Change the destination any time",
      ],
      mock: {
        question: "How was your visit?",
        button: "Review us on Google",
        thanks: "Thank you!",
        ratingLabel: "Rated 5 out of 5",
      },
    },
    loyalty: {
      tag: "Loyalty cards",
      title: "A loyalty card nobody leaves at home.",
      body: "Guests tap the NFC tag at your counter, PapuPay opens instantly through an App Clip, and the stamp lands on their card. Every card from every PapuPay venue lives in one place.",
      points: [
        "Tap the NFC tag to collect a stamp",
        "All loyalty cards in one place",
        "You choose the rewards",
      ],
      mock: {
        title: "My cards",
        cards: [
          { venue: "Café Papaya", stamps: 7, total: 10, reward: "Free coffee" },
          { venue: "Lime Bar", stamps: 3, total: 8, reward: "Free cocktail" },
          { venue: "Pizzeria Verde", stamps: 5, total: 6, reward: "Free dessert" },
        ],
        tap: "Tap to collect",
        stamps: "stamps",
      },
    },
  },

  how: {
    eyebrow: "How it works",
    title: "Up and running in four steps.",
    intro: "Nothing to wire up, and nothing for your guests to set up.",
    steps: [
      {
        title: "Set up your venue",
        body: "Add your menu, your Google review link and your rewards in the dashboard.",
      },
      {
        title: "Place the stickers",
        body: "Put the QR stickers on your tables and the NFC tag by the counter.",
      },
      {
        title: "Guests tap or scan",
        body: "One tap or scan opens your menu, a review in seconds or their loyalty card.",
      },
      {
        title: "Regulars come back",
        body: "Stamps add up with every visit until a reward unlocks, and guests have a reason to return.",
      },
    ],
  },

  benefits: {
    eyebrow: "Benefits",
    title: ["More regulars.", "More reviews.", "Less hassle."],
    intro: "What changes when your menu, reviews and loyalty live behind one tap.",
    owners: {
      loyalty: {
        tag: "Loyalty",
        title: "Guests come back more often",
        metric: "return visits",
        body: "A stamp card that's always in their pocket gives guests a reason to choose you again.",
      },
      reviews: {
        tag: "Google reviews",
        title: "More reviews every month",
        metric: "reviews per month",
        body: "Asking at the right moment, with one tap, turns happy visits into public reviews.",
      },
      menus: {
        tag: "Digital menu",
        title: "Menu updates in seconds",
        metric: "time spent updating menus",
        body: "Change a price or sell out a dish from your phone. No designer, no printer.",
      },
      allInOne: {
        tag: "All in one",
        title: "One sticker, three tools",
        body: "Turn each feature on when you need it. Same sticker, same dashboard.",
        features: ["Digital menu", "Google reviews", "Loyalty cards"],
      },
    },
    chart: {
      before: "Before",
      after: "With PapuPay",
    },
    guests: {
      tag: "For your guests",
      title: "Better for the people at the table",
      items: [
        { title: "Always the current menu", body: "Today's dishes and prices, every time." },
        { title: "Cards that don't get lost", body: "Stamps live on their phone, not in a drawer." },
        { title: "Everything in one place", body: "All their PapuPay venues and cards together." },
        { title: "Say thanks in seconds", body: "A review is one tap away." },
      ],
    },
    footnote: "* Example figures for illustration.",
  },

  demo: {
    eyebrow: "Demo",
    title: "See PapuPay through your guests' eyes.",
    body: "Tap through a venue page: open the menu, leave a review and collect a loyalty stamp.",
    button: "Try the demo",
    dialogTitle: "The interactive demo is coming soon",
    dialogBody:
      "We're putting the finishing touches on it. In the meantime, get in touch and we'll gladly show you PapuPay live and talk through how it would work in your venue.",
    dialogCta: "Contact us",
    dialogClose: "Close",
  },

  pricing: {
    eyebrow: "Pricing",
    title: "Start small. Switch on more when you're ready.",
    intro: "Simple plans for restaurants, bars and cafés of any size. We'll help you set everything up.",
    featured: "Most popular",
  },

  faq: {
    eyebrow: "FAQ",
    title: "Questions owners ask us.",
    items: [
      {
        q: "Do my guests need to download an app?",
        a: "No. The menu and the review link open straight in the phone's browser. Loyalty cards open through a lightweight App Clip on iPhone, so there's no full app to install. We're finalising the exact experience on every phone and wallet, and we'll walk you through it.",
      },
      {
        q: "Can I update the menu myself?",
        a: "Yes. The dashboard is made for owners and staff. Change dishes, prices and photos, and the update is live on every table immediately.",
      },
      {
        q: "How does the Google review link work?",
        a: "We connect your sticker to your venue's Google review form. A guest taps or scans and lands directly on the form, ready to leave stars and a comment.",
      },
      {
        q: "Can I start with just one feature?",
        a: "Yes. Many venues start with the digital menu and add reviews and loyalty later. It's the same sticker and dashboard, so nothing changes for your guests.",
      },
      {
        q: "Is the loyalty programme available now?",
        a: "Loyalty cards are in early access. Get in touch and we'll tell you where things stand and how to be among the first venues to use it.",
      },
      {
        q: "How do we get started?",
        a: "Send us a message using the form below. We'll learn about your venue and help you decide which features fit.",
      },
    ],
  },

  contact: {
    eyebrow: "Contact",
    title: "Let's bring your regulars back.",
    body: "Tell us about your venue. We'll reply by email.",
    points: [
      "A short call to understand your venue",
      "A live walkthrough of PapuPay",
      "Help choosing the features that fit",
    ],
    form: {
      name: "Name",
      namePlaceholder: "Your name",
      email: "Email",
      emailPlaceholder: "you@yourcafe.com",
      message: "Message",
      messagePlaceholder: "Tell us about your venue: type, location, which features interest you…",
      required: "required",
      optional: "optional",
      submit: "Send message",
      sending: "Sending…",
      success: "Thanks! Your message is on its way. We'll get back to you soon.",
      errors: {
        email: "Please enter a valid email address so we can reply.",
        message: "Please write a short message (at least 10 characters).",
        tooLong: "This is a bit too long. Please shorten it.",
        rateLimited: "You've sent several messages in a short time. Please try again in a few minutes.",
        server: "Something went wrong and your message wasn't sent. Please try again later.",
      },
      honeypot: "Leave this field empty",
    },
  },

  footer: {
    tagline: "Digital menus, Google reviews and loyalty cards. One tap.",
    rights: "All rights reserved.",
  },

  notFound: {
    title: "This page isn't on the menu.",
    body: "The page you're looking for doesn't exist.",
    cta: "Back to the home page",
  },
};

export type Dictionary = typeof en;
