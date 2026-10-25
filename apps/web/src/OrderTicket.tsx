import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Clock, Navigation, RotateCcw, Zap } from "lucide-react";
import { dishFor, linePrice, price, restaurantFor, statusFor } from "./domain";
import type { Order, Locale } from "./domain";

function Countdown({ until }: { until: number }) {
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.ceil((until - Date.now()) / 1000)),
  );
  useEffect(() => {
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until]);
  return (
    <span className="ticket-countdown">
      0:{String(seconds).padStart(2, "0")}
    </span>
  );
}
export default function OrderTicket({
  order,
  locale,
  now,
  onPickup,
  onCollect,
  onReady,
  onReorder,
}: {
  order: Order;
  locale: Locale;
  now: number;
  onPickup: () => void;
  onCollect: () => void;
  onReady: () => void;
  onReorder: () => void;
}) {
  const t = (a: string, b: string) => (locale === "pl" ? a : b);
  const r = restaurantFor(order.restaurantId),
    status = statusFor(order, now),
    ready = status === "ready";
  const stage =
    status === "collected" ? 3 : ready ? 2 : status === "preparing" ? 1 : 0;
  return (
    <motion.article
      className={`pickup-ticket ${ready ? "is-ready" : ""}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className="ticket-header">
        <span className="ticket-unit">{String(r.unit).padStart(2, "0")}</span>
        <div>
          <h3>{r.name}</h3>
          <p>
            {t("ODBIÓR · LOKAL", "PICKUP · UNIT")} {r.unit}
          </p>
        </div>
        {order.collected && <Check size={24} />}
      </header>
      <div className="ticket-perforation" />
      <div className="ticket-body">
        <div className="ticket-state">
          <div>
            <h2>
              {
                [
                  t("Przyjęte", "All yours"),
                  t("Już się robi", "Cooking up"),
                  t("Pora na papu!", "Come and get it!"),
                  t("Smacznego!", "Enjoy every bite!"),
                ][stage]
              }
            </h2>
            {stage < 2 ? (
              <p>
                <Clock size={14} />
                <Countdown until={order.readyAt} />{" "}
                {t("do odbioru · demo", "until pickup · demo")}
              </p>
            ) : (
              <p>
                {ready
                  ? t(
                      "Pokaż ten numer przy odbiorze.",
                      "Show this number at the counter.",
                    )
                  : t(
                      "Dzięki za wspólny stół.",
                      "Thanks for sharing the table.",
                    )}
              </p>
            )}
          </div>
          {ready && (
            <motion.span
              className="ticket-ready"
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              <Check size={28} />
            </motion.span>
          )}
        </div>
        <div
          className="ticket-progress"
          aria-label={
            [
              t("Przyjęte", "Received"),
              t("W kuchni", "Cooking"),
              t("Gotowe", "Ready"),
              t("Odebrane", "Collected"),
            ][stage]
          }
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= stage ? "done" : ""} />
          ))}
        </div>
        <div className="ticket-number">
          <strong>#{order.id}</strong>
          <span>
            {t("Stolik", "Table")} {order.table}
          </span>
        </div>
        <div className="ticket-items">
          {order.lines.map((line) => (
            <div key={line.id}>
              <img
                src={`/assets/${dishFor(line.itemId).image}`}
                alt=""
                loading="lazy"
              />
              <span>
                {line.quantity} ×{" "}
                {locale === "pl"
                  ? dishFor(line.itemId).name
                  : dishFor(line.itemId).nameEn}
                {line.extra && (
                  <small>{t("+ Dodatkowy sos", "+ Extra sauce")}</small>
                )}
              </span>
              <b>{price(linePrice(line), locale)}</b>
            </div>
          ))}
        </div>
        {ready ? (
          <>
            <button className="primary full-width" onClick={onPickup}>
              {t("Prowadź do odbioru", "Take me to pickup")}
              <Navigation size={18} />
            </button>
            <button
              className="text-button ticket-secondary"
              onClick={onCollect}
            >
              <Check size={17} />
              {t("Mam swoje papu", "I’ve got my food")}
            </button>
          </>
        ) : order.collected ? (
          <button className="text-button ticket-secondary" onClick={onReorder}>
            <RotateCcw size={16} />
            {t("Jeszcze raz?", "Another round?")}
          </button>
        ) : (
          <button className="text-button ticket-secondary" onClick={onReady}>
            <Zap size={15} />
            {t("Przyspiesz demo", "Skip the wait")}
          </button>
        )}
      </div>
    </motion.article>
  );
}
