import { companyOf } from "../market/companies.ts";
import { newSim, round2, type Sim, type SimEvent } from "../market/engine.ts";
import "../market/scenarios.ts"; // registers all market universes
import { PERSONAS, type Answers, type PersonaId } from "./personas.ts";
import { dict } from "../../shared/lib/i18n.core.ts";

export type Tx = {
  id: number;
  day: number;
  account: "giro" | "verrechnung" | "depot";
  text: string;
  amount: number;
  qty?: number;
  sym?: string;
  price?: number;
};

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
  simpleChosen: boolean; // the learner went back from ProTrader to the simple area: don't offer the switch again
  allUnlocked: boolean; // demo switch on the learning map
  active: string | null; // chapter / mission currently running
  giro: number;
  sim: Sim;
  tx: Tx[];
  nextTx: number;
  invBest: { worth: number; stars: number } | null; // Investor Simulator personal best
};

export const freshSave = (persona: PersonaId | null = null): Save => ({
  v: 3,
  persona,
  answers: null,
  xp: 0,
  earned: [],
  cards: [],
  done: [],
  stars: {},
  understanding: 0,
  proUnlocked: false,
  proCelebrated: false,
  proTrader: false,
  simpleChosen: false,
  allUnlocked: false,
  active: null,
  giro: persona ? PERSONAS[persona].start : 0,
  sim: newSim("main", 0),
  tx: [],
  nextTx: 1,
  invBest: null,
});

export const EMPTY_SAVE: Save = freshSave();

export function normalizeSave(raw: unknown): Save | null {
  if (typeof raw !== "object" || raw === null || (raw as { v?: unknown }).v !== 3) return null;
  return { ...freshSave(), ...(raw as Partial<Save>), v: 3 };
}

export const RANKS: [number, string][] = [
  [0, "Saver"],
  [150, "Beginner"],
  [400, "Investor"],
  [800, "Strategist"],
  [1300, "Market Reader"],
];

dict({
  Saver: "Sparer",
  Beginner: "Einsteiger",
  Investor: "Anleger",
  Strategist: "Stratege",
  "Market Reader": "Marktkenner",
});

export function rankOf(xp: number) {
  const i = RANKS.findLastIndex(([min]) => xp >= min);
  const next = RANKS[i + 1];
  return {
    level: i + 1,
    name: RANKS[i][1],
    next: next?.[1],
    nextAt: next?.[0],
    progress: next ? (xp - RANKS[i][0]) / (next[0] - RANKS[i][0]) : 1,
  };
}

export const addTx = (s: Save, t: Omit<Tx, "id">): Save => ({
  ...s,
  tx: [{ ...t, id: s.nextTx }, ...s.tx],
  nextTx: s.nextTx + 1,
});

/** Logs fills from pending orders and savings plans as transactions. */
export function logSimEvents(s: Save, events: SimEvent[]): Save {
  for (const e of events) {
    if (e.kind === "fill") {
      const t = e.trade;
      const vol = round2(t.qty * t.price);
      s = addTx(s, {
        day: t.day,
        account: "depot",
        text: `${t.side === "buy" ? "Buy" : "Sell"} ${companyOf(t.sym).short}`,
        amount: t.side === "buy" ? -round2(vol + t.fee) : round2(vol - t.fee),
        qty: t.qty,
        sym: t.sym,
        price: t.price,
      });
    } else if (e.kind === "plan") {
      s = addTx(s, {
        day: e.day,
        account: "depot",
        text: `Buy ${companyOf(e.sym).short}`,
        amount: -round2(e.amount),
        qty: e.qty,
        sym: e.sym,
      });
    }
  }
  return s;
}
