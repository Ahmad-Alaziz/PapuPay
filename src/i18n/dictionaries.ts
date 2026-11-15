import { en, type Dictionary } from "@/content/en";
import { pl } from "@/content/pl";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { en, pl };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
