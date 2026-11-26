import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import "./sauce-drip.css";

export default function SauceDrip({
  color,
  enabled,
  outlet,
  outletY = 1,
  photoRef,
  width = 0.04,
}: {
  color: string;
  enabled: boolean;
  outlet: number;
  outletY?: number;
  photoRef: RefObject<HTMLImageElement | null>;
  width?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = ref.current;
    const photo = photoRef.current;
    if (
      !scene ||
      !photo ||
      !enabled ||
      typeof IntersectionObserver === "undefined" ||
      typeof ResizeObserver === "undefined"
    ) return;

    let inView = false;
    let photoReady = false;
    const updatePlayback = () => {
      scene.dataset.ready = String(photoReady);
      scene.dataset.running = String(photoReady && inView && !document.hidden);
    };
    const alignOutlet = () => {
      if (!photo.naturalWidth || !photo.naturalHeight) {
        photoReady = false;
        updatePlayback();
        return;
      }

      // Match the right- and bottom-aligned contained photograph, not its box.
      const renderedWidth = Math.min(
        photo.clientWidth,
        (photo.clientHeight * photo.naturalWidth) / photo.naturalHeight,
      );
      const border = photo.offsetParent?.clientLeft ?? 0;
      const start = border + photo.offsetLeft + photo.clientWidth - renderedWidth;
      scene.style.setProperty("--drip-outlet", `${start + renderedWidth * outlet}px`);
      scene.style.setProperty("--drip-width", `${Math.max(3, renderedWidth * width)}px`);
      const renderedHeight = (renderedWidth * photo.naturalHeight) / photo.naturalWidth;
      // Move the source puddle lip onto the card edge even if the cutout has
      // transparent padding beneath it. Only position changes; size stays stable.
      const edgeOffset = `${renderedHeight * (1 - outletY)}px`;
      if (photo.style.getPropertyValue("--photo-edge-offset") !== edgeOffset) {
        photo.style.setProperty("--photo-edge-offset", edgeOffset);
      }
      photoReady = renderedWidth > 0;
      updatePlayback();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.intersectionRatio >= 0.25;
        updatePlayback();
      },
      { threshold: 0.25 },
    );
    observer.observe(scene);
    const resizeObserver = new ResizeObserver(alignOutlet);
    resizeObserver.observe(photo);
    photo.addEventListener("load", alignOutlet);
    photo.addEventListener("error", alignOutlet);
    document.addEventListener("visibilitychange", updatePlayback);
    alignOutlet();
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      photo.removeEventListener("load", alignOutlet);
      photo.removeEventListener("error", alignOutlet);
      document.removeEventListener("visibilitychange", updatePlayback);
      delete scene.dataset.running;
      delete scene.dataset.ready;
      photo.style.removeProperty("--photo-edge-offset");
    };
  }, [enabled, outlet, outletY, photoRef, width]);

  return (
    <span
      ref={ref}
      className="sweeto-drip"
      aria-hidden="true"
      hidden={!enabled}
      style={{ "--drip-color": color } as CSSProperties}
    >
      <span className="sweeto-drip-lip" />
      <span className="sweeto-drip-sheen" />
      <span className="sweeto-drip-neck" />
      <span className="sweeto-drip-drop" />
      <span className="sweeto-drip-settle" />
    </span>
  );
}
