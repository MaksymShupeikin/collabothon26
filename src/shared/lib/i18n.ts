import { useMemo, useSyncExternalStore } from "react";

/**
 * EN/DE without routing: English stays the source text everywhere, German is looked up.
 * - Components: `const t = useT()`, then `t("Buy", "Kaufen")` (inline pair) or `t(data.title)` (dictionary).
 * - Static data (chapters, news, events): German registered once with `dict({ en: de })`, rendered via `t(text)`.
 * - Text built at runtime outside React (only ever after hydration): `L("en", "de")` picks by the current language.
 * The language is a per-browser preference in localStorage, like the progress in game/store.ts.
 */
export type Lang = "en" | "de";
export type T = ((en: string, de?: string) => string) & { lang: Lang };

const DE: Record<string, string> = {};
const GERMAN = new Set<string>(); // text that is already German (built with L) passes through t() unchanged
export const dict = (pairs: Record<string, string>) => { Object.assign(DE, pairs); for (const g of Object.values(pairs)) GERMAN.add(g); };

const KEY = "cd-edu-lang"; // also read by the boot script in app/layout.tsx
let current: Lang = "en";
try { if (typeof window !== "undefined" && localStorage.getItem(KEY) === "de") current = "de"; } catch { /* private mode */ }

const missing = new Set<string>();
if (process.env.NODE_ENV !== "production") (globalThis as { i18nMissing?: Set<string> }).i18nMissing = missing; // dev: inspect in the console
function lookup(en: string) {
  const g = DE[en];
  if (g !== undefined) return g;
  if (GERMAN.has(en)) return en;
  if (process.env.NODE_ENV !== "production" && en && !missing.has(en)) { missing.add(en); console.warn(`[i18n] no German for: ${en}`); }
  return en;
}

export const lang = () => current;
/** Picks by the current language; for text built outside React. */
export const L = (en: string, de: string) => { GERMAN.add(de); return current === "de" ? de : en; };
/** Dictionary lookup in a given language. */
export const tr = (en: string, l: Lang = current) => (l === "de" ? lookup(en) : en);

const listeners = new Set<() => void>();
export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* private mode: this tab only */ }
  listeners.forEach((f) => f());
}
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

/** The server and the hydration pass render English; the stored language follows right after. */
export const useLang = () => useSyncExternalStore(subscribe, () => current, () => "en" as Lang);

export function useT(): T {
  const l = useLang();
  return useMemo(() => Object.assign((en: string, de?: string) => (l === "de" ? de ?? lookup(en) : en), { lang: l }), [l]);
}
