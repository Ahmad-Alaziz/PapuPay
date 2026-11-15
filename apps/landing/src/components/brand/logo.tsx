import { cn } from "@/lib/utils";

const MARK_ID = "papupay-mark";

/**
 * The papaya mark's artwork, defined once per page (rendered in the root layout)
 * and referenced by every `PapayaMark` with `<use>`, which keeps the DOM small.
 * Mirrors `src/app/icon.svg`.
 */
export function PapayaMarkSymbol() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <symbol id={MARK_ID} viewBox="0 0 64 64">
        <path d="M44 10.4C46 4.4 52.2 1.5 59.6 2.6c-1.4 6.6-7.8 9.9-15.6 7.8Z" fill="var(--leaf)" />
        <g transform="rotate(28 32 34)">
          <path
            d="M32 5.5c6.5 0 11.6 9.6 15.4 19.6C53 39.6 48.6 60 32 60S11 39.6 16.6 25.1C20.4 15.1 25.5 5.5 32 5.5Z"
            fill="var(--papaya)"
          />
          <ellipse cx="32" cy="38.5" rx="10.6" ry="15.4" fill="var(--cream)" />
          <path
            fill="var(--leaf)"
            fillRule="evenodd"
            d="M32.6 27h6.4v6.4h-6.4V27Zm1.8 1.8v2.8h2.8v-2.8h-2.8ZM25 43.4h6.4v6.4H25v-6.4Zm1.8 1.8V48h2.8v-2.8h-2.8ZM25.6 29h3.2v3.2h-3.2zM29.6 35h3.2v3.2h-3.2zM35 37.2h3.2v3.2H35zM24.4 37h2.8v2.8h-2.8zM34 44h2.8v2.8H34z"
          />
        </g>
      </symbol>
    </svg>
  );
}

type MarkProps = React.ComponentProps<"svg"> & { title?: string };

/** The papaya mark with QR-code seeds. Requires `PapayaMarkSymbol` on the page. */
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
