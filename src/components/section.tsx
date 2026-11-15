import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}

export function Section({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("py-16 sm:py-24", className)} {...props}>
      <Container>{children}</Container>
    </section>
  );
}

/** Small tilted label, borrowed from the tag chips in the style reference. */
export function Eyebrow({
  className,
  tone = "leaf",
  ...props
}: React.ComponentProps<"p"> & { tone?: "leaf" | "cream" }) {
  return (
    <p
      className={cn(
        "inline-block -rotate-2 rounded-md px-2.5 py-1 font-mono text-xs font-semibold tracking-wide uppercase",
        tone === "leaf" ? "bg-leaf text-cream" : "bg-cream text-leaf",
        className,
      )}
      {...props}
    />
  );
}

type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  align = "left",
  tone = "light",
  className,
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <Eyebrow tone={dark ? "cream" : "leaf"}>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className={cn(
          "mt-5 text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl",
          dark ? "text-cream" : "text-leaf",
        )}
      >
        {title}
      </h2>
      {intro ? (
        <p className={cn("mt-5 text-lg leading-relaxed", dark ? "text-cream/85" : "text-muted-foreground")}>
          {intro}
        </p>
      ) : null}
    </Reveal>
  );
}
