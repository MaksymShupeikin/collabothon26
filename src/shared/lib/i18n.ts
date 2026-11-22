"use client";
import { useMemo, useSyncExternalStore } from "react";
import { dict, L, lang, lookup, setLang, subscribeLang, tr, type Lang, type T } from "./i18n.core.ts";

export { dict, L, lang, setLang, tr, type Lang, type T };

/** The server and the hydration pass render English; the stored language follows right after. */
export const useLang = () => useSyncExternalStore(subscribeLang, lang, () => "en" as Lang);

export function useT(): T {
  const l = useLang();
  return useMemo(() => Object.assign((en: string, de?: string) => (l === "de" ? de ?? lookup(en) : en), { lang: l }), [l]);
}
