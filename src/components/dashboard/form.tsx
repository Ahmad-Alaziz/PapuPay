import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Text input with a visible label and an optional hint, all wired up for screen readers. */
export function Field({
  id,
  label,
  hint,
  className,
  ...input
}: { id: string; label: string; hint?: string } & ComponentProps<"input">) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-12 w-full rounded-2xl border border-border bg-white/70 px-4 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:border-leaf focus-visible:ring-3 focus-visible:ring-leaf/20"
        {...input}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  id,
  label,
  options,
  className,
  ...select
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
} & ComponentProps<"select">) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        className="h-12 w-full rounded-2xl border border-border bg-white/70 px-4 text-base outline-none focus-visible:border-leaf focus-visible:ring-3 focus-visible:ring-leaf/20"
        {...select}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Result of the last action, read from the URL after a redirect. */
export function Notice({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl px-4 py-3 text-sm leading-relaxed font-medium",
        tone === "success" ? "bg-secondary text-leaf" : "bg-destructive/10 text-destructive",
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("rounded-[2rem] border border-border bg-card p-6 sm:p-8", className)}>
      <h2 id={id} className="font-heading text-2xl font-bold tracking-[-0.02em]">
        {title}
      </h2>
      {description ? <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function PageHeading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <header className="mb-10">
      {eyebrow ? (
        <p className="text-sm font-bold tracking-[0.14em] text-papaya-ink uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="mt-3 font-heading text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-5xl">
        {title}
      </h1>
      {body ? <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{body}</p> : null}
    </header>
  );
}

/** Picks a known message for a ?notice= or ?error= value, ignoring anything else. */
export function pickMessage<T extends Record<string, string>>(messages: T, key: string | string[] | undefined) {
  return typeof key === "string" && Object.hasOwn(messages, key) ? messages[key as keyof T] : undefined;
}
