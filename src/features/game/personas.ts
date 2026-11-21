// Persona names and numbers are placeholders (idea.md §3).
export type PersonaId = "starter" | "builder" | "retiree";
export type Persona = {
  id: PersonaId;
  label: string;
  who: string;
  name: string; // for greetings in the sandbox ("Guten Tag" equivalent)
  goal: string;
  horizon: string;
  start: number; // play money on the current account
  plan: number; // €/month savings plan in Module 4
  focus: string;
  w1: { text: string; hint: string }; // Module 1 mission: the user picks the stock, we never prescribe one
};

export const PERSONAS: Record<PersonaId, Persona> = {
  starter: {
    id: "starter", label: "Starter", who: "Lena, 22, student", name: "Lena", goal: "First steps with small amounts", horizon: "10+ years",
    start: 100, plan: 25, focus: "Small savings plan, compound interest, not chasing hype",
    w1: { text: "Move your 100 € from the current account to your trading account and buy any stock you like with a limit order. Make sure it fits your budget, fees included.",
      hint: "Start on the overview: \"Transfer\" next to the current account. Then use the search to find a company you know." },
  },
  builder: {
    id: "builder", label: "Builder", who: "The Kaya family, 34", name: "Kaya", goal: "Save for the kids and a home", horizon: "About 15 years",
    start: 500, plan: 50, focus: "Diversification, ETFs, staying calm in a crash",
    w1: { text: "Move 200 € from the current account to your trading account and buy any stock or ETF you like with a limit order. Make sure it fits your budget, fees included.",
      hint: "Start on the overview: \"Transfer\" next to the current account. Then use the search to find a company or ETF you know." },
  },
  retiree: {
    id: "retiree", label: "Pre-retiree", who: "Helga, 58", name: "Helga", goal: "Make savings work before retirement", horizon: "About 7 years",
    start: 1000, plan: 100, focus: "Horizon and risk, drawdown, why \"cheap\" isn't \"safe\"",
    w1: { text: "Move 400 € from the current account to your trading account and buy a first position of your choice, a stock or an ETF, with a limit order. Make sure it fits your budget, fees included.",
      hint: "Start on the overview: \"Transfer\" next to the current account. Then use the search by name, WKN or ISIN." },
  },
};

export type Answers = { goal: 0 | 1 | 2; horizon: 0 | 1 | 2; experience: 0 | 1 | 2 };

/** The goal picks the persona; a short horizon with a big goal leans towards the more careful persona. */
export function personaFor(a: Answers): PersonaId {
  if (a.goal === 2) return "retiree";
  if (a.goal === 1) return a.horizon === 0 ? "retiree" : "builder";
  return "starter";
}
