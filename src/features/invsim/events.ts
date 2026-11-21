import { addJoy, COLLAPSE, CRASH, DIP, gain, income, move, pay, shock, START_AGE, type Game, type Tone } from "./engine.ts";
import { L } from "../../shared/lib/i18n.ts";
import "./events.de.ts";

// Static texts are English and translated where they render; functions that build numbers into text return the current language (they only run after a click).

/**
 * What happens in a year. Every event teaches one thing; choices show their effect right away,
 * the long-run effect shows up in the net worth and on the final screen.
 */
export type Choice = { id: string; label: string; hint: string; tone: Tone; apply: (g: Game) => Game; note: string | ((g: Game) => string) };
export type EventDef = {
  id: string;
  title: string | ((g: Game) => string);
  body: (g: Game) => string;
  icon: string; // Icon name
  tone: Tone;
  concept?: string; // concept card id
  onShow?: (g: Game) => Game; // happens before any choice (the crash itself, a bill)
  note?: (g: Game) => string; // what it did, for events without a choice
  choices?: Choice[];
};

const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
const invested = (g: Game) => g.wallet.etf + g.wallet.stock;

const crashLike = (kind: "crash" | "dip"): Choice[] => [
  { id: "sell", label: "Sell everything", hint: "Move ETF and stocks to the cushion before it gets worse", tone: "bad",
    apply: (g) => { const s = move(move(g, "etf", "cushion", 1), "stock", "cushion", 1); return { ...s, flags: { ...s.flags, soldCrash: kind === "crash" || s.flags.soldCrash } }; },
    note: "You sold near the bottom. The loss is now real, and you're out when the market recovers." },
  { id: "hold", label: "Hold and keep paying in", hint: "Don't look at the depot for a while", tone: "good",
    apply: (g) => g, note: "Hard to watch, but nothing is lost until you sell. Your yearly money now buys at a discount." },
  { id: "buy", label: "Buy more with half the cushion", hint: "Shares are on sale", tone: "good",
    apply: (g) => move(g, "cushion", "etf", 0.5), note: "Brave: you bought at a discount. Just make sure the cushion still covers a broken car." },
];

const raise = (amount: number): Choice[] => [
  { id: "save", label: "Save the raise", hint: L(`+${eur(amount)} a year to split`, `+${eur(amount)} pro Jahr zum Aufteilen`), tone: "good",
    apply: (g) => addJoy({ ...g, extra: g.extra + amount }, 3), note: "Same lifestyle, more money working. That gap compounds for decades." },
  { id: "spend", label: "Upgrade my lifestyle", hint: L(`Nicer flat, nicer car: +${eur(amount * 0.25)} a year to split`, `Schönere Wohnung, schöneres Auto: +${eur(amount * 0.25)} pro Jahr zum Aufteilen`), tone: "neutral",
    apply: (g) => addJoy({ ...g, extra: g.extra + amount * 0.25 }, 12), note: "Life feels better. Most of the raise is gone each month, though, and lifestyle rarely shrinks back." },
];

export const EVENTS: Record<string, EventDef> = {
  "first-pay": {
    id: "first-pay", title: "Your first real salary", icon: "you", tone: "neutral",
    body: (g) => L(`After rent and groceries, ${eur(income(g))} a year are yours to plan. You also have ${eur(g.wallet.cushion)} on the side. Split this year's money on the right, then start the year.`, `Nach Miete und Einkäufen kannst du ${eur(income(g))} pro Jahr verplanen. Außerdem hast du ${eur(g.wallet.cushion)} zur Seite gelegt. Teil das Geld dieses Jahres rechts auf und starte dann das Jahr.`),
    note: () => "Tip: a cushion of a few months' costs keeps a broken car from forcing you to sell investments at a bad moment.",
  },
  crash: {
    id: "crash", title: "Crash: markets −34 %", icon: "chart", tone: "bad", concept: "volatility",
    body: (g) => L(`A banking crisis. Your ETF fell by a third in a few weeks${g.wallet.stock > 0 ? ", your single stocks by half" : ""}. Every headline says it's getting worse.`, `Eine Bankenkrise. Dein ETF fiel in wenigen Wochen um ein Drittel${g.wallet.stock > 0 ? ", deine Einzelaktien um die Hälfte" : ""}. Jede Schlagzeile sagt, es wird schlimmer.`),
    onShow: (g) => shock(g, CRASH.etf, CRASH.stock),
    choices: crashLike("crash"),
  },
  rebound: {
    id: "rebound", title: "Markets bounce back", icon: "sprout", tone: "good", concept: "volatility",
    body: (g) => g.flags.soldCrash
      ? "Prices rise fast, while you sit in cash. Selling in the crash means you miss the rebound unless you buy back in."
      : "The panic is over and prices climb fast. Whoever held on gets most of the loss back this year.",
    choices: [
      { id: "back", label: "Move half the cushion into the ETF", hint: "Get back in", tone: "good", apply: (g) => move(g, "cushion", "etf", 0.5), note: "Back in the market. Time in the market beats timing it." },
      { id: "wait", label: "Wait for a better moment", hint: "Maybe it drops again", tone: "neutral", apply: (g) => g, note: "Waiting feels safe, but the best days often come right after the worst ones." },
    ],
  },
  dip: {
    id: "dip", title: "Correction: markets −18 %", icon: "chart", tone: "bad", concept: "volatility",
    body: () => "Not a crisis, just a nasty year. Prices fell almost a fifth. You've seen this before.",
    onShow: (g) => shock(g, DIP.etf, DIP.stock),
    choices: crashLike("dip"),
  },
  hype: {
    id: "hype", title: "The stock everyone talks about", icon: "max", tone: "neutral", concept: "rumor",
    body: () => "A colleague's chip stock tripled this year. “It's going to the moon,” he says at lunch, every day.",
    choices: [
      { id: "all", label: "Move half my ETF into it", hint: "Big bet", tone: "bad", apply: (g) => move(g, "etf", "stock", 0.5), note: "Now one company decides a big part of your future. Exciting, until it isn't." },
      { id: "small", label: "A small bet: 1.000 €", hint: "From the cushion", tone: "neutral", apply: (g) => gain(pay(g, 1000, false), "stock", 1000, false), note: "A small bet you can afford to lose. That's the right size for a hype." },
      { id: "pass", label: "Pass", hint: "Stick to the plan", tone: "good", apply: (g) => g, note: "Hype is news everyone already knows. By the time it's lunch talk, it's priced in." },
    ],
  },
  collapse: {
    id: "collapse", title: "The hype stock collapses", icon: "paula", tone: "bad", concept: "diversification",
    body: (g) => g.wallet.stock > 0
      ? L(`Accounting fraud. The share loses ${Math.round(COLLAPSE * 100)} % in a week. Your single stocks drop from ${eur(g.wallet.stock / (1 - COLLAPSE))} to ${eur(g.wallet.stock)}.`, `Bilanzbetrug. Die Aktie verliert in einer Woche ${Math.round(COLLAPSE * 100)} %. Deine Einzelaktien fallen von ${eur(g.wallet.stock / (1 - COLLAPSE))} auf ${eur(g.wallet.stock)}.`)
      : L(`Accounting fraud. The share loses ${Math.round(COLLAPSE * 100)} % in a week. You don't own single stocks, so it's just a headline for you.`, `Bilanzbetrug. Die Aktie verliert in einer Woche ${Math.round(COLLAPSE * 100)} %. Du hast keine Einzelaktien, für dich ist es nur eine Schlagzeile.`),
    onShow: (g) => shock(g, 0, COLLAPSE),
    note: (g) => g.wallet.stock > 0 ? "One company can go to almost zero. An ETF of 1.400 companies barely notices." : "One basket of hundreds of companies: a single fraud barely moves it.",
  },
  wedding: {
    id: "wedding", title: "You're getting married", icon: "you", tone: "good",
    body: () => "Congratulations! Now the hard question: how big?",
    choices: [
      { id: "big", label: "Big party: 15.000 €", hint: "Everyone's invited", tone: "neutral", apply: (g) => addJoy(pay(g, 15000), 20), note: "A day to remember. It came out of savings, so check what's left in the cushion." },
      { id: "small", label: "Small and lovely: 4.000 €", hint: "Family and best friends", tone: "good", apply: (g) => addJoy(pay(g, 4000), 14), note: "Almost as happy, and 11.000 € keep working for you." },
    ],
  },
  kids: {
    id: "kids", title: "A baby is on the way", icon: "you", tone: "good",
    body: () => "Nappies, a bigger flat, less sleep. Your yearly money to split drops by 1.500 €, for good.",
    onShow: (g) => addJoy({ ...g, extra: g.extra - 1500 }, 15),
    note: () => "Life changes the plan. A smaller amount every year still adds up, so keep the habit.",
  },
  promo: { id: "promo", title: "Promotion!", icon: "sprout", tone: "good", concept: "compound", body: () => "You're now senior. +2.000 € a year. What do you do with it?", choices: raise(2000) },
  promo2: { id: "promo2", title: "You lead the team now", icon: "sprout", tone: "good", concept: "compound", body: () => "Another step up: +2.500 € a year.", choices: raise(2500) },
  car: {
    id: "car", title: "The car breaks down", icon: "paula", tone: "bad",
    body: () => "Gearbox. The garage wants 3.500 €, and you need the car for work.",
    onShow: (g) => pay(g, 3500),
    note: (g) => g.alert ? "No cushion, no choice: bills don't wait for a good moment in the market." : "Paid from the cushion. That's exactly what it's for.",
  },
  job: {
    id: "job", title: "Laid off", icon: "paula", tone: "bad",
    body: () => "Your company restructures. Six months without a salary: you need 6.000 € to get by, and you save only half this year.",
    onShow: (g) => { const s = pay(g, 6000); return { ...s, flags: { ...s.flags, incomeFactor: 0.5 } }; },
    note: (g) => g.alert ? "Without a cushion, losing a job also means selling investments, often in a bad year." : "Six tight months, but the cushion carried you. Your investments stayed untouched.",
  },
  fee: {
    id: "fee", title: "A friendly advisor calls", icon: "hanna", tone: "neutral", concept: "fees",
    body: () => "He suggests swapping your ETF for an actively managed fund. “Our experts pick the winners.” It costs 1,8 % a year instead of 0,2 %.",
    choices: [
      { id: "switch", label: "Switch to the fund", hint: "Experts sound good", tone: "bad", apply: (g) => ({ ...g, flags: { ...g.flags, fund: true } }), note: "1,6 % more a year sounds small. Over 20 years it eats about a quarter of your gains." },
      { id: "stay", label: "Stay with the ETF", hint: "Low costs", tone: "good", apply: (g) => g, note: "Most active funds don't beat the market after fees. Low costs are a return you can count on." },
    ],
  },
  record: {
    id: "record", title: "Markets at an all-time high", icon: "max", tone: "neutral", concept: "signal-noise",
    body: () => "“Too late to buy?” asks every newspaper. Your brother-in-law is waiting for the crash.",
    choices: [
      { id: "stop", label: "Pause the ETF, wait for a crash", hint: "Its share goes to the cushion", tone: "bad", apply: (g) => ({ ...g, split: { ...g.split, cushion: g.split.cushion + g.split.etf, etf: 0 } }), note: "Your ETF share now goes to the cushion. Highs are normal: markets set new records most years. Change it back any time." },
      { id: "keep", label: "Keep going", hint: "Stick to the plan", tone: "good", apply: (g) => g, note: "A record high is noise, not a signal. Nobody can call the top." },
    ],
  },
  bonus: {
    id: "bonus", title: "Year-end bonus: 3.000 €", icon: "sprout", tone: "good",
    body: () => "A good year at work. The money is on your Girokonto.",
    choices: [
      { id: "invest", label: "Invest it in the ETF", hint: "Future you says thanks", tone: "good", apply: (g) => gain(g, "etf", 3000), note: "3.000 € at 30 years old can become 15.000 € or more by 60." },
      { id: "split", label: "Half fun, half ETF", hint: "Balance", tone: "good", apply: (g) => addJoy(gain(g, "etf", 1500), 6), note: "A treat and a habit. A balance you can keep for 30 years beats a plan you quit." },
      { id: "spend", label: "Treat myself", hint: "Weekend in Lisbon", tone: "neutral", apply: (g) => addJoy(g, 10), note: "Fun is part of the plan too. Just not every bonus." },
    ],
  },
  rate: {
    id: "rate", title: "Banks pay 3 % on savings again", icon: "sprout", tone: "good",
    body: () => "Interest rates are up. For the next four years, your cushion earns 3 % instead of 1,5 %.",
    onShow: (g) => ({ ...g, flags: { ...g.flags, highRateUntil: g.year + 3 } }),
    note: () => "Nice for the cushion. Still, over 20+ years, stocks have usually beaten savings accounts by a lot.",
  },
  inflation: {
    id: "inflation", title: "Inflation hits 7 %", icon: "paula", tone: "bad",
    body: () => "Prices jump: food, energy, rent. Money that just sits loses buying power.",
    choices: [
      { id: "shift", label: "Move half the cushion to the ETF", hint: "Companies can raise prices", tone: "neutral", apply: (g) => move(g, "cushion", "etf", 0.5), note: "Companies pass higher prices on, so shares tend to keep up with inflation over time. Keep enough cushion for emergencies." },
      { id: "keep", label: "Keep it safe", hint: "Cash is cash", tone: "neutral", apply: (g) => g, note: "Safe from swings, not from inflation. 10.000 € today buy about 5.500 € worth of things in 30 years at 2 %." },
    ],
  },
  sabbatical: {
    id: "sabbatical", title: "Six months of travelling?", icon: "you", tone: "neutral",
    body: () => "Your employer offers a sabbatical. You'd save only half this year.",
    choices: [
      { id: "go", label: "Go", hint: "South America", tone: "good", apply: (g) => addJoy({ ...g, flags: { ...g.flags, incomeFactor: 0.5 } }, 25), note: "Memories for life. One weaker year barely shows in a 30-year plan." },
      { id: "no", label: "Not now", hint: "Keep saving", tone: "neutral", apply: (g) => addJoy(g, -6), note: "More money, a little less life. Both count." },
    ],
  },
  rent: {
    id: "rent", title: "The rent goes up", icon: "paula", tone: "bad",
    body: () => "New landlord, new contract. 50 € more a month: 600 € a year less to split.",
    onShow: (g) => ({ ...g, extra: g.extra - 600 }), note: () => "Costs creep up. That's why the amount you save matters as much as the return.",
  },
  side: {
    id: "side", title: "Your side project pays off", icon: "sprout", tone: "good",
    body: () => "The weekend hobby earns money now: +900 € a year.",
    onShow: (g) => addJoy({ ...g, extra: g.extra + 900 }, 5), note: () => "More income is the strongest lever you have, early on even stronger than returns.",
  },
  inherit: {
    id: "inherit", title: "An inheritance: 20.000 €", icon: "sprout", tone: "neutral", concept: "savings-plan",
    body: () => "Your aunt left you 20.000 €. What do you do with it?",
    choices: [
      { id: "all", label: "Invest it all in the ETF", hint: "Time in the market", tone: "good", apply: (g) => gain(g, "etf", 20000), note: "Statistically the best move: money invested earlier has longer to grow." },
      { id: "trip", label: "Dream trip, invest the rest", hint: "8.000 € trip, 12.000 € ETF", tone: "good", apply: (g) => addJoy(gain(g, "etf", 12000), 15), note: "A balance you'll remember both ways." },
      { id: "cash", label: "Keep it in the cushion", hint: "Just in case", tone: "neutral", apply: (g) => gain(g, "cushion", 20000), note: "Very safe. Beyond a few months of costs, extra cushion mostly earns little." },
    ],
  },
  appliances: {
    id: "appliances", title: "Washing machine and laptop, same week", icon: "paula", tone: "bad",
    body: () => "Both die within days. 1.800 €.", onShow: (g) => pay(g, 1800),
    note: (g) => g.alert ? "Small bills hurt most when there's no cushion." : "Annoying, not a problem. Paid from the cushion.",
  },
  pension: {
    id: "pension", title: "Your pension letter arrives", icon: "hanna", tone: "neutral", concept: "compound",
    body: (g) => L(`The state pension estimate: about 1.400 € a month from ${START_AGE + 37}. Your depot today: ${eur(invested(g))}.`, `Die Renteninformation: etwa 1.400 € im Monat ab ${START_AGE + 37}. Dein Depot heute: ${eur(invested(g))}.`),
    note: () => "For most people the state pension alone won't cover the life they're used to. That gap is what this depot is for.",
  },
};

const QUIET = [
  "Nothing happened. Your money worked anyway.",
  "A boring year. In investing, boring is good.",
  "No news, no drama. The savings plan ran in the background.",
  "Work, holidays, birthdays. The depot did its thing.",
];
export const quietEvent = (g: Game): EventDef => ({ id: "quiet", title: "A quiet year", icon: "hourglass", tone: "neutral", concept: g.year > 12 ? "compound" : undefined, body: () => QUIET[g.year % QUIET.length] });

export const eventOf = (g: Game): EventDef => EVENTS[g.schedule[g.year]] ?? quietEvent(g);
const text = (t: string | ((g: Game) => string), g: Game) => (typeof t === "function" ? t(g) : t);

/** Start a year: the event happens; events without a choice resolve at once. */
export function begin(g: Game): Game {
  const ev = eventOf(g);
  let s: Game = { ...g, alert: null };
  if (ev.onShow) s = ev.onShow(s);
  if (!ev.choices) {
    const note = ev.note?.(s) ?? "";
    s = { ...s, note, log: [...s.log, { year: s.year, age: START_AGE + s.year, event: ev.id, title: text(ev.title, s), note, tone: ev.tone, concept: ev.concept }] };
  }
  return s;
}

export function choose(g: Game, id: string): Game {
  const ev = eventOf(g);
  const c = ev.choices?.find((x) => x.id === id);
  if (!c || g.picked) return g;
  let s = c.apply(g);
  const note = text(c.note, s);
  s = { ...s, picked: id, note, log: [...s.log, { year: s.year, age: START_AGE + s.year, event: ev.id, title: text(ev.title, s), choice: c.label, note, tone: c.tone, concept: ev.concept }] };
  return s;
}

export const titleOf = (g: Game) => text(eventOf(g).title, g);
