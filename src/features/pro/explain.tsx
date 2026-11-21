"use client";
import { createContext, useContext, useState } from "react";
import { dict, useT } from "@/shared/lib/i18n";

/**
 * Pro mode has two layouts on the same market:
 * - learner view (default): fewer widgets' worth of chrome, plain labels, every term explains itself;
 * - ProTrader view (unlocks after the Module 2 mission): the 1:1 copy, with an "Explain" switch.
 */
type Tip = { text: string; x: number; y: number; above: boolean } | null;
type Ctx = { lv: boolean; explain: boolean; setTip: (t: Tip) => void };
export const ProView = createContext<Ctx>({ lv: false, explain: false, setTip: () => {} });
export const useProView = () => useContext(ProView);

/** 🆕 Plain-language glossary for every label a first-timer stumbles over. */
export const GLOSSARY = {
  "depot-value": "Portfolio value: what everything in your portfolio is worth at today's price.",
  available: "Available: cash on your trading account you can still spend. Money held back for open buy orders is already taken out.",
  intraday: "Intraday credit: a loan for trades opened and closed on the same day. A tool for experienced traders; in the sandbox it stays at 0.",
  total: "Total: cash plus portfolio value. Everything you have here.",
  "depot-number": "Portfolio number: the ID of your securities account, like an IBAN for stocks.",
  workspaces: "Workspaces: saved layouts of widgets. Switch between the portfolio overview and a single-stock focus.",
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

dict({
  [GLOSSARY["depot-value"]]: "Depotwert: was alles in deinem Depot zum heutigen Kurs wert ist.",
  [GLOSSARY.available]: "Verfügbar: Guthaben auf deinem Verrechnungskonto, das du noch ausgeben kannst. Geld, das für offene Kauforders reserviert ist, ist schon abgezogen.",
  [GLOSSARY.intraday]: "Intraday-Kredit: ein Kredit für Trades, die am selben Tag eröffnet und geschlossen werden. Ein Werkzeug für erfahrene Trader; in der Sandbox bleibt er bei 0.",
  [GLOSSARY.total]: "Gesamt: Guthaben plus Depotwert. Alles, was du hier hast.",
  [GLOSSARY["depot-number"]]: "Depotnummer: die Kennung deines Wertpapierdepots, wie eine IBAN für Aktien.",
  [GLOSSARY.workspaces]: "Arbeitsbereiche: gespeicherte Anordnungen von Widgets. Wechsle zwischen Depotübersicht und Fokus auf einen Einzelwert.",
  [GLOSSARY.widgets]: "Widgets: die Fenster auf diesem Bildschirm. Hier blendest du sie ein oder aus.",
  [GLOSSARY.exchange]: "Handelsplatz: wo dein Trade stattfindet. Xetra ist Deutschlands wichtigste Börse (9:00–17:30), Tradegate handelt auch abends (8:00–22:00).",
  [GLOSSARY.last]: "Letzter: der Kurs des jüngsten Trades.",
  [GLOSSARY["diff-prev"]]: "Diff. Vortag: Veränderung seit dem Schlusskurs von gestern.",
  [GLOSSARY["purchase-value"]]: "Kaufwert: was du für die Positionen bezahlt hast, die du jetzt hältst.",
  [GLOSSARY["diff-purchase"]]: "Heutiger Wert minus dem, was du bezahlt hast. Ein echter Gewinn oder Verlust wird es erst, wenn du verkaufst.",
  [GLOSSARY.pnl]: "Gewinn / Verlust: heutiger Wert minus dem, was du bezahlt hast. Echt wird er erst, wenn du verkaufst.",
  [GLOSSARY.wkn]: "WKN: die 6-stellige deutsche Kennung eines Wertpapiers. Gleiches Unternehmen, keine Verwechslung.",
  [GLOSSARY.weight]: "Gewicht: wie viel deines gesamten Kontos in dieser einen Position steckt. Ein großes Gewicht heißt: Ein Unternehmen kann alles bewegen.",
  [GLOSSARY.qty]: "Stückzahl: wie viele Aktien. Immer ganze Stück, außer im Sparplan.",
  [GLOSSARY.ask]: "Brief: der Kurs, den du beim Kaufen zahlst. Er liegt etwas über dem Geldkurs; die Lücke ist der Spread.",
  [GLOSSARY.bid]: "Geld: der Kurs, den du beim Verkaufen bekommst.",
  [GLOSSARY["order-type"]]: "Market kauft oder verkauft sofort zum besten verfügbaren Kurs. Limit nur zu deinem Kurs oder besser. Stop wird ausgelöst, sobald der Kurs deine Marke kreuzt.",
  [GLOSSARY.validity]: "Gültigkeit: wie lange eine Order wartet, wenn sie nicht ausgeführt wird.",
  [GLOSSARY.fee]: "Gebühr: was die Bank pro Order berechnet. Ein fixer Anteil macht kleine Orders relativ teuer.",
  [GLOSSARY.orderbook]: "Orderbuch: deine Orders und ihr Status: offen, ausgeführt oder verfallen.",
  [GLOSSARY.candles]: "Jede Kerze ist ein Tag: Der Körper reicht von Eröffnung bis Schluss, grün bei höherem Schluss, rot bei tieferem. Die dünnen Linien sind Hoch und Tief des Tages.",
  [GLOSSARY.volume]: "Volumen: wie viele Aktien an dem Tag gehandelt wurden. Große Bewegungen kommen meist mit großem Volumen.",
  [GLOSSARY.bollinger]: "Bollinger-Bänder: ein Band um den 20-Tage-Durchschnitt. Ein breites Band bedeutet große Schwankungen.",
  [GLOSSARY["savings-plan"]]: "Sparplan: investiert jeden Monat automatisch denselben Betrag.",
  [GLOSSARY.watchlist]: "Watchlist: Aktien, denen du folgst. Auf der Liste zu stehen heißt nicht, dass sie dir gehören.",
  [GLOSSARY.news]: "News: simulierte Schlagzeilen. Die meisten sind Rauschen; die großen halten die Zeitmaschine an.",
});

/** A label that explains itself on hover or focus, when explaining is on. */
export function Term({ k, children }: { k: TermKey; children: React.ReactNode }) {
  const t = useT();
  const { lv, explain, setTip } = useProView();
  if (!lv && !explain) return <>{children}</>;
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const above = r.bottom + 120 > window.innerHeight;
    setTip({ text: t(GLOSSARY[k]), x: Math.max(8, Math.min(r.left, window.innerWidth - 288)), y: above ? r.top - 6 : r.bottom + 6, above });
  };
  return (
    <span className="term" tabIndex={0} aria-description={t(GLOSSARY[k])}
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
