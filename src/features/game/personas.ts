import { ETF_SYM } from "../market/companies.ts";

// Persona names and numbers are placeholders (idea.md §3).
export type PersonaId = "starter" | "builder" | "retiree";
export type Persona = {
  id: PersonaId;
  label: string;
  who: string;
  name: string; // for greetings in the sandbox ("Guten Tag" equivalent)
  goal: string;
  horizon: string;
  start: number; // play money on the Girokonto
  plan: number; // €/month savings plan in Module 4
  focus: string;
  w1: { sym: string; qty: number; text: string; hint: string }; // Module 1 mission
};

export const PERSONAS: Record<PersonaId, Persona> = {
  starter: {
    id: "starter", label: "Starter", who: "Lena, 22, student", name: "Lena", goal: "First steps with small amounts", horizon: "10+ years",
    start: 100, plan: 25, focus: "Small savings plan, compound interest, not chasing hype",
    w1: { sym: "DTE", qty: 2, text: "Move your 100 € from the Girokonto to your trading account and buy 2 shares of Deutsche Telekom with a limit order.",
      hint: "Start on the overview: \"Transfer\" next to the Girokonto. Then search for Telekom." },
  },
  builder: {
    id: "builder", label: "Builder", who: "The Kaya family, 34", name: "Kaya", goal: "Save for the kids and a home", horizon: "About 15 years",
    start: 500, plan: 50, focus: "Diversification, ETFs, staying calm in a crash",
    w1: { sym: "DTE", qty: 5, text: "Move 200 € from the Girokonto to your trading account and buy 5 shares of Deutsche Telekom with a limit order.",
      hint: "Start on the overview: \"Transfer\" next to the Girokonto. Then search for Telekom." },
  },
  retiree: {
    id: "retiree", label: "Pre-retiree", who: "Helga, 58", name: "Helga", goal: "Make savings work before retirement", horizon: "About 7 years",
    start: 1000, plan: 100, focus: "Horizon and risk, drawdown, why \"cheap\" isn't \"safe\"",
    w1: { sym: ETF_SYM, qty: 3, text: "Move 400 € from the Girokonto to your trading account and buy a first ETF position of about 300 €: 3 shares of the MSCI World ETF, with a limit order.",
      hint: "Start on the overview: \"Transfer\" next to the Girokonto. Then search for \"MSCI World\" or WKN A0RPWH." },
  },
};

export type Answers = { goal: 0 | 1 | 2; horizon: 0 | 1 | 2; experience: 0 | 1 | 2 };

/** The goal picks the persona; a short horizon with a big goal leans towards the more careful persona. */
export function personaFor(a: Answers): PersonaId {
  if (a.goal === 2) return "retiree";
  if (a.goal === 1) return a.horizon === 0 ? "retiree" : "builder";
  return "starter";
}
