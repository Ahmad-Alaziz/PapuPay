import { Check, Plus } from "papu-guest-icons";
import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { Language } from "./catalog";
import { counterQuantityLimit } from "./counter-draft";

const SweetoDialPlayer = lazy(() =>
  import("./SweetoDialPlayer").catch(() => ({ default: () => <></> })),
);
const motionPreference = "(prefers-reduced-motion: reduce)";
const degrees = 180 / Math.PI;

export const tastingTitle: Record<Language, string> = {
  pl: "Dobierz deser",
  en: "Find your dessert",
  ru: "Выберите десерт",
};

const copy = {
  pl: {
    turn: "Przekręć talerzyk lub wybierz smak.",
    pick: "Wybierz smak.",
    add: "Dodaj do listy",
    compactAdd: "Do listy",
    added: "Dodano do listy",
    limit: (n: number) =>
      `Do listy możesz dodać do ${n} porcji jednego deseru.`,
  },
  en: {
    turn: "Turn the plate or pick a flavour.",
    pick: "Pick a flavour.",
    add: "Add to my list",
    compactAdd: "Add to list",
    added: "Added to my list",
    limit: (n: number) => `You can add up to ${n} portions of each dessert.`,
  },
  ru: {
    turn: "Поверните тарелку или выберите вкус.",
    pick: "Выберите вкус.",
    add: "Добавить в список",
    compactAdd: "В список",
    added: "Добавлено в список",
    limit: (n: number) =>
      `В список можно добавить до ${n} порций каждого десерта.`,
  },
};

type TastingChoice = {
  id: string;
  flavour: string;
  name: string;
  description: string;
  photo: string;
};

function shortTurn(angle: number) {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

function position(event: PointerEvent<HTMLDivElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - bounds.left - bounds.width / 2;
  const y = event.clientY - bounds.top - bounds.height / 2;
  return {
    angle: Math.atan2(y, x) * degrees,
    onRim: Math.hypot(x, y) >= bounds.width * 0.23,
  };
}

export function TastingThumbnail() {
  return (
    <span className="papu-tasting-thumbnail" aria-hidden="true">
      <img src="/assets/sweeto/matylda.webp" alt="" width={589} height={440} />
    </span>
  );
}

export default function TastingDial({
  language,
  choices,
  add,
  onComplete,
}: {
  language: Language;
  choices: readonly TastingChoice[];
  add: (id: string) => boolean;
  onComplete: () => void;
}) {
  const radioName = useId();
  const strings = copy[language];
  const [selected, setSelected] = useState(0);
  const [pose, setPose] = useState({ angle: 0, pressure: 100 });
  const [motion, setMotion] = useState(
    () => !window.matchMedia(motionPreference).matches,
  );
  const [adding, setAdding] = useState(false);
  const [limit, setLimit] = useState(false);
  const currentAngle = useRef(0);
  const frame = useRef(0);
  const pressTimer = useRef(0);
  const closeTimer = useRef(0);
  const added = useRef(false);
  const drag = useRef<{ id: number; pointerAngle: number } | null>(null);
  const choice = choices[selected];
  const step = 360 / choices.length;

  useEffect(() => {
    const preference = window.matchMedia(motionPreference);
    const update = () => {
      setMotion(!preference.matches);
      if (preference.matches) {
        cancelAnimationFrame(frame.current);
        drag.current = null;
        setPose({ angle: currentAngle.current, pressure: 100 });
      }
    };
    preference.addEventListener("change", update);
    return () => {
      preference.removeEventListener("change", update);
      cancelAnimationFrame(frame.current);
      clearTimeout(pressTimer.current);
      clearTimeout(closeTimer.current);
    };
  }, []);

  function applyPose(angle: number, pressure = 100) {
    currentAngle.current = angle;
    setPose({ angle, pressure });
  }

  function indexAt(angle: number) {
    return (
      ((Math.round(-angle / step) % choices.length) + choices.length) %
      choices.length
    );
  }

  function select(index: number) {
    if (added.current) return;
    cancelAnimationFrame(frame.current);
    setSelected(index);
    setLimit(false);
    const start = currentAngle.current;
    const travel = shortTurn(-index * step - start);
    if (!motion) {
      applyPose(start + travel);
      return;
    }
    const began = performance.now();
    function settle(now: number) {
      const progress = Math.min(1, (now - began) / 300);
      const eased = 1 - (1 - progress) ** 3;
      applyPose(start + travel * eased, 100 - 3 * Math.sin(progress * Math.PI));
      if (progress < 1) frame.current = requestAnimationFrame(settle);
    }
    frame.current = requestAnimationFrame(settle);
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!motion || added.current || !event.isPrimary || event.button !== 0)
      return;
    const touch = position(event);
    if (!touch.onRim) return;
    cancelAnimationFrame(frame.current);
    drag.current = { id: event.pointerId, pointerAngle: touch.angle };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const next = position(event).angle;
    const angle = currentAngle.current + shortTurn(next - gesture.pointerAngle);
    gesture.pointerAngle = next;
    applyPose(angle, 97);
    setSelected(indexAt(angle));
    setLimit(false);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    select(indexAt(currentAngle.current));
  }

  function addRecommendation() {
    if (added.current) return;
    if (!add(choice.id)) {
      setLimit(true);
      return;
    }
    added.current = true;
    if (!motion || document.hidden) {
      onComplete();
      return;
    }
    cancelAnimationFrame(frame.current);
    setAdding(true);
    applyPose(currentAngle.current, 91);
    pressTimer.current = window.setTimeout(
      () => applyPose(currentAngle.current),
      95,
    );
    closeTimer.current = window.setTimeout(onComplete, 280);
  }

  return (
    <>
      <header className="papu-tasting-heading">
        <h2>{tastingTitle[language]}</h2>
        <p>
          {motion ? (
            <>
              <span className="papu-tasting-turn-instruction">
                {strings.turn}
              </span>
              <span className="papu-tasting-pick-instruction">
                {strings.pick}
              </span>
            </>
          ) : (
            strings.pick
          )}
        </p>
      </header>
      <div
        className="papu-tasting-plate"
        data-motion={motion}
        aria-hidden="true"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
      >
        <div
          className="papu-tasting-plate-fallback"
          style={{
            transform: motion
              ? `rotate(${pose.angle}deg) scale(${pose.pressure / 100})`
              : undefined,
          }}
        />
        {motion && (
          <Suspense fallback={null}>
            <SweetoDialPlayer angle={pose.angle} pressure={pose.pressure} />
          </Suspense>
        )}
        {choices.map((dessert) => (
          <img
            key={dessert.id}
            className="papu-tasting-food"
            src={dessert.photo}
            alt=""
            width={589}
            height={440}
            draggable={false}
            data-selected={dessert.id === choice.id}
            style={{ scale: pose.pressure / 100 }}
          />
        ))}
        <span className="papu-tasting-pointer" />
      </div>
      <div className="papu-tasting-recommendation" role="status">
        <h3>{choice.name}</h3>
      </div>
      <fieldset className="papu-tasting-options" disabled={adding}>
        <legend className="sweeto-sr-only">{strings.pick}</legend>
        {choices.map((dessert, index) => (
          <label key={dessert.id} className="papu-tasting-option">
            <input
              type="radio"
              name={radioName}
              className="sweeto-sr-only"
              checked={index === selected}
              onChange={() => select(index)}
            />
            <span className="papu-tasting-option-mark" aria-hidden="true">
              {index === selected && <Check size={11} strokeWidth={3} />}
            </span>
            <span>{dessert.flavour}</span>
          </label>
        ))}
      </fieldset>
      <p className="papu-tasting-description">{choice.description}</p>
      <div className="papu-tasting-footer">
        {limit && (
          <p className="papu-tasting-limit" role="alert">
            {strings.limit(counterQuantityLimit)}
          </p>
        )}
        <button
          type="button"
          className="papu-tasting-add"
          data-added={adding}
          aria-label={`${adding ? strings.added : strings.add}: ${choice.name}`}
          disabled={adding}
          onClick={addRecommendation}
        >
          {adding ? (
            <Check size={19} aria-hidden="true" />
          ) : (
            <Plus size={19} aria-hidden="true" />
          )}
          <span className="papu-tasting-add-full">
            {adding ? strings.added : strings.add}
          </span>
          <span className="papu-tasting-add-compact">
            {adding ? strings.added : strings.compactAdd}
          </span>
        </button>
      </div>
    </>
  );
}
