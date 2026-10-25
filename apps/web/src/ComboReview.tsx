import { useState } from "react";
import { ArrowRight, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Modal from "./Modal";
import { dishFor, restaurantFor, price, lineKey } from "./domain";
import type { CartLine, Locale } from "./domain";

export const COMBO_IDS = ["atom-classic", "fry-fries", "tecza-gelato"] as const;
export type ComboSelection = { itemId: string; quantity: number; extra: boolean; note: string };
const images = ["combo-burger.webp", "combo-fries.webp", "combo-gelato.webp"];
const allergens: Record<string, string> = { gluten: "Gluten", milk: "Mleko", egg: "Jaja", mustard: "Gorczyca", soy: "Soja", nuts: "Orzechy" };

export default function ComboReview({ locale, cart, onClose, onConfirm }: {
  locale: Locale; cart: CartLine[]; onClose: () => void; onConfirm: (items: ComboSelection[]) => void;
}) {
  const pl = locale === "pl";
  const [selections, setSelections] = useState<ComboSelection[]>(() => COMBO_IDS.map(itemId => ({
    itemId, quantity: cart.some(x => x.id === lineKey(itemId, false, "") && x.quantity >= 20) ? 0 : 1, extra: false, note: "",
  })));
  const room = (selection: ComboSelection) => 20 - (cart.find(x => x.id === lineKey(selection.itemId, selection.extra, selection.note))?.quantity ?? 0);
  const effective = selections.map(s => ({ ...s, quantity: Math.min(s.quantity, room(s)) }));
  const total = effective.reduce((sum, s) => sum + (dishFor(s.itemId).price + (s.extra ? 500 : 0)) * s.quantity, 0);
  const selected = effective.filter(s => s.quantity > 0);
  const change = (index: number, patch: Partial<ComboSelection>) => setSelections(current => current.map((s, i) => i === index ? { ...s, ...patch } : s));
  return <Modal label={pl ? "Twój zestaw z Koszyków" : "Your Koszyki combo"} onClose={onClose}>
    <div className="combo-review">
      <p className="eyebrow">{pl ? "DOBRZE SIĘ SKŁADA" : "BETTER TOGETHER"}</p>
      <h2>{pl ? "Twój zestaw z Koszyków" : "Your Koszyki combo"}</h2>
      <p className="muted">{pl ? "Dobierz ilości. Zostaw to, na co masz ochotę." : "Make it yours. Keep what you’re craving."}</p>
      <div className="combo-review-list">
        {effective.map((selection, index) => {
          const item = dishFor(selection.itemId), vendor = restaurantFor(item.restaurantId);
          return <div className={"combo-review-item" + (selection.quantity ? "" : " omitted")} key={item.id}>
            <div className="combo-review-row">
              <div className="combo-review-photo"><img src={"/assets/" + images[index]} alt="" /></div>
              <div className="combo-review-name"><small>{vendor.name}</small><h3>{pl ? item.name : item.nameEn}</h3><strong>{price(item.price + (selection.extra ? 500 : 0), locale)}</strong></div>
              <div className="stepper">
                <button type="button" aria-label={(pl ? "Mniej: " : "Fewer: ") + item.name} disabled={!selection.quantity} onClick={() => change(index, { quantity: selection.quantity - 1 })}><Minus size={15} /></button>
                <strong aria-live="polite">{selection.quantity}</strong>
                <button type="button" aria-label={(pl ? "Więcej: " : "More: ") + item.name} disabled={selection.quantity >= room(selection)} onClick={() => change(index, { quantity: selection.quantity + 1 })}><Plus size={15} /></button>
              </div>
            </div>
            {room(selection) === 0 && <p className="combo-limit">{pl ? "Masz już 20 takich pozycji w koszyku" : "Your basket already has 20 of this item"}</p>}
            <details className="combo-options"><summary>{pl ? "Dodatki, uwagi i alergeny" : "Options, notes & allergens"}</summary>
              <p>{pl ? item.description : item.descriptionEn}</p>
              {item.restaurantId !== "tecza" && <label className="combo-extra"><input type="checkbox" checked={selection.extra} onChange={e => change(index, { extra: e.target.checked })} /><span>{pl ? "Dodatkowy sos" : "Extra sauce"}</span><strong>+ {price(500, locale)}</strong></label>}
              <label className="combo-note">{pl ? "Uwagi dla kuchni" : "Note for the kitchen"}<textarea value={selection.note} maxLength={180} placeholder={pl ? "Opcjonalnie" : "Optional"} onChange={e => change(index, { note: e.target.value })} /></label>
              <p className="combo-allergens">{pl ? "Alergeny (demo): " : "Allergens (demo): "}{item.allergens.length ? item.allergens.map(a => pl ? allergens[a] ?? a : a).join(", ") : pl ? "sprawdź w lokalu" : "check with the kitchen"}</p>
            </details>
          </div>;
        })}
      </div>
      <p className="combo-review-pickup"><Check size={16} />{pl ? "Jedna płatność · odbiór przy ladach" : "One payment · collect at the counters"}</p>
      <p className="fine-print">{pl ? "Demo · zdjęcia, porcje i ceny są przykładowe. Smaki lodów zmieniają się; dostępność i alergeny potwierdź w lokalu." : "Demo · images, portions and prices are illustrative. Ice-cream flavours rotate; confirm availability and allergens with the vendor."}</p>
      <button className="primary combo-confirm" disabled={!selected.length} onClick={() => onConfirm(selected)}><ShoppingBag size={18} /><span>{pl ? "Dodaj do koszyka" : "Add to basket"}</span><strong>{price(total, locale)}</strong><ArrowRight size={18} /></button>
    </div>
  </Modal>;
}
