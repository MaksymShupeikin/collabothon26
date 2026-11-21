// Persona names and numbers are placeholders (idea.md §3).
import { dict } from "../../shared/lib/i18n.ts";

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

dict({
  Starter: "Starter", Builder: "Vermögensaufbauer", "Pre-retiree": "Ruhestandsplaner",
  "Lena, 22, student": "Lena, 22, Studentin", "The Kaya family, 34": "Familie Kaya, 34", "Helga, 58": "Helga, 58",
  "First steps with small amounts": "Erste Schritte mit kleinen Beträgen",
  "Save for the kids and a home": "Sparen für die Kinder und ein Zuhause",
  "Make savings work before retirement": "Erspartes vor der Rente arbeiten lassen",
  "10+ years": "10+ Jahre", "About 15 years": "Etwa 15 Jahre", "About 7 years": "Etwa 7 Jahre",
  "Move your 100 € from the current account to your trading account and buy any stock you like with a limit order. Make sure it fits your budget, fees included.":
    "Überweise deine 100 € vom Girokonto auf dein Verrechnungskonto und kaufe eine Aktie deiner Wahl mit einer Limit-Order. Achte darauf, dass sie inklusive Gebühren in dein Budget passt.",
  "Move 200 € from the current account to your trading account and buy any stock or ETF you like with a limit order. Make sure it fits your budget, fees included.":
    "Überweise 200 € vom Girokonto auf dein Verrechnungskonto und kaufe eine Aktie oder einen ETF deiner Wahl mit einer Limit-Order. Achte darauf, dass es inklusive Gebühren in dein Budget passt.",
  "Move 400 € from the current account to your trading account and buy a first position of your choice, a stock or an ETF, with a limit order. Make sure it fits your budget, fees included.":
    "Überweise 400 € vom Girokonto auf dein Verrechnungskonto und kaufe eine erste Position deiner Wahl, eine Aktie oder einen ETF, mit einer Limit-Order. Achte darauf, dass sie inklusive Gebühren in dein Budget passt.",
  "Start on the overview: \"Transfer\" next to the current account. Then use the search to find a company you know.":
    "Starte in der Übersicht: „Überweisung“ neben dem Girokonto. Dann suchst du über die Suche ein Unternehmen, das du kennst.",
  "Start on the overview: \"Transfer\" next to the current account. Then use the search to find a company or ETF you know.":
    "Starte in der Übersicht: „Überweisung“ neben dem Girokonto. Dann suchst du über die Suche ein Unternehmen oder einen ETF, den du kennst.",
  "Start on the overview: \"Transfer\" next to the current account. Then use the search by name, WKN or ISIN.":
    "Starte in der Übersicht: „Überweisung“ neben dem Girokonto. Dann nutzt du die Suche nach Name, WKN oder ISIN.",
});
