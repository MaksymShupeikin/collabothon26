"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { companyOf } from "../market/companies.ts";
import { advance, deposit, newSim, placeOrder, priceNow, round2, withdraw, type OrderInput, type Sim } from "../market/engine.ts";
import "../market/scenarios.ts"; // registers the universes
import { PERSONAS, type Answers, type PersonaId } from "./personas.ts";
import {
  addTx,
  EMPTY_SAVE,
  freshSave,
  logSimEvents,
  RANKS,
  rankOf,
  type Save,
  type Tx,
} from "./save.ts";
import { dict } from "../../shared/lib/i18n.ts";

export { RANKS, rankOf, type Save, type Tx };

// Progress lives on the server (/api/save, a local JSON file), keyed by an anonymous browser cookie.

export type PlayerMeta = {
  playerId: string | null;
};

const LEGACY_KEY = "cd-edu-v3", LEGACY_BEST = "cd-edu-invsim-best";
const EMPTY = EMPTY_SAVE;
const EMPTY_META: PlayerMeta = { playerId: null };

let cache: Save = EMPTY;
let meta: PlayerMeta = EMPTY_META;
let loaded = false;
let synced = false; // only after a good load do writes go to the server, so a failed load never overwrites real progress
let timer: ReturnType<typeof setTimeout> | undefined;
let reloading = false;
const listeners = new Set<() => void>();
const savers = new Set<(prev: Save, next: Save) => void>();

function notify() {
  listeners.forEach((l) => l());
}
function read(): Save { return cache; }
function readMeta(): PlayerMeta { return meta; }

function write(s: Save) {
  const prev = cache;
  cache = s;
  notify();
  savers.forEach((l) => l(prev, s));
  if (synced) { clearTimeout(timer); timer = setTimeout(push, 800); }
}

function push(keepalive = false) {
  clearTimeout(timer);
  timer = undefined;
  return fetch("/api/save", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(cache), keepalive })
    .then((r) => r.ok, () => false);
}

/** Flush any pending local save immediately (useful before invoking an MCP action). */
export async function flushSave(): Promise<boolean> {
  if (!synced) return false;
  if (timer) return push();
  return true;
}

/** Reload latest state from /api/save so edits made by an external AI agent via MCP appear in the browser. */
export async function reloadFromServer(force = false): Promise<boolean> {
  if (typeof window === "undefined" || reloading) return false;
  if (timer && !force) return false;
  reloading = true;
  try {
    const r = await fetch("/api/save", { cache: "no-store" });
    if (!r.ok) return false;
    const body = (await r.json()) as { save: Save | null; playerId?: string };
    synced = true;
    const nextMeta: PlayerMeta = {
      playerId: body.playerId ?? meta.playerId,
    };
    const metaChanged = nextMeta.playerId !== meta.playerId;
    if (metaChanged) meta = nextMeta;

    let saveChanged = false;
    if (body.save?.v === 3) {
      const merged = { ...EMPTY, ...body.save };
      if (JSON.stringify(merged) !== JSON.stringify(cache)) {
        cache = merged;
        saveChanged = true;
      }
    }
    if (metaChanged || saveChanged) notify();
    return true;
  } catch {
    return false;
  } finally {
    reloading = false;
  }
}

/** Progress from before the server existed (this browser's localStorage), uploaded once. */
function legacy(): Save | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "null");
    return raw?.v === 3 ? { ...EMPTY, ...raw, invBest: JSON.parse(localStorage.getItem(LEGACY_BEST) ?? "null") } : null;
  } catch { return null; }
}

if (typeof window !== "undefined") {
  fetch("/api/save", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(({ save, playerId }: { save: Save | null; playerId?: string }) => {
      synced = true;
      meta = { playerId: playerId ?? null };
      const old = legacy();
      if (save?.v === 3) cache = { ...EMPTY, ...save };
      else if (old) {
        cache = old;
        push().then((ok) => { if (ok) { localStorage.removeItem(LEGACY_KEY); localStorage.removeItem(LEGACY_BEST); } });
      } else if (cache !== EMPTY) push(); // onboarding finished before the load came back
    })
    .catch((e) => console.warn("Progress server unreachable; this session will not be saved.", e))
    .finally(() => { loaded = true; notify(); });
  // Flush the pending write when the tab goes away.
  addEventListener("pagehide", () => { if (timer) push(true); });
  // Pick up external updates (e.g. an AI agent trading or advancing time via MCP) when returning to the tab.
  addEventListener("focus", () => { if (loaded && !timer) void reloadFromServer(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && loaded && !timer) void reloadFromServer();
  });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const getSave = read;
/** Called after every save write (outside React render), with the save before and after. Not called for the initial load. */
export const onSave = (l: (prev: Save, next: Save) => void) => { savers.add(l); return () => { savers.delete(l); }; };
/** True once the save has arrived from the server (or failed to). */
export const useLoaded = () => useSyncExternalStore(subscribe, () => loaded, () => false);
/** Current browser session UUID for MCP setup. */
export const usePlayerMeta = () => useSyncExternalStore(subscribe, readMeta, () => EMPTY_META);
/** Renders its children only once the save is loaded, so nothing reads or writes the empty placeholder. */
export const SaveGate = ({ children }: { children: ReactNode }) => (useLoaded() ? children : null);
export const update = (fn: (s: Save) => Save) => write(fn(read()));

// ── Actions ───────────────────────────────────────────────────────────────

export const actions = {
  award(key: string, xp: number) {
    const s = read();
    if (s.earned.includes(key)) return false;
    write({ ...s, xp: s.xp + xp, earned: [...s.earned, key] });
    return true;
  },
  understood(key: string, xp: number) {
    const s = read();
    if (s.earned.includes(key)) return;
    write({ ...s, xp: s.xp + xp, understanding: s.understanding + 1, earned: [...s.earned, key] });
  },
  collect(card: string) {
    const s = read();
    if (!s.cards.includes(card)) write({ ...s, cards: [...s.cards, card] });
  },
  finish(id: string, stars?: number) {
    const s = read();
    write({
      ...s,
      done: s.done.includes(id) ? s.done : [...s.done, id],
      stars: stars ? { ...s.stars, [id]: Math.max(stars, s.stars[id] ?? 0) } : s.stars,
    });
  },
  start(id: string | null) { update((s) => ({ ...s, active: id })); },
  setPersona(persona: PersonaId, answers: Answers | null, skipW1 = false) {
    const s = freshSave(persona);
    write({ ...s, answers, ...(skipW1 ? { proUnlocked: true, proCelebrated: true, done: ["1.1", "1.2", "1.3", "1.4", "1.5", "w1"] } : {}) });
  },
  unlockPro() { update((s) => ({ ...s, proUnlocked: true })); },
  celebratePro() { update((s) => ({ ...s, proCelebrated: true })); },
  /** The learner acknowledged the move from the simple trading area to ProTrader. */
  switchToProTrader() { update((s) => ({ ...s, proTrader: true, simpleChosen: false })); },
  switchToSimple() { update((s) => ({ ...s, proTrader: false, simpleChosen: true })); },
  setAllUnlocked(on: boolean) { update((s) => ({ ...s, allUnlocked: on, proUnlocked: s.proUnlocked || on })); },
  reset() { write(EMPTY); },
  setInvBest(b: Save["invBest"]) { update((s) => ({ ...s, invBest: b })); },

  /** Current account → Trading account (or back). */
  transfer(amount: number, toTrading = true): string | null {
    const s = read();
    amount = round2(amount);
    if (!(amount > 0)) return "Enter an amount above 0,00 €.";
    if (toTrading && amount > s.giro + 1e-9) return "Not enough money on the current account.";
    if (!toTrading && amount > s.sim.acct.cash + 1e-9) return "Not enough money on the trading account.";
    const sim = toTrading ? deposit(s.sim, amount) : withdraw(s.sim, amount);
    let n: Save = { ...s, giro: round2(s.giro + (toTrading ? -amount : amount)), sim };
    n = addTx(n, { day: s.sim.day, account: "giro", text: toTrading ? "Transfer to trading account" : "Transfer from trading account", amount: toTrading ? -amount : amount });
    n = addTx(n, { day: s.sim.day, account: "verrechnung", text: toTrading ? "Transfer from current account" : "Transfer to current account", amount: toTrading ? amount : -amount });
    write(n);
    return null;
  },
  addPlayMoney(amount: number) {
    const s = read();
    if (!(amount > 0)) return;
    write(addTx({ ...s, giro: round2(s.giro + amount) }, { day: s.sim.day, account: "giro", text: "Play money added (sandbox)", amount }));
  },
  order(o: OrderInput) {
    const s = read();
    const res = placeOrder(s.sim, o);
    if (res.error) return res;
    let n: Save = { ...s, sim: res.sim };
    if (res.filled) {
      const t = res.filled, vol = round2(t.qty * t.price);
      n = addTx(n, { day: t.day, account: "depot", text: `${t.side === "buy" ? "Buy" : "Sell"} ${companyOf(t.sym).short}`, amount: t.side === "buy" ? -round2(vol + t.fee) : round2(vol - t.fee), qty: t.qty, sym: t.sym, price: t.price });
    }
    write(n);
    return res;
  },
  setSim(sim: Sim) { update((s) => ({ ...s, sim })); },
  jump(days: number, stopAtMajor = false) {
    const s = read();
    const { sim, events } = advance(s.sim, days, { stopAtMajor });
    write(logSimEvents({ ...s, sim }, events));
    return events;
  },
  /** Fresh account for the Module 1 mission: money back on the current account, nothing in the portfolio. */
  resetSandbox() {
    const s = read();
    const p = s.persona ? PERSONAS[s.persona].start : 100;
    write({ ...s, giro: p, sim: { ...newSim("main", 0), day: s.sim.day, acct: { ...newSim("main", 0).acct, values: Array(s.sim.day + 1).fill(0), deposits: Array(s.sim.day + 1).fill(0) } }, tx: [] });
  },
};

export function useGame(): Save {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
/** ProTrader is offered once Module 2 is done (its mission), or with the demo switch. */
export const proTraderOffered = (s: Save) => s.allUnlocked || s.done.includes("w2");
export const pricedNow = (s: Save, sym: string) => priceNow(s.sim, sym);

dict({
  Saver: "Sparer", Beginner: "Einsteiger", Investor: "Anleger", Strategist: "Stratege", "Market Reader": "Marktkenner",
  "Enter an amount above 0,00 €.": "Bitte einen Betrag über 0,00 € eingeben.",
  "Not enough money on the current account.": "Nicht genug Geld auf dem Girokonto.",
  "Not enough money on the trading account.": "Nicht genug Geld auf dem Verrechnungskonto.",
  "Transfer to trading account": "Übertrag auf Verrechnungskonto",
  "Transfer from trading account": "Übertrag vom Verrechnungskonto",
  "Transfer from current account": "Übertrag vom Girokonto",
  "Transfer to current account": "Übertrag auf Girokonto",
  "Play money added (sandbox)": "Spielgeld eingezahlt (Sandbox)",
});
/** Booking texts are saved in English; "Buy SAP" / "Sell SAP" carry a company name. */
export const txText = (t: (en: string, de?: string) => string, text: string) => {
  const m = /^(Buy|Sell) (.+)$/.exec(text);
  return m ? t(text, `${m[1] === "Buy" ? "Kauf" : "Verkauf"} ${m[2]}`) : t(text);
};
