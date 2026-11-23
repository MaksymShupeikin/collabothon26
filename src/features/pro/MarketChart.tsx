"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { UTCTimestamp } from "lightweight-charts";
import CandleChart, { MarketChartMode, type Mode } from "@/shared/charts/CandleChart";
import type { ReplayBar } from "@/features/market/replay-market";

import { universeOf } from "@/features/market/engine";
import { periodBars, type Period } from "@/features/market/period-bars";

export const INTERVALS = ["5m", "15m", "1h", "4h", "1D", "1W"] as const;
export type Interval = typeof INTERVALS[number];
export type Intraday = Exclude<Interval, "1D" | Period>;
export type IntradayBar = [number, string, number, number, number, number, number, "AFES" | "Yahoo Finance"];
type Bar = IntradayBar;
type Page = { bars: Bar[]; partial?: boolean };
type History = Page & { nextMonth: string; error?: string };

function earlierPage(month: string) {
  const date = new Date(`${month}-01T00:00:00Z`);
  // The endpoint returns the requested month and the month before it.
  date.setUTCMonth(date.getUTCMonth() - 2);
  return date.toISOString().slice(0, 7);
}

/** One page of intraday bars: the requested month and the month before it. Also used by the backtest. */
export async function getPage(symbol: string, interval: Intraday, month: string, signal: AbortSignal): Promise<Page> {
  const query = new URLSearchParams({ symbol, interval, month });
  const response = await fetch(`/api/real-market/bars?${query}`, { signal });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error);
  return payload;
}

function IntradayHistory({ symbol, interval, asOf, firstMonth, onJumpRecent }: {
  symbol: string;
  interval: Intraday;
  asOf: string;
  firstMonth: string;
  onJumpRecent?: () => void;
}) {
  const month = asOf.slice(0, 7);
  const [retry, setRetry] = useState(0);
  const [history, setHistory] = useState<History>();
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState("");
  const pending = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    getPage(symbol, interval, month, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setHistory({ ...page, nextMonth: earlierPage(month) });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setHistory({
          bars: [], nextMonth: earlierPage(month), error: error.message || "Could not load intraday quotes.",
        });
      });
    return () => {
      controller.abort();
      pending.current?.abort();
    };
  }, [symbol, interval, month, retry]);

  const canLoadOlder = !!history && history.nextMonth >= firstMonth;
  async function loadOlder() {
    if (!history || !canLoadOlder || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoadingOlder(true);
    setOlderError("");
    let cursor = history.nextMonth;
    try {
      while (cursor >= firstMonth) {
        const page = await getPage(symbol, interval, cursor, controller.signal);
        if (controller.signal.aborted) return;
        cursor = earlierPage(cursor);
        if (page.bars.length) {
          setHistory((current) => current && ({
            bars: [...page.bars, ...current.bars],
            partial: page.partial || current.partial,
            nextMonth: cursor,
          }));
          return;
        }
      }
      setHistory((current) => current && ({ ...current, nextMonth: cursor }));
    } catch (error) {
      if (!controller.signal.aborted) {
        setOlderError(error instanceof Error ? error.message : "Could not load earlier quotes.");
        setHistory((current) => current && ({ ...current, nextMonth: cursor }));
      }
    } finally {
      if (!controller.signal.aborted) setLoadingOlder(false);
      pending.current = undefined;
    }
  }

  const visible = useMemo(() => history?.bars.filter(([, date]) => date <= asOf && date.slice(0, 7) >= firstMonth) ?? [], [history, asOf, firstMonth]);
  const sources = [...new Set(visible.map((bar) => bar[7]))].join(" · ");
  const lastDay = visible.at(-1)?.[1];
  const bars: ReplayBar[] = visible.map(([, , open, high, low, close, volume]) => ({ open, high, low, close, volume, activity: 1 }));
  const formatters = useMemo(() => {
    const timeZone = symbol.endsWith(".DE") ? "Europe/Berlin" : "America/New_York";
    return {
      long: new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "medium", timeStyle: "short" }),
      short: new Intl.DateTimeFormat("en-GB", { timeZone, month: "short", day: "numeric" }),
      clock: new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }),
    };
  }, [symbol]);

  if (!history) return (
    <div className="skel-chart" role="status">
      <span className="skel" style={{ height: 240 }} />
      <span className="skel" style={{ height: 12, width: "40%" }} />
      <span className="sr-only">Loading {interval} quotes…</span>
    </div>
  );
  if (history.error) return <div className="xs" role="status">{history.error} <button className="btn btn-outline" onClick={() => { setHistory(undefined); setRetry(retry + 1); }}>Retry</button></div>;
  return (
    <>
      {visible.length ? (
        <p className="xs muted" role="status">{sources} · EUR · {visible[0][1]} to {lastDay}{history.partial ? " · Partial coverage" : ""}
          {loadingOlder ? <> · <span className="skel skel-inline" style={{ width: 90 }} /><span className="sr-only">Loading earlier quotes…</span></> : olderError ? ` · ${olderError}` : !canLoadOlder ? " · Start of available history" : ""}
        </p>
      ) : (
        <div className="xs" role="status">
          <p>No {interval} quotes near {asOf} for {symbol}.</p>
          {onJumpRecent && <button className="btn btn-outline" onClick={onJumpRecent}>Jump to recent sessions</button>}
          {canLoadOlder && <button className="btn btn-outline" disabled={loadingOlder} onClick={loadOlder}>← Earlier</button>}
          {loadingOlder ? <p><span className="skel skel-inline" style={{ width: 140 }} /><span className="sr-only">Loading earlier quotes…</span></p> : olderError && <p>{olderError}</p>}
        </div>
      )}
      {!!visible.length && <CandleChart sym={symbol} prices={bars.map((bar) => bar.close)} replayBars={bars}
        times={visible.map(([stamp]) => stamp as UTCTimestamp)} trades={[]}
        intradayLabels={formatters} scrollHistory onReachStart={canLoadOlder ? loadOlder : undefined} />}
    </>
  );
}

function PeriodChart({ symbol, asOf, interval }: { symbol: string; asOf: string; interval: Period }) {
  const bars = useMemo(() => {
    const market = universeOf("real-market");
    return periodBars(market.historical!.sessions!, market.observedBars![symbol], asOf, interval);
  }, [symbol, asOf, interval]);
  return <>
    <CandleChart sym={symbol} prices={bars.map(bar => bar.close)} replayBars={bars}
      times={bars.map(bar => bar.date)} trades={[]} scrollHistory />
    <p className="quote-origin xs muted">Yahoo Finance · {interval === "1W" ? "Weekly" : "Monthly"} · EUR · through {asOf}</p>
  </>;
}

export default function MarketChart({ symbol, asOf, firstMonth, onJumpRecent, children, inlineType = false, mode: controlledMode, onModeChange, interval: controlledInterval, onIntervalChange }: {
  symbol: string;
  asOf: string;
  firstMonth: string;
  onJumpRecent?: () => void;
  children: ReactNode;
  inlineType?: boolean;
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
  /** Controlled timeframe: the desk keeps it so a backtest starts on the timeframe the learner is looking at. */
  interval?: Interval;
  onIntervalChange?: (interval: Interval) => void;
}) {
  const [localMode, setLocalMode] = useState<Mode>("line");
  const mode = controlledMode ?? localMode;
  const setMode = (next: Mode) => {
    setLocalMode(next);
    onModeChange?.(next);
  };
  const [localInterval, setLocalInterval] = useState<Interval>("1D");
  const interval = controlledInterval ?? localInterval;
  const setInterval = (next: Interval) => {
    setLocalInterval(next);
    onIntervalChange?.(next);
  };
  return (
    <MarketChartMode.Provider value={inlineType ? mode : null}>
      <div className="chart-tools chart-timeframes">
        {inlineType && <div className="seg" role="group" aria-label="Chart type">
          <button aria-pressed={mode === "line"} onClick={() => setMode("line")}>Line</button>
          <button aria-pressed={mode === "candles"} onClick={() => setMode("candles")}>Candles</button>
        </div>}
        <div className="seg" role="group" aria-label="Chart timeframe">
          {INTERVALS.map((value) => (
            <button key={value} aria-pressed={value === interval} onClick={() => setInterval(value)}>{value}</button>
          ))}
        </div>
      </div>
      {interval === "1D" ? <>{children}{inlineType && <p className="quote-origin xs muted">Yahoo Finance · Daily · EUR</p>}</> : interval === "1W" ? <PeriodChart key={interval} symbol={symbol} asOf={asOf} interval={interval} /> : <IntradayHistory key={`${symbol}:${interval}:${asOf.slice(0, 7)}`}
        symbol={symbol} interval={interval} asOf={asOf} firstMonth={firstMonth} onJumpRecent={onJumpRecent} />}
    </MarketChartMode.Provider>
  );
}
