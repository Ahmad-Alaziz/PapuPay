"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PapayaMark } from "@/components/brand/logo";
import { sectionIds } from "@/lib/site";
import type { Dictionary } from "@/i18n/dictionaries";

export function DemoDialog({ copy }: { copy: Dictionary["demo"] }) {
  const [open, setOpen] = useState(false);
  const goToContact = useRef(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xl" className="focus-visible:outline-cream">
          <Play data-icon="inline-start" aria-hidden="true" className="fill-current" />
          {copy.button}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="rounded-[2rem] bg-cream p-7 sm:max-w-md"
        closeLabel={copy.dialogClose}
        onCloseAutoFocus={(event) => {
          if (!goToContact.current) return;
          // Skip returning focus to the trigger; move the user to the contact form instead.
          goToContact.current = false;
          event.preventDefault();
          const section = document.getElementById(sectionIds.contact);
          section?.scrollIntoView({ block: "start" });
          section?.querySelector<HTMLElement>("input:not([tabindex='-1']), textarea")?.focus({ preventScroll: true });
          history.replaceState(null, "", `#${sectionIds.contact}`);
        }}
      >
        <DialogHeader className="items-start gap-4">
          <PapayaMark className="size-14" />
          <DialogTitle className="text-2xl leading-tight font-bold text-leaf">{copy.dialogTitle}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-muted-foreground">
            {copy.dialogBody}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0 pt-2">
          <DialogClose asChild>
            <Button variant="outline" size="lg">
              {copy.dialogClose}
            </Button>
          </DialogClose>
          <Button asChild size="lg">
            <a
              href={`#${sectionIds.contact}`}
              onClick={(event) => {
                event.preventDefault();
                goToContact.current = true;
                setOpen(false);
              }}
            >
              {copy.dialogCta}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
