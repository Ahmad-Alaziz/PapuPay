import { useState } from "react";
import {
  ArrowUpRight,
  MapPin,
  Minus,
  Plus,
  LocateFixed,
  Navigation,
} from "lucide-react";
import geometry from "../../../packages/catalog/map.json";
import { restaurants, restaurantFor } from "./domain";
import type { Locale } from "./domain";
const positions: Record<number, [number, number]> = {
  1: [127, 550],
  2: [80, 500],
  3: [85, 426],
  4: [85, 387],
  5: [80, 344],
  6: [157, 310],
  7: [205, 358],
  8: [205, 376],
  9: [215, 310],
  10: [246, 310],
  11: [250, 250],
  13: [346, 210],
  14: [402, 252],
  15: [389, 319],
  16: [450, 309],
  17: [550, 335],
  18: [509, 445],
  19: [525, 478],
  20: [543, 535],
  21: [511, 550],
  22: [445, 550],
  23: [444, 486],
  24: [451, 426],
  25: [420, 426],
  26: [392, 420],
  27: [366, 445],
  28: [318, 367],
  29: [270, 433],
  30: [219, 426],
  31: [188, 426],
  32: [194, 505],
  33: [416, 367],
};
const routes: Record<number, string> = {
  8: "M318 317 L318 338 Q318 340 310 340 L235 340 Q225 340 225 350 L225 376 L215 376",
  7: "M318 317 L318 338 L226 338 L226 358 L215 358",
  9: "M318 317 L318 340 L215 340 L215 328",
  11: "M318 317 L285 317 L285 280 L263 280",
  16: "M318 317 L342 317 L342 338 L450 338 L450 327",
  15: "M318 317 L342 317 L342 338 L389 338 L389 328",
  33: "M318 317 L342 317 L342 338 L390 338 L390 368 L406 368",
  30: "M318 317 L250 317 L250 340 L237 340 L237 395 L219 395 L219 408",
  28: "M318 317 L318 350",
};
export default function HallMap({
  locale,
  table,
  selected,
  onSelect,
  onMenu,
}: {
  locale: Locale;
  table: string;
  selected: string;
  onSelect: (id: string) => void;
  onMenu: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1),
    [route, setRoute] = useState(true);
  const pl = locale === "pl",
    restaurant = restaurantFor(selected);
  return (
    <section className="map-layout">
      <div className="map-canvas">
        <div className="map-top">
          <span className="pill cream">
            <span className="green-dot" />
            {pl ? "Poziom 0 · Parter" : "Level 0 · Ground floor"}
          </span>
          <button
            className="icon-button"
            aria-label={pl ? "Wyśrodkuj mapę" : "Center map"}
            onClick={() => setZoom(1)}
          >
            <LocateFixed size={20} />
          </button>
        </div>
        <div className="map-drawing">
          <svg
            viewBox="0 30 609 590"
            role="group"
            aria-label={
              pl
                ? "Interaktywny plan Hali Koszyki"
                : "Interactive Hala Koszyki floor plan"
            }
            style={{ transform: `scale(${zoom})` }}
          >
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="13"
                height="13"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r=".6" fill="#b6bca7" opacity=".35" />
              </pattern>
            </defs>
            <rect width="609" height="630" fill="url(#dots)" />
            <path
              d="M18 578V310Q17 298 40 300H148V163L182 170L230 109L291 145L389 44L452 109L365 199L595 285V580H417V467H222V580Z"
              fill="#f8f4e8"
              stroke="#c9cebb"
              strokeWidth="2"
            />
            {geometry.units.map((u) => {
              const n = Number(u["data-id"]),
                r = restaurants.find((x) => x.unit === n),
                active = r?.id === selected;
              const props = {
                fill: active ? "#ff8848" : r ? "#c4d3b4" : "#e0e4d6",
                stroke: "#faf7ef",
                strokeWidth: 3,
              };
              return (
                <g
                  key={u.id}
                  className={r ? "map-unit" : ""}
                  role={r ? "button" : undefined}
                  tabIndex={r ? 0 : undefined}
                  aria-label={
                    r ? `${r.name}, ${pl ? "lokal" : "unit"} ${n}` : undefined
                  }
                  onClick={() => r && onSelect(r.id)}
                  onKeyDown={(e) => {
                    if (r && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onSelect(r.id);
                    }
                  }}
                >
                  {u.tag === "rect" ? (
                    <rect
                      x={u.x}
                      y={u.y}
                      width={u.width}
                      height={u.height}
                      rx="3"
                      {...props}
                    />
                  ) : u.tag === "polygon" ? (
                    <polygon points={u.points} {...props} />
                  ) : (
                    <path d={u.d} {...props} />
                  )}
                  <text
                    x={positions[n]?.[0]}
                    y={(positions[n]?.[1] || 0) + 3}
                    fontSize={n === 7 || n === 8 ? 9 : 12}
                    fill={active ? "#173c2b" : "#69806a"}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {n === 11 ? "11–12" : String(n).padStart(2, "0")}
                  </text>
                </g>
              );
            })}
            <text
              x="318"
              y="480"
              textAnchor="middle"
              fill="#92a08b"
              fontSize="10"
              letterSpacing="3"
            >
              HALA KOSZYKI
            </text>
            <text
              x="318"
              y="597"
              textAnchor="middle"
              fill="#7e8e77"
              fontSize="11"
              letterSpacing="3"
            >
              KOSZYKOWA
            </text>
            <g fill="#b9c4ad">
              <circle cx="163" cy="474" r="7" />
              <circle cx="477" cy="473" r="7" />
              <circle cx="163" cy="530" r="7" />
              <circle cx="477" cy="530" r="7" />
            </g>
            {route && (
              <path
                key={selected}
                className="walking-route"
                d={routes[restaurant.unit]}
                fill="none"
                stroke="#173c2b"
                strokeWidth="3"
                strokeDasharray="3 7"
                strokeLinecap="round"
              />
            )}
            <circle
              className="map-pulse"
              cx="318"
              cy="317"
              r="13"
              fill="#2b744b"
              opacity=".15"
            />
            <circle
              cx="318"
              cy="317"
              r="6"
              fill="#2b744b"
              stroke="#fff"
              strokeWidth="3"
            />
            <g className="destination-pin" transform={`translate(${Math.min(465, Math.max(75, positions[restaurant.unit][0]))} ${positions[restaurant.unit][1] - 30})`} pointerEvents="none">
              <rect x="-73" y="-27" width="146" height="30" rx="15" fill="#ff8848" stroke="#fff2d6" strokeWidth="3" />
              <path d="M-6 2 L0 10 L6 2" fill="#ff8848" />
              <text y="-7" fontFamily="Bricolage Grotesque" fontSize="14" fontWeight="650" textAnchor="middle" fill="#173c2b">{String(restaurant.unit).padStart(2,'0')} · {restaurant.name}</text>
            </g>
            <g transform="translate(275 277)">
              <rect width="87" height="24" rx="12" fill="#173c2b" />
              <text
                x="43.5"
                y="16"
                fill="#fff9eb"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {pl ? "Twój stolik" : "Your table"} {table}
              </text>
            </g>
          </svg>
        </div>
        <div className="map-bottom">
          <span>
            <span className="legend-square" />
            {pl ? "Restauracje w demo" : "Demo restaurants"}
          </span>
          <div className="zoom">
            <button
              aria-label="Zoom out"
              onClick={() => setZoom(Math.max(1, zoom - 0.2))}
            >
              <Minus size={17} />
            </button>
            <button
              aria-label="Zoom in"
              onClick={() => setZoom(Math.min(1.8, zoom + 0.2))}
            >
              <Plus size={17} />
            </button>
          </div>
        </div>
      </div>
      <aside className="map-sidebar">
        <p className="eyebrow">{pl ? "ODKRYJ SWOJĄ DROGĘ" : "FIND YOUR WAY"}</p>
        <h2>
          {pl ? "Pyszne jest" : "Good food is"}
          <br />
          <em>{pl ? "tuż za rogiem." : "around the corner."}</em>
        </h2>
        <p className="muted">
          {pl
            ? "Wybierz restaurację. Papu pokaże Ci, gdzie odebrać zamówienie."
            : "Pick a restaurant. Papu will show you where to collect your order."}
        </p>
        <div className="map-venue-list">
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={selected === r.id ? "selected" : ""}
            >
              <span className="unit-number">
                {String(r.unit).padStart(2, "0")}
              </span>
              <span>
                <strong>{r.name}</strong>
                <small>{pl ? r.cuisine : r.cuisineEn}</small>
              </span>
              {selected === r.id ? (
                <MapPin size={18} />
              ) : (
                <ArrowUpRight size={17} />
              )}
            </button>
          ))}
        </div>
        <div className="map-selected">
          <img className="map-destination-photo" src={`/assets/${restaurant.image}`} alt="" />
          <span className="eyebrow">
            {pl ? "TWÓJ KIERUNEK" : "YOUR DESTINATION"}
          </span>
          <h3>{restaurant.name}</h3>
          <p>
            {pl ? "Lokal" : "Unit"} {restaurant.unit} ·{" "}
            {pl ? "Parter" : "Ground floor"}
          </p>
          <button className="primary" onClick={() => onMenu(selected)}>
            {pl ? "Zobacz menu" : "See menu"}
            <ArrowUpRight size={18} />
          </button>
          <button className="text-button" onClick={() => setRoute(!route)}>
            <Navigation size={16} />
            {route
              ? pl
                ? "Ukryj trasę"
                : "Hide route"
              : pl
                ? "Pokaż trasę"
                : "Show route"}
          </button>
        </div>
        <p className="fine-print">
          {pl
            ? "Plan lokali na podstawie koszyki.com. Położenie stolika i trasa są przykładowe."
            : "Venue plan based on koszyki.com. Table position and route are illustrative."}
        </p>
      </aside>
    </section>
  );
}
