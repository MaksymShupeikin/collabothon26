"use client";
import { createContext, useContext, useState } from "react";

/**
 * Pro mode has two layouts on the same market:
 * - learner view (default): fewer widgets' worth of chrome, plain labels, every term explains itself;
 * - ProTrader view (unlocks after the World 2 mission): the 1:1 copy, with an "Explain" switch.
 */
type Tip = { text: string; x: number; y: number; above: boolean } | null;
type Ctx = { lv: boolean; explain: boolean; setTip: (t: Tip) => void };
export const ProView = createContext<Ctx>({ lv: false, explain: false, setTip: () => {} });
export const useProView = () => useContext(ProView);

/** 🆕 Plain-language glossary for every label a first-timer stumbles over. */
export const GLOSSARY = {
  "depot-value": "Depot value: what everything in your depot is worth at today's price.",
  available: "Available: cash on your trading account you can still spend. Money held back for open buy orders is already taken out.",
  intraday: "Intraday credit: a loan for trades opened and closed on the same day. A tool for experienced traders; in the sandbox it stays at 0.",
  total: "Total: cash plus depot value. Everything you have here.",
  "depot-number": "Depot number: the ID of your securities account, like an IBAN for stocks.",
  workspaces: "Workspaces: saved layouts of widgets. Switch between the depot overview and a single-stock focus.",
  widgets: "Widgets: the panels on this screen. Show or hide them here.",
  exchange: "Exchange: where your trade happens. Xetra is Germany's main exchange (9:00–17:30), Tradegate also trades in the evening (8:00–22:00).",
  last: "Last: the price of the most recent trade.",
  "diff-prev": "Diff. prev.: change since yesterday's closing price.",
  "purchase-value": "Purchase value: what you paid for the positions you hold now.",
  "diff-purchase": "Today's value minus what you paid. It only becomes a real profit or loss when you sell.",
  pnl: "Profit / loss: today's value minus what you paid. It only becomes real when you sell.",
  wkn: "WKN: the 6-character German ID of a security. Same company, no mix-ups.",
  weight: "Weight: how much of your whole account sits in this one position. A big weight means one company can move everything.",
  qty: "Quantity: how many shares. Always whole shares, except in a savings plan.",
  ask: "Ask: the price you pay when you buy. It sits a little above the bid; the gap is the spread.",
  bid: "Bid: the price you get when you sell.",
  "order-type": "Market buys or sells now at the best available price. Limit only at your price or better. Stop fires once the price crosses your level.",
  validity: "Validity: how long an order waits if it isn't executed.",
  fee: "Fee: what the bank charges per order. A fixed part makes small orders relatively expensive.",
  orderbook: "Orderbook: your orders and their status: open, executed or expired.",
  candles: "Each candle is one day: the body runs from open to close, green if it closed higher, red if lower. The thin lines are the day's high and low.",
  volume: "Volume: how many shares changed hands that day. Big moves usually come with big volume.",
  bollinger: "Bollinger bands: a band around the 20-day average. A wide band means big swings.",
  "savings-plan": "Savings plan: invests the same amount every month, automatically.",
  watchlist: "Watchlist: stocks you follow. Being on it doesn't mean you own them.",
  news: "News: simulated headlines. Most are noise; the big ones pause the time machine.",
} as const;
export type TermKey = keyof typeof GLOSSARY;

/** A label that explains itself on hover or focus, when explaining is on. */
export function Term({ k, children }: { k: TermKey; children: React.ReactNode }) {
  const { lv, explain, setTip } = useProView();
  if (!lv && !explain) return <>{children}</>;
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const above = r.bottom + 120 > window.innerHeight;
    setTip({ text: GLOSSARY[k], x: Math.max(8, Math.min(r.left, window.innerWidth - 288)), y: above ? r.top - 6 : r.bottom + 6, above });
  };
  return (
    <span className="term" tabIndex={0} aria-description={GLOSSARY[k]}
      onMouseEnter={(e) => show(e.currentTarget)} onFocus={(e) => show(e.currentTarget)}
      onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      {children}
    </span>
  );
}

/** Wraps the workspace: provides the view and renders the one floating tooltip. */
export function ProViewProvider({ lv, explain, children }: { lv: boolean; explain: boolean; children: React.ReactNode }) {
  const [tip, setTip] = useState<Tip>(null);
  return (
    <ProView.Provider value={{ lv, explain, setTip }}>
      {children}
      {tip && (
        <div className={`term-tip ${tip.above ? "above" : ""}`} role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>
      )}
    </ProView.Provider>
  );
}
