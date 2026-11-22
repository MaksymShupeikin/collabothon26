"use client";
import { useEffect, useRef, useState } from "react";
import type { UTCTimestamp } from "lightweight-charts";
import CandleChart, { MarketChartMode } from "@/shared/charts/CandleChart";
import { runBacktest } from "../market/backtest";
import type { ReplayBar } from "../market/replay-market";

export type ReplayCandle = ReplayBar & { date: string; time: UTCTimestamp };

function monthsBefore(date: string, months: number) {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months + 1, 0);
  d.setUTCDate(Math.min(day, d.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

export default function BacktestReplay({ symbol, interval, asOf, load }: {
  symbol: string; interval: string; asOf: string;
  load: (start: string, signal: AbortSignal) => Promise<ReplayCandle[]>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [months, setMonths] = useState(1);
  const [bars, setBars] = useState<ReplayCandle[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const [end, setEnd] = useState(asOf);
  const [first, setFirst] = useState(0);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!playing) return;
    if (index >= bars.length - 1) return;
    const timer = window.setTimeout(() => setIndex(index + 1), 150);
    return () => window.clearTimeout(timer);
  }, [playing, index, bars.length]);

  async function rewind(n: number, finish: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPlaying(false); setMonths(n); setEnd(finish); setBars([]); setIndex(0);
    setMessage("Loading replay…");
    const start = monthsBefore(finish, n);
    try {
      const loaded = await load(start, controller.signal);
      if (controller.signal.aborted) return;
      const range = loaded.filter(b => b.date <= finish);
      const startIndex = range.findIndex(b => b.date >= start);
      if (startIndex < 0 || range.length - startIndex < 2) {
        setMessage("Too few quotes in this period. Try another timeframe or period.");
        return;
      }
      setFirst(startIndex); setIndex(startIndex); setBars(range); setMessage("");
    } catch {
      if (!controller.signal.aborted) setMessage("Could not load quotes. Try Restart.");
    }
  }
  const current = bars[index];
  const seen = bars.slice(Math.max(0, index - 119), index + 1);
  const result = current ? runBacktest(bars.slice(0, index + 1), first) : null;
  return <>
    <button className="btn btn-outline btn-sm" onClick={() => { dialog.current?.showModal(); void rewind(months, asOf); }}>Replay backtest</button>
    <dialog className="replay-test" ref={dialog} aria-label="Replay backtest"
      onClose={() => { request.current?.abort(); setPlaying(false); }}>
      <header><strong>{symbol} · {interval}</strong><button className="btn btn-outline btn-sm" onClick={() => dialog.current?.close()}>Close</button></header>
      <div className="replay-controls">
        <label>Rewind <select value={months} onChange={e => void rewind(Number(e.target.value), end)}>
          {[1,2,3,6,12].map(n => <option key={n} value={n}>{n} {n===1 ? "month" : "months"}</option>)}
        </select></label>
        <button className="btn btn-primary btn-sm" disabled={!current} onClick={() => {
          if (index === bars.length - 1) {setIndex(first); setPlaying(true);}
          else setPlaying(!playing);
        }}>{playing && index < bars.length - 1 ? "Pause" : "Play"}</button>
        <button className="btn btn-outline btn-sm" disabled={!current || index >= bars.length-1} onClick={() => {setPlaying(false); setIndex(index+1);}}>Next bar</button>
        <button className="btn btn-outline btn-sm" onClick={() => {
          if (current) {setPlaying(false); setIndex(first);} else void rewind(months,end);
        }}>Restart</button>
      </div>
      {message && <p role="status">{message}</p>}
      {current && <>
        <p className="xs muted">{bars[first].date} – {bars.at(-1)!.date} · Bar {index-first+1} of {bars.length-first}</p>
        <p className="num"><strong>{current.close.toFixed(2)} €</strong> · {interval === "1D" ? current.date : new Date(current.time*1000).toISOString().slice(0,16).replace("T"," ")+" UTC"}</p>
        <MarketChartMode.Provider value="candles"><CandleChart sym={symbol} prices={seen.map(b=>b.close)} replayBars={seen}
          times={seen.map(b=>interval==="1D" ? b.date : b.time)} trades={[]} scrollHistory
          intradayLabels={interval==="1D" ? undefined : utcLabels}/></MarketChartMode.Provider>
        <p className="xs">SMA 5/20 · Return {result ? result.returnPct.toFixed(2)+"%" : "—"} · Max drawdown {result ? result.drawdown.toFixed(2)+"%" : "—"} · Closed trades {result?.closed ?? 0}</p>
      </>}
    </dialog>
  </>;
}
const utcLabels = {
  long: new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}),
  short: new Intl.DateTimeFormat("en-GB",{month:"short",day:"numeric",timeZone:"UTC"}),
  clock: new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"UTC"}),
};
