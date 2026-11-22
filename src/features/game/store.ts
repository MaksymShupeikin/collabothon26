"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { companyOf } from "../market/companies.ts";
import { advance, deposit, newSim, placeOrder, priceNow, round2, withdraw, type OrderInput, type Sim, type SimEvent } from "../market/engine.ts";
import "../market/scenarios.ts"; // registers the universes
import { PERSONAS, type Answers, type PersonaId } from "./personas.ts";
import { dict } from "../../shared/lib/i18n.ts";

// Progress lives on the server (/api/save, Postgres), keyed by an anonymous browser cookie.

export type Tx = { id: number; day: number; account: "giro" | "verrechnung" | "depot"; text: string; amount: number; qty?: number; sym?: string; price?: number };
export type Save = {
  v: 3;
  persona: PersonaId | null;
  answers: Answers | null;
  xp: number;
  earned: string[]; // one-time XP keys (tour steps, answers), so replays never farm XP
  cards: string[];
  done: string[]; // finished chapters, missions and bosses
  stars: Record<string, number>;
  understanding: number; // right concept answers (Spot the habit, card quizzes)
  proUnlocked: boolean;
  proCelebrated: boolean;
  proTrader: boolean; // the learner confirmed the switch from the simple trading area to ProTrader (offered after the Module 2 mission)
  allUnlocked: boolean; // demo switch on the learning map
  active: string | null; // chapter / mission currently running
  giro: number;
  sim: Sim;
  tx: Tx[];
  nextTx: number;
  invBest: { worth: number; stars: number } | null; // Investor Simulator personal best
};

const LEGACY_KEY = "cd-edu-v3", LEGACY_BEST = "cd-edu-invsim-best";
const fresh = (persona: PersonaId | null = null): Save => ({
  v: 3, persona, answers: null, xp: 0, earned: [], cards: [], done: [], stars: {}, understanding: 0,
  proUnlocked: false, proCelebrated: false, proTrader: false, allUnlocked: false, active: null,
  giro: persona ? PERSONAS[persona].start : 0, sim: newSim("main", 0), tx: [], nextTx: 1, invBest: null,
});
const EMPTY = fresh();

let cache: Save = EMPTY;
let loaded = false;
let synced = false; // only after a good load do writes go to the server, so a failed load never overwrites real progress
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const savers = new Set<(prev: Save, next: Save) => void>();

function read(): Save { return cache; }
function write(s: Save) {
  const prev = cache;
  cache = s;
  listeners.forEach((l) => l());
  savers.forEach((l) => l(prev, s));
  if (synced) { clearTimeout(timer); timer = setTimeout(push, 800); }
}
function push(keepalive = false) {
  clearTimeout(timer);
  timer = undefined;
  return fetch("/api/save", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(cache), keepalive })
    .then((r) => r.ok, () => false);
}

/** Progress from before the server existed (this browser's localStorage), uploaded once. */
function legacy(): Save | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "null");
    return raw?.v === 3 ? { ...EMPTY, ...raw, invBest: JSON.parse(localStorage.getItem(LEGACY_BEST) ?? "null") } : null;
  } catch { return null; }
}

if (typeof window !== "undefined") {
  fetch("/api/save")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(({ save }: { save: Save | null }) => {
      synced = true;
      const old = legacy();
      if (save?.v === 3) cache = { ...EMPTY, ...save };
      else if (old) {
        cache = old;
        push().then((ok) => { if (ok) { localStorage.removeItem(LEGACY_KEY); localStorage.removeItem(LEGACY_BEST); } });
      } else if (cache !== EMPTY) push(); // onboarding finished before the load came back
    })
    .catch((e) => console.warn("Progress server unreachable; this session will not be saved.", e))
    .finally(() => { loaded = true; listeners.forEach((l) => l()); });
  // Flush the pending write when the tab goes away.
  addEventListener("pagehide", () => { if (timer) push(true); });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const getSave = read;
/** Called after every save write (outside React render), with the save before and after. Not called for the initial load. */
export const onSave = (l: (prev: Save, next: Save) => void) => { savers.add(l); return () => { savers.delete(l); }; };
/** True once the save has arrived from the server (or failed to). */
export const useLoaded = () => useSyncExternalStore(subscribe, () => loaded, () => false);
/** Renders its children only once the save is loaded, so nothing reads or writes the empty placeholder. */
export const SaveGate = ({ children }: { children: ReactNode }) => (useLoaded() ? children : null);
export const update = (fn: (s: Save) => Save) => write(fn(read()));

// ── Ranks ─────────────────────────────────────────────────────────────────

export const RANKS: [number, string][] = [[0, "Saver"], [150, "Beginner"], [400, "Investor"], [800, "Strategist"], [1300, "Market Reader"]];
export function rankOf(xp: number) {
  const i = RANKS.findLastIndex(([min]) => xp >= min);
  const next = RANKS[i + 1];
  return { level: i + 1, name: RANKS[i][1], next: next?.[1], nextAt: next?.[0], progress: next ? (xp - RANKS[i][0]) / (next[0] - RANKS[i][0]) : 1 };
}

// ── Actions ───────────────────────────────────────────────────────────────

const addTx = (s: Save, t: Omit<Tx, "id">): Save => ({ ...s, tx: [{ ...t, id: s.nextTx }, ...s.tx], nextTx: s.nextTx + 1 });

/** Logs fills from pending orders and savings plans as transactions. */
function logEvents(s: Save, events: SimEvent[]): Save {
  for (const e of events) {
    if (e.kind === "fill") {
      const t = e.trade;
      const vol = round2(t.qty * t.price);
      s = addTx(s, { day: t.day, account: "depot", text: `${t.side === "buy" ? "Buy" : "Sell"} ${companyOf(t.sym).short}`, amount: t.side === "buy" ? -round2(vol + t.fee) : round2(vol - t.fee), qty: t.qty, sym: t.sym, price: t.price });
    }
  }
  return s;
}

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
    const s = fresh(persona);
    write({ ...s, answers, ...(skipW1 ? { proUnlocked: true, proCelebrated: true, done: ["1.1", "1.2", "1.3", "1.4", "1.5", "w1"] } : {}) });
  },
  unlockPro() { update((s) => ({ ...s, proUnlocked: true })); },
  celebratePro() { update((s) => ({ ...s, proCelebrated: true })); },
  /** The learner acknowledged the move from the simple trading area to ProTrader. */
  switchToProTrader() { update((s) => ({ ...s, proTrader: true })); },
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
    write(logEvents({ ...s, sim }, events));
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
