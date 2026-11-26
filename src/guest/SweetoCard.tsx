import { useId, useState, type ReactNode } from "react";
import { Gift, RotateCcw, ScanLine } from "papu-guest-icons";
import GuestMotion from "../GuestMotion";
import { useVenue } from "./VenueContext";
import PapayaMark from "./PapayaMark";
import type { Language } from "./catalog";
import "./sweeto-card.css";

const words = {
  pl: {
    title: "Karta na pieczątki",
    demo: "Karta demo",
    stamps: "Pieczątki",
    ready: "Nagroda do odbioru",
    empty: "Zbierz komplet pieczątek",
    saved: "Zapisane pieczątki",
    back: "Pokaż przy kasie",
    front: "Pokaż pieczątki",
    code: "Numer karty",
    remaining: (n: number, unit: string) => `${n} ${unit} do nagrody`,
    units: ["pieczątka", "pieczątki", "pieczątek"],
  },
  en: {
    title: "Stamp card",
    demo: "Demo card",
    stamps: "Stamps",
    ready: "Reward ready to claim",
    empty: "Collect your stamps",
    saved: "Last saved stamps",
    back: "Show at checkout",
    front: "Show stamps",
    code: "Card number",
    remaining: (n: number, unit: string) => `${n} ${unit} to your reward`,
    units: ["stamp", "stamps", "stamps"],
  },
  ru: {
    title: "Карта отметок",
    demo: "Демо-карта",
    stamps: "Отметки",
    ready: "Награда готова",
    empty: "Соберите все отметки",
    saved: "Сохранённые отметки",
    back: "Показать на кассе",
    front: "Показать отметки",
    code: "Номер карты",
    remaining: (n: number, unit: string) => `Ещё ${n} ${unit} до награды`,
    units: ["отметка", "отметки", "отметок"],
  },
};

type FaceProps = {
  language: Language;
  stamps: number;
  goal: number;
  demo?: boolean;
  unissued?: boolean;
  stale?: boolean;
  earnedKey?: string;
};

export function SweetoCardFace({
  language,
  stamps,
  goal,
  demo,
  stale,
  unissued,
  earnedKey,
}: FaceProps) {
  const { venue } = useVenue();
  const t = words[language];
  const remaining = Math.max(0, goal - stamps);
  const plural = new Intl.PluralRules(language).select(remaining);
  const unit = t.units[plural === "one" ? 0 : plural === "few" ? 1 : 2];
  const summary = stale
    ? t.saved
    : unissued
      ? t.empty
      : remaining
        ? t.remaining(remaining, unit)
        : t.ready;
  const logo = venue.logoWhiteUrl || venue.logoUrl;
  return (
    <div className="sweeto-physical-card">
      <div className="sweeto-card-print">
        <PapayaMark className="sweeto-card-engraving" />
        <div className="sweeto-card-brand">
          {logo ? (
            <img src={logo} alt={venue.name} />
          ) : (
            <strong>{venue.name}</strong>
          )}
          <span>{demo ? t.demo : t.title}</span>
        </div>
        <div className="sweeto-card-balance" role="status" aria-atomic="true">
          <span className="sweeto-sr-only">{t.stamps} </span>
          <strong>
            {stamps} <small>/ {goal}</small>
          </strong>
          <span>{summary}</span>
        </div>
      </div>
      <ol className="sweeto-card-impressions" aria-hidden="true">
        {Array.from({ length: goal }, (_, i) => (
          <li
            key={i}
            data-earned={i < stamps || undefined}
            data-final={i === goal - 1 || undefined}
          >
            {i < stamps ? (
              <GuestMotion playKey={i === stamps - 1 ? earnedKey : undefined} />
            ) : i === goal - 1 ? (
              <Gift strokeWidth={1.7} />
            ) : (
              i + 1
            )}
            {i === goal - 1 && stamps === goal && !stale && (
              <span
                key={earnedKey}
                className="sweeto-reward-foil"
                data-arrived={earnedKey ? true : undefined}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SweetoMemberCard({
  code,
  qr,
  initiallyAtCounter = false,
  earnedRevision,
  ...face
}: FaceProps & {
  code: string;
  qr: ReactNode;
  initiallyAtCounter?: boolean;
  earnedRevision?: string;
}) {
  const [side, setSide] = useState({
    checkout: initiallyAtCounter,
    earnedRevision,
  });
  const atCounter = side.checkout && side.earnedRevision === earnedRevision;
  const [hasTurned, setHasTurned] = useState(false);
  const id = useId();
  const t = words[face.language];
  return (
    <div className="sweeto-card-holder">
      <div
        id={id}
        className="sweeto-card-side"
        key={atCounter ? "code" : "face"}
        data-turn={hasTurned || undefined}
      >
        {atCounter ? (
          <div className="sweeto-code-side">
            <div className="sweeto-code-identity">
              <span>{face.demo ? t.demo : t.title}</span>
              <strong>{t.back}</strong>
              <span>
                {t.code}
                <bdi>{code}</bdi>
              </span>
            </div>
            <div className="sweeto-code-window">{qr}</div>
          </div>
        ) : (
          <SweetoCardFace
            {...face}
            earnedKey={
              hasTurned && side.earnedRevision === earnedRevision
                ? undefined
                : face.earnedKey
            }
          />
        )}
      </div>
      <button
        type="button"
        className="sweeto-turn-button"
        aria-controls={id}
        onClick={() => {
          setHasTurned(true);
          setSide({ checkout: !atCounter, earnedRevision });
        }}
      >
        {atCounter ? t.front : t.back}
        {atCounter ? (
          <RotateCcw aria-hidden="true" size={20} />
        ) : (
          <ScanLine aria-hidden="true" size={20} />
        )}
      </button>
    </div>
  );
}
