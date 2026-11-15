import { cn } from "@/lib/utils";

const MARK_ID = "papupay-mark";

/**
 * The papaya mark's artwork, defined once per page (rendered in the root layout)
 * and referenced by every `PapayaMark` with `<use>`, which keeps the DOM small.
 * `src/app/icon.svg` (the favicon) is the same papaya without the waves, which blur at 16px.
 */
export function PapayaMarkSymbol() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <symbol id={MARK_ID} viewBox="0 0 64 64">
        <path d="M44 10.4C46 4.4 52.2 1.5 59.6 2.6c-1.4 6.6-7.8 9.9-15.6 7.8Z" fill="var(--leaf)" />
        <path d="M43.6 10.2C38.4 9.4 35.2 5.6 35.9 1c5.1.6 8.4 4.5 7.7 9.2Z" fill="var(--leaf-soft)" />
        <g transform="rotate(28 32 34)">
          <path
            d="M32 5.5c6.5 0 11.6 9.6 15.4 19.6C53 39.6 48.6 60 32 60S11 39.6 16.6 25.1C20.4 15.1 25.5 5.5 32 5.5Z"
            fill="var(--papaya)"
          />
          <ellipse cx="32" cy="38.5" rx="10.6" ry="15.4" fill="var(--cream)" />
        </g>
        <g transform="rotate(28 30.3 38)" fill="none" stroke="var(--leaf)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M26.12 34.65a5 5 0 0 1 0 6.7" />
          <path d="M28.72 32.31a8.5 8.5 0 0 1 0 11.38" />
          <path d="M31.32 29.97a12 12 0 0 1 0 16.06" />
        </g>
      </symbol>
    </svg>
  );
}

type MarkProps = React.ComponentProps<"svg"> & { title?: string };

/** The papaya mark with NFC waves. Requires `PapayaMarkSymbol` on the page. */
export function PapayaMark({ className, title, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <use href={`#${MARK_ID}`} />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Use on dark backgrounds. */
  inverted?: boolean;
};

export function Logo({ className, inverted = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <PapayaMark className="size-9" />
      <span
        className={cn(
          "font-heading text-[1.65rem] leading-none font-extrabold tracking-[-0.04em]",
          inverted ? "text-cream" : "text-leaf",
        )}
      >
        papupay
      </span>
    </span>
  );
}
