"use client";
import { useSyncExternalStore } from "react";
import { companyOf } from "../market/companies.ts";
import { advance, deposit, newSim, placeOrder, priceNow, round2, withdraw, type OrderInput, type Sim, type SimEvent } from "../market/engine.ts";
import "../market/scenarios.ts"; // registers the universes
import { PERSONAS, type Answers, type PersonaId } from "./personas.ts";

// shortcut: progress lives in this browser's localStorage only; move to the comdirect profile when a backend exists.

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
};

const KEY = "cd-edu-v3";
const fresh = (persona: PersonaId | null = null): Save => ({
  v: 3, persona, answers: null, xp: 0, earned: [], cards: [], done: [], stars: {}, understanding: 0,
  proUnlocked: false, proCelebrated: false, proTrader: false, allUnlocked: false, active: null,
  giro: persona ? PERSONAS[persona].start : 0, sim: newSim("main", 0), tx: [], nextTx: 1,
});
const EMPTY = fresh();

let cache: Save | null = null;
const listeners = new Set<() => void>();

function read(): Save {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    cache = raw?.v === 3 ? { ...EMPTY, ...raw } : EMPTY;
  } catch { cache = EMPTY; }
  return cache!;
}
function write(s: Save) {
  cache = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: keep in memory */ }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const getSave = read;
/** Called after every save write (outside React render). */
export const onSave = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
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

  /** Girokonto → Verrechnungskonto (or back). */
  transfer(amount: number, toTrading = true): string | null {
    const s = read();
    amount = round2(amount);
    if (!(amount > 0)) return "Enter an amount above 0,00 €.";
    if (toTrading && amount > s.giro + 1e-9) return "Not enough money on the Girokonto.";
    if (!toTrading && amount > s.sim.acct.cash + 1e-9) return "Not enough money on the trading account.";
    const sim = toTrading ? deposit(s.sim, amount) : withdraw(s.sim, amount);
    let n: Save = { ...s, giro: round2(s.giro + (toTrading ? -amount : amount)), sim };
    n = addTx(n, { day: s.sim.day, account: "giro", text: toTrading ? "Transfer to Verrechnungskonto" : "Transfer from Verrechnungskonto", amount: toTrading ? -amount : amount });
    n = addTx(n, { day: s.sim.day, account: "verrechnung", text: toTrading ? "Transfer from Girokonto" : "Transfer to Girokonto", amount: toTrading ? amount : -amount });
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
  /** Fresh account for the Module 1 mission: money back on the Girokonto, nothing in the depot. */
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
