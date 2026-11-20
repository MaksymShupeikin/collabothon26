// History Mode rounds: real events, paraphrased headlines, rounded outcomes. Verify numbers before a public demo.
export type Direction = "up" | "down" | "flat";
export type HistoryRound = {
  id: string; asset: string; question: string;
  headlines: { text: string; relevant: boolean }[];
  answer: Direction; reveal: string; outcome: string; lesson: string; concept: string;
};

export const HISTORY: HistoryRound[] = [
  {
    id: "covid", asset: "DAX", question: "What does the DAX do over the next 4 weeks?",
    headlines: [
      { text: "Bundesliga: Bayern wins 4–0 at home", relevant: false },
      { text: "Northern Italy locks down towns as virus cases jump", relevant: true },
      { text: "Carnival season ends in Cologne", relevant: false },
      { text: "Airlines cancel thousands of flights", relevant: true },
      { text: "New smartphone launch rumored for spring", relevant: false },
    ],
    answer: "down", reveal: "February 2020 — COVID-19",
    outcome: "The DAX fell about 39% from its February high to mid-March 2020 — then recovered strongly within months.",
    lesson: "Real shocks hit the whole market. Those who panic-sold at the bottom missed the recovery.", concept: "drawdown",
  },
  {
    id: "wirecard", asset: "Wirecard", question: "What does Wirecard stock do over the next week?",
    headlines: [
      { text: "Auditor refuses to sign Wirecard annual report; €1.9bn cannot be located", relevant: true },
      { text: "Frankfurt summer festival draws record crowds", relevant: false },
      { text: "Wirecard CEO says company is 'victim of fraud'", relevant: true },
      { text: "Analyst: payments sector 'remains promising'", relevant: false },
    ],
    answer: "down", reveal: "June 2020 — Wirecard scandal",
    outcome: "Wirecard fell more than 90% within days and filed for insolvency. A DAX company went to almost zero.",
    lesson: "Any single company can collapse. Diversification is what protects you.", concept: "diversification",
  },
  {
    id: "vaccine", asset: "Global stocks (travel & airlines)", question: "What do travel and airline stocks do that day?",
    headlines: [
      { text: "Pfizer and BioNTech: vaccine more than 90% effective in trial", relevant: true },
      { text: "Second lockdown measures extended in parts of Europe", relevant: false },
      { text: "Tech CEO interview: 'remote work is here to stay'", relevant: false },
    ],
    answer: "up", reveal: "9 November 2020 — first vaccine results",
    outcome: "Markets jumped worldwide; travel and airline stocks soared the same day.",
    lesson: "Real, surprising news moves prices instantly — before most people can react.", concept: "priced-in",
  },
  {
    id: "lehman", asset: "S&P 500", question: "What does the S&P 500 do that day and the following months?",
    headlines: [
      { text: "Lehman Brothers files for bankruptcy", relevant: true },
      { text: "Merrill Lynch agrees to be sold to Bank of America", relevant: true },
      { text: "Hurricane season: storm weakens off the coast", relevant: false },
    ],
    answer: "down", reveal: "September 2008 — financial crisis",
    outcome: "The S&P 500 fell about 4.7% that day and kept falling for months as the crisis spread.",
    lesson: "Banks are connected — trouble at one can spread through the whole system (correlation).", concept: "correlation",
  },
  {
    id: "nvidia", asset: "NVIDIA", question: "What does NVIDIA stock do the next day?",
    headlines: [
      { text: "NVIDIA forecasts quarterly revenue around $11bn — analysts expected about $7bn", relevant: true },
      { text: "NVIDIA CEO speaks about AI at a conference", relevant: false },
      { text: "Gaming console sales slow ahead of summer", relevant: false },
    ],
    answer: "up", reveal: "May 2023 — AI boom",
    outcome: "NVIDIA rose about 24% the next day.",
    lesson: "What matters is the surprise versus expectations, not the headline number.", concept: "earnings",
  },
  {
    id: "netflix", asset: "Netflix", question: "What does Netflix stock do the next day?",
    headlines: [
      { text: "Netflix reports first subscriber loss in a decade", relevant: true },
      { text: "Netflix announces new season of popular series", relevant: false },
      { text: "Streaming competitor launches ad-supported plan", relevant: false },
    ],
    answer: "down", reveal: "April 2022 — Netflix subscriber loss",
    outcome: "Netflix fell about 35% in one day.",
    lesson: "When growth expectations break, even a famous stock can fall hard. Expectations drive prices.", concept: "earnings",
  },
];
