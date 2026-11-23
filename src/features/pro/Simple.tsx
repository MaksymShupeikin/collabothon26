"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { companyOf, type Company } from "@/features/market/companies";
import { cls, dateLocale, eur, pct, qtyFmt } from "@/shared/lib/format";
import { useT } from "@/shared/lib/i18n";
import { setUi } from "@/features/game/ui";
import type { News } from "@/features/market/news";
import { ask, bid, dateOf, depotValue, fee, priceAt, round2, type OrderInput, type OrderType, type Side, type Sim, type Universe } from "@/features/market/engine";
import type { Replay } from "@/features/market/scenarios";
import type { ReplayBar } from "@/features/market/replay-market";
import CandleChart, { MarketChartMode, type Mode as ChartMode, type TradeMark } from "@/shared/charts/CandleChart";
import MarketChart, { getPage, INTERVALS, type Interval, type Intraday } from "@/features/pro/MarketChart";
import { BT_BACK_BY_TF, barEndMs, btUnit, dailySeries, indexAtOrBefore, intradaySeries, isIntraday, weeklySeries, type BtSeries } from "@/features/pro/backtest-series";
import {
  BT_SPEEDS,
  cursorAtPos,
  cursorFromIsoDate,
  defaultBacktestCursor,
  resolveTradablePos,
  stepTradableCursor,
  tradableIndices,
  type BtSpeed,
} from "@/features/pro/backtest-replay-state";
import Header from "@/features/shell/Header";
import RewindDialog, { type RewindUnit } from "@/features/pro/RewindDialog";
import type { RealSim } from "@/features/pro/Pro";
import { MIN_HISTORY } from "@/features/market/real-market";
import Glyph from "@/shared/ui/Glyph";
import Icon from "@/shared/ui/Icon";
import { MistakeCam, useBoard } from "@/features/pro/ReplayParts";

/**
 * The simple trading area (the trading screen from main): one screen, three columns.
 * Module 2 runs here; ProTrader takes over from Module 3, once the learner confirms the switch.
 * Same market, same portfolio, same replays as ProTrader: only the layout is simpler.
 */
const PACES = [{ speed: 1, label: "1 day/s", de: "1 Tag/s" }, { speed: 5, label: "1 week/s", de: "1 Woche/s" }];
const TOPUP_MAX = 100_000; // keeps play money in a realistic range for a beginner portfolio

export type SimpleProps = {
  sim: Sim; u: Universe; comps: Company[]; sym: string; setSym: (s: string) => void;
  cover: (s: string) => string; coverWkn: (s: string) => string;
  speed: number; setSpeed: (s: number) => void; ended: boolean;
  closes: number[]; replayBars?: ReplayBar[]; firstDay: number; label: (d: number) => string; news: News[];
  breaking: News | null; clearBreaking: () => void; freePlay: boolean;
  order: (o: OrderInput) => { error: string | null }; cancel: (id: number) => void; addMoney: (a: number) => void;
  onJumpRecent?: () => void;
  /** Real market only: rewinding restarts the simulation from an earlier session (trading stays on). */
  realSim?: RealSim;
  replay?: Replay; answers: Record<string, number>;
};

/** One empty-state style for every list and panel in the trading screen. */
function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={44} round />
      <strong>{title}</strong>
      <span>{hint}</span>
    </div>
  );
}

export default function SimpleDesk(p: SimpleProps) {
  const t = useT();
  const { sim, u, comps, sym, setSym, cover, coverWkn, speed, setSpeed, ended, closes, firstDay, label, news, breaking, replay } = p;
  const [pace, setPace] = useState(p.realSim?.pace ?? 1); // speed to resume with (kept across a rewind)
  const [side, setSide] = useState<Side>("buy");
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<OrderType>("market");
  const [limit, setLimit] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"news" | "rivals">("news");
  const [bookTab, setBookTab] = useState<"positions" | "orders">("positions");
  const [query, setQuery] = useState("");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmt, setTopUpAmt] = useState(5000);
  const [topUpCustom, setTopUpCustom] = useState("");
  const [chartMode, setChartMode] = useState<ChartMode>("line");
  // Timeframe shown on the live chart; a backtest starts on it (lifted out of MarketChart).
  const [chartTf, setChartTf] = useState<Interval>("1D");
  // Phones: a sticky bottom trade bar (Robinhood-style) that hides while the order ticket itself is on screen.
  const orderRef = useRef<HTMLElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const [ticketInView, setTicketInView] = useState(false);
  useEffect(() => {
    const el = orderRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setTicketInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const goToTicket = () => {
    orderRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    window.setTimeout(() => qtyRef.current?.focus({ preventScroll: true }), 350);
  };
  // Backtest (TradingView-style bar replay): null = live market. The cursor is kept as a moment in time
  // (anchorMs = end of the last revealed bar), so switching timeframe or stock stays on the same date.
  const [bt, setBt] = useState<{ tf: Interval; anchorMs: number | null; playing: boolean; picking: boolean } | null>(null);
  const [btSpeed, setBtSpeed] = useState<BtSpeed>(2);
  const [btSay, setBtSay] = useState(""); // one-off screen-reader announcements: enter, exit, step, caught up
  const [intra, setIntra] = useState<{ key: string; series?: BtSeries; error?: string }>();
  const [intraRetry, setIntraRetry] = useState(0);
  // Rewind dialog (opened from the 1 day/s · 1 week/s buttons). Its unit IS the desk pace, so both stay in sync.
  const [rewindOpen, setRewindOpen] = useState(false);
  const [rewinding, setRewinding] = useState<{ n: number; unit: RewindUnit; id: number; bars: number } | null>(null);
  const rewindRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(rewindRaf.current), []);
  const canBacktest = !replay && closes.length > 2;
  const btRef = useRef(bt);
  useEffect(() => { btRef.current = bt; });
  const exitBacktest = () => {
    cancelAnimationFrame(rewindRaf.current);
    setRewinding(null);
    setBt(null);
    setBtSay("Backtest ended. Trading is available again.");
  };
  // Focus follows the mode switch: into the replay slider on enter, back to the Backtest button on exit.
  const scrubRef = useRef<HTMLInputElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const wasBt = useRef(false);
  useEffect(() => {
    if (!!bt === wasBt.current) return;
    wasBt.current = !!bt;
    (bt ? scrubRef.current : enterRef.current)?.focus();
  }, [bt]);

  // The guided tour reads what the learner does on the ticket.
  useEffect(() => { setUi({ orderSide: side, qty }); }, [side, qty]);
  useEffect(() => () => setUi({ orderSide: undefined, qty: undefined }), []);

  const day = sim.day;
  const priceOf = (s: string, d = day) => priceAt(u, s, d);
  const real = !!u.observedBars;
  const masked = (s: string) => !real && cover(s) !== companyOf(s).short; // replay hero before the reveal
  const price = priceOf(sym), prevPrice = priceOf(sym, day - 1);
  const company = comps.find((c) => c.sym === sym)!;
  const holding = sim.acct.holdings[sym];
  const total = round2(sim.acct.cash + depotValue(sim));
  const paidIn = sim.acct.deposits.slice(0, day + 1).filter((x) => x !== undefined && x !== null).at(-1) ?? 0;
  const pl = round2(total - paidIn);
  const execPrice = side === "buy" ? ask(price) : bid(price);
  const volume = round2(execPrice * (qty || 0));
  const orderFee = qty ? fee(volume) : 0;
  const positions = Object.entries(sim.acct.holdings);
  const orders = sim.acct.orders;
  const q = query.trim().toLowerCase();
  const results = q ? comps.filter((c) => [cover(c.sym), masked(c.sym) ? "" : c.sym, coverWkn(c.sym)].some((f) => f.toLowerCase().includes(q))) : comps;
  const pick = (s: string) => { setSym(s); setErr(null); setQuery(""); };

  // Chart: one candle per trading day; replays label the axis "Day n" instead of a date.
  const times = useMemo(() => closes.map((_, i) => {
    const day = firstDay + i;
    const date = u.hideDate ? new Date(Date.UTC(2000, 0, 1 + day)) : dateOf(u, day);
    return date.toISOString().slice(0, 10);
  }), [closes, u, firstDay]);
  const format = useMemo(() => {
    if (!u.hideDate) return undefined;
    const byIso = new Map(times.map((t, i) => [t, label(firstDay + i)]));
    return (t: string) => byIso.get(t) ?? "";
  }, [u.hideDate, times, label, firstDay]);
  const myTrades: TradeMark[] = useMemo(() => sim.acct.trades.filter((x) => x.sym === sym).map((x) => ({ i: x.day - firstDay, side: x.side, label: `${x.side === "buy" ? t("B", "K") : t("S", "V")} ${qtyFmt(x.qty)}` })), [sim.acct.trades, sym, firstDay, t]);

  const today = dateOf(u, day);
  const dailyChart = <CandleChart sym={sym} prices={closes} replayBars={p.replayBars} times={times} trades={myTrades} format={format} scrollHistory={real}
    scrollBack={rewinding && !bt ? { bars: rewinding.bars, id: rewinding.id } : undefined} />;
  // ── Backtest series for the chosen timeframe ──
  const asOfIso = today.toISOString().slice(0, 10);
  const btTf: Interval = bt?.tf ?? "1D";
  const intraKey = bt && isIntraday(btTf) ? `${sym}|${btTf}|${asOfIso.slice(0, 7)}|${intraRetry}` : "";
  useEffect(() => {
    if (!intraKey) return;
    const [s0, tf, month] = intraKey.split("|");
    const controller = new AbortController();
    getPage(s0, tf as Intraday, month, controller.signal)
      .then((page) => { if (!controller.signal.aborted) setIntra({ key: intraKey, series: intradaySeries(page.bars, asOfIso) }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setIntra({ key: intraKey, error: error instanceof Error && error.message ? error.message : "Could not load quotes." });
      });
    return () => controller.abort();
  }, [intraKey, asOfIso]);
  const dailyBt = useMemo(() => dailySeries(closes, p.replayBars, times), [closes, p.replayBars, times]);
  const sessions = u.historical?.sessions, symDaily = u.observedBars?.[sym];
  const weeklyBt = btTf === "1W" && real && sessions && symDaily ? weeklySeries(sessions, symDaily, asOfIso) : null;
  const series: BtSeries | null = !bt ? null : btTf === "1D" ? dailyBt : btTf === "1W" ? weeklyBt : intra?.key === intraKey ? intra.series ?? null : null;
  const btLoading = !!bt && isIntraday(btTf) && intra?.key !== intraKey;
  const btError = !!bt && isIntraday(btTf) && intra?.key === intraKey ? intra.error : undefined;
  // Only bars this stock really traded: filled "closed" days are skipped by step, play and the slider.
  const tradable = useMemo(() => (series ? tradableIndices(series.prices.length, series.bars) : []), [series]);
  const lastBar = tradable.at(-1) ?? 0;
  const btCursorRaw = !bt || !series ? -1
    : bt.anchorMs !== null ? indexAtOrBefore(series, bt.anchorMs) : defaultBacktestCursor(tradable, BT_BACK_BY_TF[btTf]);
  const btPos = series && btCursorRaw >= 0 ? resolveTradablePos(tradable, btCursorRaw) : 0;
  const btEffectiveCursor = series && btCursorRaw >= 0 ? (tradable[btPos] ?? lastBar) : -1;
  const btLeft = series ? Math.max(0, tradable.length - 1 - btPos) : 0; // bars between the cursor and today
  const anchorOf = (i: number) => (series ? barEndMs(series, i) : null);
  const setCursor = (i: number, extra?: Partial<NonNullable<typeof bt>>) =>
    setBt((cur) => (cur ? { ...cur, anchorMs: anchorOf(i), playing: false, picking: false, ...extra } : cur));
  // Replay timer: reveals one bar of the chosen timeframe per tick.
  const btLive = useRef({ series, tradable, cursor: btEffectiveCursor, lastBar });
  useEffect(() => { btLive.current = { series, tradable, cursor: btEffectiveCursor, lastBar }; });
  useEffect(() => {
    if (!bt?.playing || bt.picking) return;
    const id = window.setTimeout(() => {
      const b = btRef.current, live = btLive.current;
      if (!b || !b.playing || b.picking || !live.series) return;
      const next = stepTradableCursor(live.tradable, live.cursor, 1);
      if (next === null) { setBt({ ...b, playing: false }); return; }
      const done = next >= live.lastBar;
      setBt({ ...b, anchorMs: barEndMs(live.series, next), playing: !done });
      if (done) setBtSay("Caught up with today.");
    }, 1000 / btSpeed);
    return () => window.clearTimeout(id);
  }, [bt, btSpeed]);
  const startBacktest = () => {
    setSpeed(0);
    setTopUpOpen(false);
    setBt({ tf: real ? chartTf : "1D", anchorMs: null, playing: false, picking: false });
    setBtSay(`Backtest mode active on ${real ? chartTf : "1D"}. Trading is unavailable until you exit.`);
  };
  const changeBtTf = (tf: Interval) => {
    if (!bt || tf === bt.tf) return;
    const anchor = series && btEffectiveCursor >= 0 ? barEndMs(series, btEffectiveCursor) : bt.anchorMs;
    setBt({ ...bt, tf, anchorMs: anchor, playing: false, picking: false });
    setChartTf(tf);
    setBtSay(`Backtest timeframe ${tf}.`);
  };
  const seekPos = (pos: number) => {
    const cursor = cursorAtPos(tradable, pos);
    if (cursor !== null) setCursor(cursor);
    return cursor;
  };
  const tz = sym.endsWith(".DE") ? "Europe/Berlin" : "America/New_York";
  const intradayLabels = useMemo(() => ({
    long: new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }),
    short: new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "short", day: "numeric" }),
    clock: new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }),
  }), [tz]);
  // Backtest view: the chosen timeframe's bars sliced at the replay cursor (or all bars while picking a bar to jump to).
  const btSlice = useMemo(() => {
    if (!series || btEffectiveCursor < 0) return null;
    const trades = btTf === "1D" ? myTrades : []; // trade markers are per day; shown on the daily replay only
    if (bt?.picking) return { prices: series.prices, bars: series.bars, times: series.times, trades };
    return {
      prices: series.prices.slice(0, btEffectiveCursor + 1),
      bars: series.bars?.slice(0, btEffectiveCursor + 1),
      times: series.times.slice(0, btEffectiveCursor + 1),
      trades: trades.filter((t) => t.i <= btEffectiveCursor),
    };
  }, [bt?.picking, btEffectiveCursor, series, btTf, myTrades]);
  const dateLabel = (i: number) => {
    if (!series) return "";
    if (series.intraday) return series.ms[i] === undefined ? "" : intradayLabels.long.format(series.ms[i]);
    if (u.hideDate && btTf === "1D") return label(firstDay + i);
    const iso = series.times[i];
    if (typeof iso !== "string") return "";
    const d = new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    return btTf === "1W" ? `Week of ${d}` : d;
  };
  const btPrevCursor = series ? (tradable[Math.max(0, btPos - 1)] ?? 0) : 0;
  const btPrice = series && btEffectiveCursor >= 0 ? (series.prices[btEffectiveCursor] ?? price) : price;
  const btPrev = series && btEffectiveCursor >= 0 ? (series.prices[btPrevCursor] ?? prevPrice) : prevPrice;
  const btDate = bt ? (series ? dateLabel(btEffectiveCursor) : `Loading ${btTf} quotes…`) : "";
  const btAtStart = !series || btPos <= 1;
  const btAtEnd = !!bt && (!series || btPos >= tradable.length - 1);
  const step = (dir: -1 | 1) => {
    if (!series) return;
    const next = stepTradableCursor(tradable, btEffectiveCursor, dir);
    if (next !== null) {
      setCursor(next);
      setBtSay(dateLabel(next));
    }
  };
  const handlePickTime = (isoDate: string, time: unknown) => {
    if (!series) return;
    const picked = series.intraday && typeof time === "number"
      ? tradable[resolveTradablePos(tradable, indexAtOrBefore(series, time * 1000))]
      : cursorFromIsoDate(series.times as string[], tradable, isoDate);
    if (picked !== null && picked !== undefined) {
      setCursor(picked);
      setBtSay(`Rewound to ${dateLabel(picked)}.`);
    }
  };
  const tfName = (tf: Interval) => (tf === "1D" ? "Daily" : tf === "1W" ? "Weekly" : tf);

  // ── Rewind the market simulation N days / weeks (dialog) ──
  // Unlike Backtest (watch the past, no trading), this restarts the simulation at an earlier session:
  // the market then runs forward at 1 day/s or 1 week/s and the learner trades as it goes.
  const rewindUnit: RewindUnit = pace === 1 ? "days" : "weeks";
  const setRewindUnit = (unit: RewindUnit) => {
    const next = unit === "days" ? 1 : 5;
    setPace(next);
    if (speed) setSpeed(next);
  };
  const SESSIONS_PER_WEEK = 5;
  const nowIndex = u.history + day; // absolute session of the simulation's current day
  const roomBack = Math.max(0, nowIndex - MIN_HISTORY);
  const rewindMax: Record<RewindUnit, number> = { days: Math.max(1, roomBack), weeks: Math.max(1, Math.floor(roomBack / SESSIONS_PER_WEEK)) };
  const sessionsBack = (n: number, unit: RewindUnit) => (unit === "days" ? n : n * SESSIONS_PER_WEEK);
  const rewindPreview = (n: number, unit: RewindUnit) => {
    const iso = u.historical?.sessions?.[nowIndex - sessionsBack(n, unit)];
    if (!iso) return "";
    return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  };
  /** Continue: the daily chart slides back N bars (animated by the chart), then the simulation restarts there. */
  const rewindBy = (n: number, unit: RewindUnit) => {
    setRewindOpen(false);
    if (!p.realSim) return;
    const back = sessionsBack(n, unit);
    const start = nowIndex - back;
    const restart = () => p.realSim!.onRewind(start, pace);
    cancelAnimationFrame(rewindRaf.current);
    setSpeed(0);
    setTopUpOpen(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { restart(); return; }
    setChartTf("1D"); // the slide plays on the daily chart
    setRewinding({ n, unit, id: performance.now(), bars: back });
    const t0 = performance.now();
    const wait = (now: number) => {
      if (now - t0 < 1100) { rewindRaf.current = requestAnimationFrame(wait); return; }
      restart(); // remounts the desk with a fresh simulation at the new date
    };
    rewindRaf.current = requestAnimationFrame(wait);
  };
  const btChart = bt && (
    <MarketChartMode.Provider value={chartMode}>
      <div className="chart-tools chart-timeframes">
        {bt?.picking && (
          <span className="bt-pick-hint xs" role="status">
            <Glyph name="scissors" size={14} /> Click any bar to jump there
          </span>
        )}
        <div className="bt-chart-controls">
          <div className="seg" role="group" aria-label="Chart type">
            <button type="button" aria-pressed={chartMode === "line"} onClick={() => setChartMode("line")}>Line</button>
            <button type="button" aria-pressed={chartMode === "candles"} onClick={() => setChartMode("candles")}>Candles</button>
          </div>
          {real ? (
            <div className="seg" role="group" aria-label="Backtest timeframe">
              {INTERVALS.map((v) => (
                <button type="button" key={v} aria-pressed={btTf === v} onClick={() => changeBtTf(v)} title={`Replay ${tfName(v).toLowerCase()} bars`}>{v}</button>
              ))}
            </div>
          ) : (
            <span className="bt-tf-pill xs" title="Backtest replays daily trading sessions">1D · Replay</span>
          )}
        </div>
      </div>
      {btLoading && (
        <div className="skel-chart" role="status">
          <span className="skel" style={{ height: 240 }} />
          <span className="sr-only">Loading {btTf} quotes…</span>
        </div>
      )}
      {btError && (
        <div className="xs bt-status" role="status">
          {btError} <button type="button" className="btn btn-outline btn-sm" onClick={() => setIntraRetry((n) => n + 1)}>Retry</button>
        </div>
      )}
      {btSlice && <CandleChart
        key={btTf} /* a fresh chart per timeframe: intraday (epoch) and daily (ISO) time scales cannot share one instance */
        sym={sym}
        prices={btSlice.prices}
        replayBars={btSlice.bars}
        times={btSlice.times}
        trades={btSlice.trades}
        format={format}
        scrollHistory
        pickBar={!!bt?.picking}
        onPickTime={handlePickTime}
        intradayLabels={series?.intraday ? intradayLabels : undefined}
      />}
      {real && <p className="quote-origin xs muted">Yahoo Finance · {tfName(btTf)} · EUR · Backtest replay</p>}
    </MarketChartMode.Provider>
  );

  // Keyboard shortcuts while Backtest mode is active: Space (play/pause), Left/Right (step), Escape (cancel pick / exit).
  const btKeyRef = useRef({ step, exitBacktest, btAtEnd });
  useEffect(() => { btKeyRef.current = { step, exitBacktest, btAtEnd }; });
  const btActive = !!bt;
  useEffect(() => {
    if (!btActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") {
          e.preventDefault();
          const cur = btRef.current;
          if (cur?.picking) setBt({ ...cur, picking: false });
          else btKeyRef.current.exitBacktest();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        const cur = btRef.current;
        if (cur?.picking) setBt({ ...cur, picking: false });
        else btKeyRef.current.exitBacktest();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        btKeyRef.current.step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        btKeyRef.current.step(1);
      } else if (e.key === " " && tag !== "BUTTON") {
        e.preventDefault();
        const cur = btRef.current;
        if (cur && !cur.picking && !btKeyRef.current.btAtEnd) {
          setBt({ ...cur, playing: !cur.playing });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [btActive]);

  const play = () => { p.clearBreaking(); setSpeed(speed ? 0 : pace); };

  function submit() {
    if (bt) return;
    const res = p.order({ sym, side, qty, type, limit: Number(limit), validity: "max", exchange: company.venue ?? "Xetra" });
    setErr(res.error);
  }

  return (
    <>
      <Header />
      <div className={real ? "trade real-desk" : "trade"}>
        <p className="sr-only" role="status" aria-live="polite">{btSay}</p>
        {/* Phones only (CSS): sticky trade bar. In a backtest it says so and offers the way out instead. */}
        <div className={`m-tradebar${ticketInView ? " is-hidden" : ""}`} aria-hidden={ticketInView || undefined}>
          <div className="m-tradebar-info">
            <strong>{cover(sym)}</strong>
            <span className="num">{eur(btPrice)} <span className={`chg ${cls(btPrice - btPrev)}`}>{pct((btPrice / btPrev - 1) * 100)}</span></span>
          </div>
          {bt
            ? <button type="button" className="btn btn-outline" onClick={exitBacktest} tabIndex={ticketInView ? -1 : undefined}>Exit backtest</button>
            : <button type="button" className="btn btn-primary" onClick={goToTicket} tabIndex={ticketInView ? -1 : undefined}>Trade</button>}
        </div>
        {real && canBacktest && (
          <RewindDialog open={rewindOpen} unit={rewindUnit} onUnitChange={setRewindUnit} max={rewindMax} preview={rewindPreview}
            note={`Positions and orders start fresh with ${eur(p.realSim?.cash ?? 0)} play money.`}
            onCancel={() => setRewindOpen(false)} onContinue={rewindBy} />
        )}
        <div className="trade-grid">
          {/* Left: find and pick (search filters the watchlist right below it), then news + rivals */}
          <div className="trade-col">
            {/* Tour target is the panel: it has its own z-index, so a child can't rise above the tour overlay. */}
            <section className="panel p-watch" aria-label="Watchlist" data-tour="w-search">
              <div className="watch-search">
                <input type="search" placeholder={t("Search name, ticker or WKN", "Name, Kürzel oder WKN suchen")} value={query} aria-label={t("Search stocks", "Aktien suchen")} aria-controls="watchlist"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && results[0]) pick(results[0].sym); if (e.key === "Escape") setQuery(""); }} />
              </div>
              {/* Every stock one click away, price and change at a glance. */}
              <div className="panel-body" id="watchlist">
                {results.length === 0 && <EmptyState icon="compass" title={t("No stock found", "Keine Aktie gefunden")} hint={t("Try a name, ticker or WKN.", "Versuch es mit Name, Kürzel oder WKN.")} />}
                {results.map((c) => {
                  const pr = priceOf(c.sym), ch = (pr / priceOf(c.sym, day - 1) - 1) * 100;
                  return (
                    <button key={c.sym} className="watch-row" aria-pressed={c.sym === sym} onClick={() => pick(c.sym)}>
                      <span className="watch-name"><strong>{cover(c.sym)}</strong><span className="xs muted">{masked(c.sym) ? "" : `${c.sym} · `}{real ? c.venue : `WKN ${coverWkn(c.sym)}`}</span></span>
                      <span className="watch-price"><span className="num">{eur(pr)}</span><span className={`chg num ${cls(ch)}`}>{pct(ch)}</span></span>
                    </button>
                  );
                })}
              </div>
            </section>
            {/* Real Market data has no news and no rival bots, so the watchlist takes the whole column. */}
            {!real && <section className="panel p-feed" aria-label={t("News and rivals", "News und Rivalen")} data-tour="w-news">
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === "news"} onClick={() => setTab("news")}>News</button>
                <button role="tab" aria-selected={tab === "rivals"} onClick={() => setTab("rivals")}>{t("Rivals", "Rivalen")} {replay && <span className="count hot">{replay.bots.length}</span>}</button>
              </div>
              <div className="panel-body">
                {tab === "news" && (
                  <div className="news" aria-live="polite">
                    {news.length === 0 && <EmptyState icon="hanna" title={t("No news yet", "Noch keine News")} hint={real ? t("This dataset contains daily prices and volume.", "Dieser Datensatz enthält Tageskurse und Volumen.") : t("Press play — headlines arrive day by day.", "Drück auf Play — die Schlagzeilen kommen Tag für Tag.")} />}
                    {news.map((n) => (
                      <div key={n.id} className={`news-item ${n.major ? "major" : ""} ${n.day === day ? "fresh" : ""}`}>
                        <div className="xs muted">{label(n.day)}{n.sym ? ` · ${cover(n.sym)}` : ""}</div>
                        {t(n.headline)}
                      </div>
                    ))}
                  </div>
                )}
                {tab === "rivals" && (replay
                  ? <ReplayRivals replay={replay} sim={sim} answers={p.answers} cover={cover} />
                  : <EmptyState icon="max" title={t("No rivals in this market", "Keine Rivalen in diesem Markt")} hint={t("Rival bots trade with you in boss rounds and History mode.", "Rivalen-Bots handeln mit dir in Bossrunden und im Geschichtsmodus.")} />)}
              </div>
            </section>}
          </div>

          {/* Center: time controls (they drive the chart), then the chart of the selected stock */}
          <div className="trade-col">
            {bt ? (
              /* Backtest (TradingView-style bar replay): date & status, Select-bar cut tool + Exit, hairline scrubber, transport & speed. */
              <div className="clock clock-bt" data-tour="time-machine" role="group" aria-label="Backtest controls">
                <div className="bt-head">
                  <div className="bt-when">
                    <strong className="bt-date num">{series ? btDate : <><span className="skel skel-inline" style={{ width: 160 }} /><span className="sr-only">{btDate}</span></>}</strong>
                    <span className="bt-sub num">
                      <span className="bt-mode-pill">Backtest</span>
                      {bt.picking
                        ? "Click any bar on the chart to rewind there"
                        : btLeft === 0
                          ? "Caught up with today"
                          : `${btLeft} ${btUnit(btTf, btLeft)} before today`}
                    </span>
                  </div>
                  <div className="bt-head-actions">
                    <button
                      type="button"
                      className="bt-chip"
                      aria-pressed={bt.picking}
                      onClick={() => setBt((cur) => (cur ? { ...cur, playing: false, picking: !cur.picking } : cur))}
                      title="Pick a starting bar directly on the chart"
                    >
                      <Glyph name="scissors" size={14} />
                      <span>{bt.picking ? "Cancel pick" : "Select bar"}</span>
                    </button>
                    <button type="button" className="bt-exit" onClick={exitBacktest}>Exit backtest</button>
                  </div>
                </div>
                <input ref={scrubRef} type="range" className="bt-scrub" min={1} max={tradable.length - 1} step={1} value={btPos}
                  style={{ "--p": `${tradable.length > 2 ? ((btPos - 1) / (tradable.length - 2)) * 100 : 100}%` } as CSSProperties}
                  onChange={(e) => seekPos(Number(e.target.value))} aria-label="Rewind: replay position"
                  aria-valuetext={`${btDate}, ${btLeft === 0 ? "today" : `${btLeft} ${btUnit(btTf, btLeft)} before today`}`} disabled={!series} />
                <div className="bt-ctrl">
                  <div className="bt-transport">
                    <button type="button" className="bt-icon" onClick={() => { if (!btAtStart) step(-1); }} aria-disabled={btAtStart || undefined}
                      aria-label="One bar back" title="Previous bar (←)"><Glyph name="stepBack" size={18} /></button>
                    <button type="button" className="play-btn" onClick={() => { if (!btAtEnd) setBt({ ...bt, playing: !bt.playing, picking: false }); }} aria-disabled={btAtEnd || undefined}
                      aria-label={bt.playing ? "Pause replay" : "Play replay"} title={btAtEnd ? "Caught up with today" : bt.playing ? "Pause (Space)" : "Play (Space)"}>
                      <Icon name={bt.playing ? "pause" : "play"} size={16} />
                    </button>
                    <button type="button" className="bt-icon" onClick={() => { if (!btAtEnd) step(1); }} aria-disabled={btAtEnd || undefined}
                      aria-label="One bar forward" title="Next bar (→)"><Glyph name="stepForward" size={18} /></button>
                  </div>
                  <div className="bt-speed-wrap">
                    <span className="bt-speed-label xs muted">Speed</span>
                    <div className="bt-speed seg" role="group" aria-label="Replay speed">
                      {BT_SPEEDS.map((sp) => (
                        <button type="button" key={sp} aria-pressed={btSpeed === sp} onClick={() => setBtSpeed(sp)}
                          title={`${sp} ${sp === 1 ? "bar" : "bars"} per second`}>{sp}×</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="clock" data-tour="time-machine">
                <button className="play-btn" onClick={play} disabled={ended} aria-label={speed ? t("Pause", "Pause") : t("Play", "Abspielen")}>
                  <Icon name={speed ? "pause" : "play"} size={16} />
                </button>
                <div className="clock-date">
                  <strong>{u.hideDate ? t(`Day ${day + 1}`, `Tag ${day + 1}`) : today.toLocaleDateString(dateLocale(t.lang), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</strong>
                  <span className="xs muted num">{replay ? t(`${day + 1} of ${u.days + 1} sessions`, `${day + 1} von ${u.days + 1} Handelstagen`) : t(`Week ${Math.floor(day / 5) + 1} of ${Math.ceil(u.days / 5)}`, `Woche ${Math.floor(day / 5) + 1} von ${Math.ceil(u.days / 5)}`)}</span>
                  <span className="day-bar" role="progressbar" aria-label={t("Market progress", "Marktfortschritt")} aria-valuemin={0} aria-valuemax={u.days} aria-valuenow={day}><span style={{ width: `${Math.min(100, (day / u.days) * 100)}%` }} /></span>
                </div>
                <div className="clock-actions">
                  <div className="seg" role="group" aria-label={t("Speed", "Tempo")}>
                    {PACES.map((x) => (
                      <button key={x.speed} aria-pressed={pace === x.speed} aria-haspopup={real && canBacktest ? "dialog" : undefined}
                        onClick={() => { setPace(x.speed); if (speed) setSpeed(x.speed); if (real && canBacktest) setRewindOpen(true); }}>{t(x.label, x.de)}</button>
                    ))}
                  </div>
                  {canBacktest && (
                    <button ref={enterRef} type="button" className="bt-enter" onClick={startBacktest} aria-label="Backtest"
                      title="Rewind chart and replay past bars at custom speed. Trading pauses meanwhile.">
                      <Glyph name="barReplay" size={14} /> <span className="bt-enter-label">Backtest</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            <section className={rewinding ? "panel p-chart is-rewinding" : "panel p-chart"} data-tour="w-chart" aria-label="Chart">
              <div className={real ? "chart-head chart-head-real" : "chart-head"}>
                <div className="chart-company">
                  <h2>{cover(sym)}</h2>
                  <div className="xs muted">{masked(sym) ? "" : `${sym} · `}{real ? company.venue : `WKN ${coverWkn(sym)} · ${t(company.sector)}`}</div>
                  {replay && <div className="xs muted">{t("Historical replay · observed and simulated prices", "Historisches Replay · beobachtete und simulierte Kurse")}</div>}
                  {real && (bt ? p.replayBars?.[btEffectiveCursor]?.closed : p.replayBars?.at(-1)?.closed) && <span className="xs muted">{t("Market closed", "Börse geschlossen")}</span>}
                </div>
                <div className="chart-price">
                  <strong className="num">{eur(btPrice)}</strong>
                  <span className={`chg num ${cls(btPrice - btPrev)}`}>{pct((btPrice / btPrev - 1) * 100)}</span>
                </div>
              </div>
              <div className={bt ? "chart-body bt-body" : "chart-body"}>
                {rewinding && (
                  <span className="bt-rewind-badge" aria-hidden>
                    <Glyph name="rewind" size={16} /> Rewinding {rewinding.n} {rewinding.n === 1 ? rewinding.unit.slice(0, -1) : rewinding.unit}
                  </span>
                )}
                {btChart ? btChart : real ? (
                  <MarketChart inlineType symbol={sym} asOf={today.toISOString().slice(0, 10)} firstMonth={u.historical!.sessions![0].slice(0, 7)}
                    onJumpRecent={p.onJumpRecent} mode={chartMode} onModeChange={setChartMode} interval={chartTf} onIntervalChange={setChartTf}>
                    {dailyChart}
                  </MarketChart>
                ) : (
                  <MarketChartMode.Provider value={chartMode}>
                    <div className="chart-tools chart-timeframes">
                      <div className="seg" role="group" aria-label="Chart type">
                        <button type="button" aria-pressed={chartMode === "line"} onClick={() => setChartMode("line")}>Line</button>
                        <button type="button" aria-pressed={chartMode === "candles"} onClick={() => setChartMode("candles")}>Candles</button>
                      </div>
                    </div>
                    {dailyChart}
                  </MarketChartMode.Provider>
                )}
              </div>
            </section>
          </div>

          {/* Right: account, order ticket, positions/orders */}
          <div className="trade-col">
            <div className={bt ? "acct is-locked" : "acct"} data-tour="w-account">
              <div className="acct-main"><span>{t("Total value", "Gesamtwert")}</span><strong className="num">{eur(total)}</strong></div>
              <div className="acct-sub xs num">
                <span>{t("Cash", "Guthaben")} <b>{eur(sim.acct.cash)}</b></span>
                <span>{t("P/L", "G/V")} <b className={cls(pl)}>{eur(pl)} ({pct(paidIn ? (pl / paidIn) * 100 : 0)})</b></span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => { if (!bt) setTopUpOpen(true); }} disabled={!!bt}
                title={bt ? "Unavailable during backtest" : undefined} aria-describedby={bt ? "bt-lock-reason" : undefined}>{t("Top up +", "Aufladen +")}</button>
            </div>
            <section ref={orderRef} className={bt ? "panel p-order is-locked" : "panel p-order"} data-tour="w-ticket" aria-label="Order">
              {/* While a backtest runs the ticket is greyed out and inert: past prices cannot be traded. */}
              {/* Always mounted so the lock reason is announced when it appears. */}
              <div className="lock-note" role="status" id="bt-lock-reason">
                {bt && <>
                  <span className="lock-icon" aria-hidden="true"><Glyph name="lock" size={15} /></span>
                  <div className="lock-copy">
                    <strong>Trading unavailable</strong>
                    <span>Disabled while backtest mode is active.</span>
                  </div>
                  <button type="button" className="bt-exit bt-exit-sm" onClick={exitBacktest}>Exit</button>
                </>}
              </div>
              <div className="ticket" inert={!!bt}>
                <div className="side-toggle" role="group" aria-label={t("Buy or sell", "Kauf oder Verkauf")}>
                  <button className="buy" aria-pressed={side === "buy"} onClick={() => setSide("buy")}>{t("Buy", "Kauf")}</button>
                  <button className="sell" aria-pressed={side === "sell"} onClick={() => setSide("sell")}>{t("Sell", "Verkauf")}</button>
                </div>
                <div className="order-grid">
                  <label className="field">{t("Quantity", "Stückzahl")}
                    <span className="stepper">
                      <button type="button" aria-label={t("One share less", "Ein Stück weniger")} onClick={() => setQty(Math.max(1, (qty || 1) - 1))} disabled={(qty || 1) <= 1}><Glyph name="minus" /></button>
                      <input ref={qtyRef} type="number" inputMode="numeric" min={1} step={1} value={qty || ""} onChange={(e) => setQty(Math.floor(Number(e.target.value)))} aria-label={t("Quantity", "Stückzahl")} />
                      <button type="button" aria-label={t("One share more", "Ein Stück mehr")} onClick={() => setQty((qty || 0) + 1)}><Glyph name="plus" /></button>
                    </span>
                  </label>
                  <label className="field">{t("Order type", "Orderart")}
                    <select value={type} onChange={(e) => setType(e.target.value as OrderType)}>
                      <option value="market">Market</option>
                      <option value="limit">Limit</option>
                      <option value="stop">Stop</option>
                    </select>
                  </label>
                  {type !== "market" && (
                    <label className="field" style={{ gridColumn: "1 / -1" }}>{type === "limit" ? t("Limit price (€)", "Limitkurs (€)") : t("Stop price (€)", "Stoppkurs (€)")}
                      <input type="number" min={0} step={0.01} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={price.toFixed(2)} />
                    </label>
                  )}
                </div>
                <div>
                  <div className="kv"><span className="muted">{t("Price", "Kurs")} ({side === "buy" ? t("ask", "Brief") : t("bid", "Geld")})</span><span className="num">{eur(execPrice)}</span></div>
                  <div className="kv"><span className="muted">{t("Fee", "Gebühr")}</span><span className="num">{eur(orderFee)}</span></div>
                  <div className="kv total"><strong>{side === "buy" ? t("Total", "Gesamt") : t("You receive", "Du erhältst")}</strong><strong className="num">{eur(side === "buy" ? volume + orderFee : volume - orderFee)}</strong></div>
                  {side === "sell" && <div className="kv xs muted"><span>{t("You own", "Dein Bestand")}</span><span className="num">{qtyFmt(holding?.qty ?? 0)}</span></div>}
                </div>
                {err && <p className="error" role="alert">{t(err)}</p>}
                <button className={`btn btn-lg ${side === "buy" ? "btn-primary" : "btn-dark"}`} onClick={submit} disabled={ended}>
                  {side === "buy" ? t("Buy", "Kaufen") : t("Sell", "Verkaufen")} {qty || 0} × {cover(sym)}
                </button>
              </div>
            </section>

            <section className="panel p-book" aria-label={t("Positions and orders", "Positionen und Orders")} data-tour="w-depot">
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={bookTab === "positions"} onClick={() => setBookTab("positions")}>{t("Positions", "Positionen")} <span className="count">{positions.length}</span></button>
                <button role="tab" aria-selected={bookTab === "orders"} onClick={() => setBookTab("orders")}>{t("Orders", "Orders")} <span className="count">{orders.length}</span></button>
              </div>
              <div className="panel-body">
                {bookTab === "positions" && (positions.length === 0 ? <EmptyState icon="chart" title={t("No positions yet", "Noch keine Positionen")} hint={t("Buy a stock above and it shows up here.", "Kauf oben eine Aktie, dann erscheint sie hier.")} /> : positions.map(([s, h]) => {
                  const v = h.qty * priceOf(s);
                  return (
                    <button key={s} className="watch-row" aria-pressed={s === sym} onClick={() => setSym(s)}>
                      <span className="watch-name"><strong>{cover(s)}</strong><span className="xs muted num">{qtyFmt(h.qty)} × {eur(h.cost / h.qty)}</span></span>
                      <span className="watch-price"><span className="num">{eur(v)}</span><span className={`chg num ${cls(v - h.cost)}`}>{eur(v - h.cost)}</span></span>
                    </button>
                  );
                }))}
                {bookTab === "orders" && (orders.length === 0 ? <EmptyState icon="hourglass" title={t("No open orders", "Keine offenen Orders")} hint={t("Limit and stop orders wait here until their price is hit.", "Limit- und Stop-Orders warten hier, bis ihr Kurs erreicht ist.")} /> : orders.map((o) => (
                  <div key={o.id} className="watch-row">
                    <span className="watch-name"><strong>{o.side === "buy" ? t("Buy", "Kauf") : t("Sell", "Verkauf")} {qtyFmt(o.qty)}× {cover(o.sym)}</strong><span className="xs muted">{t(o.type, o.type === "limit" ? "Limit" : o.type === "stop" ? "Stop" : "Market")} @ {eur(o.limit)}</span></span>
                    <button className="btn btn-ghost btn-sm" onClick={() => { if (!bt) p.cancel(o.id); }} disabled={!!bt}
                      aria-describedby={bt ? "bt-lock-reason" : undefined}>{t("Cancel", "Streichen")}</button>
                  </div>
                )))}
              </div>
            </section>
          </div>
        </div>

        {/* Free play only: chapters and missions bring their own questions on big news. */}
        {breaking && p.freePlay && !bt && (
          <div className="overlay" role="dialog" aria-modal="true" aria-label={t("Breaking news", "Eilmeldung")}>
            <div className="modal">
              <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>{t("Breaking", "Eilmeldung")}</span>
              <h2>{t(breaking.headline)}</h2>
              <div className="row">
                {breaking.sym && (
                  <>
                    <button className="btn btn-primary" onClick={() => { setSym(breaking.sym!); setSide("buy"); p.clearBreaking(); }}>{t("Buy", "Kaufen")} {cover(breaking.sym)}</button>
                    <button className="btn btn-outline" onClick={() => { setSym(breaking.sym!); setSide("sell"); p.clearBreaking(); }}>{t("Sell", "Verkaufen")} {cover(breaking.sym)}</button>
                  </>
                )}
                <button className="btn btn-dark" onClick={() => { p.clearBreaking(); setSpeed(pace); }}>{t("Hold", "Halten")}</button>
              </div>
            </div>
          </div>
        )}

        {topUpOpen && (() => {
          const amount = topUpCustom ? Number(topUpCustom) : topUpAmt;
          const valid = Number.isInteger(amount) && amount >= 1 && amount <= TOPUP_MAX;
          const close = () => { setTopUpOpen(false); setTopUpCustom(""); };
          return (
            <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="topup-title" onClick={close}>
              <div className="modal topup" onClick={(e) => e.stopPropagation()}>
                <h2 id="topup-title">{t("Add play money", "Spielgeld einzahlen")}</h2>
                <p className="small muted">{t("Practice money only. It doesn't count as profit.", "Nur Übungsgeld. Es zählt nicht als Gewinn.")}</p>
                <div className="topup-amounts" role="radiogroup" aria-label={t("Amount", "Betrag")}>
                  {[1000, 5000, 10000].map((a) => (
                    <button key={a} role="radio" aria-checked={!topUpCustom && topUpAmt === a} className="topup-amount num" onClick={() => { setTopUpAmt(a); setTopUpCustom(""); }}>+{eur(a)}</button>
                  ))}
                </div>
                <label className="field">
                  <span className="xs muted">{t(`Or enter an amount (max ${eur(TOPUP_MAX)})`, `Oder gib einen Betrag ein (max. ${eur(TOPUP_MAX)})`)}</span>
                  <span className="input-prefix">
                    <span aria-hidden>€</span>
                    <input type="number" inputMode="numeric" min={1} max={TOPUP_MAX} step={1} placeholder={t("e.g. 2500", "z. B. 2500")} value={topUpCustom}
                      aria-invalid={!!topUpCustom && !valid} onChange={(e) => setTopUpCustom(e.target.value)} />
                  </span>
                </label>
                {topUpCustom && !valid && <p className="error" role="alert">{t(`Enter a whole amount from 1 to ${eur(TOPUP_MAX)}.`, `Gib einen ganzen Betrag von 1 bis ${eur(TOPUP_MAX)} ein.`)}</p>}
                <div className="topup-sum">
                  <div className="kv"><span className="muted">{t("Cash now", "Guthaben jetzt")}</span><span className="num">{eur(sim.acct.cash)}</span></div>
                  <div className="kv total"><strong>{t("Cash after", "Guthaben danach")}</strong><strong className="num">{valid ? eur(sim.acct.cash + amount) : "—"}</strong></div>
                </div>
                <div className="row topup-actions">
                  <button className="btn btn-ghost" onClick={close}>{t("Cancel", "Abbrechen")}</button>
                  <button className="btn btn-primary" disabled={!valid} onClick={() => { p.addMoney(amount); close(); }}>{valid ? t(`Add ${eur(amount)}`, `${eur(amount)} einzahlen`) : t("Add", "Einzahlen")}</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}

/** Rivals tab in a replay: the same scores and Mistake Cam as ProTrader, in the simple screen's table. */
function ReplayRivals({ replay, sim, answers, cover }: { replay: Replay; sim: Sim; answers: Record<string, number>; cover: (s: string) => string }) {
  const t = useT();
  const board = useBoard(replay, sim);
  return (
    <div className="rivals">
      <table className="table">
        <tbody>
          {board.map((r, i) => (
            <tr key={r.id} aria-selected={r.id === "you"}>
              <td className="num xs">{i + 1}</td>
              <td className="small"><Icon name={r.id} size={28} round /> {t(r.name)}</td>
              <td className={`r num small ${cls(r.ret)}`}>{pct(r.ret)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <h3>{t("Mistake Cam", "Fehler-Cam")}</h3>
        <MistakeCam replay={replay} sim={sim} answers={answers} name={cover} compact />
      </div>
    </div>
  );
}
