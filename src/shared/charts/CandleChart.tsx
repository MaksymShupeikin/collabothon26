"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CandlestickSeries, LineSeries, createChart, createSeriesMarkers, TickMarkType, type IChartApi, type IRange, type ISeriesApi, type ISeriesMarkersPluginApi, type Time } from "lightweight-charts";
import { historyViewport } from "./history-viewport";
import { rng } from "@/shared/lib/rng";
import { useT } from "@/shared/lib/i18n";
import type { ReplayBar } from "@/features/market/replay-market";

export type TradeMark = { i: number; side: "buy" | "sell"; label: string };
export type Mode = "line" | "candles";
export const MarketChartMode = createContext<Mode | null>(null);

// The sandbox supplies closes only. Historical replays supply their own OHLC bars.
function toCandles(sym: string, prices: number[], times: Time[]) {
  let seed = 0;
  for (const ch of sym) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return prices.map((c, i) => {
    const o = i ? prices[i - 1] : c;
    const r = rng(seed + i * 7919);
    return { time: times[i] as Time, open: o, close: c, high: Math.max(o, c) * (1 + r() * 0.008), low: Math.min(o, c) * (1 - r() * 0.008) };
  });
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const timeToIso = (t: Time) =>
  typeof t === "object"
    ? `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`
    : typeof t === "number"
      ? new Date(t * 1000).toISOString().slice(0, 10)
      : t;

/** Price chart (TradingView Lightweight Charts) in the app's palette. Default: one calm line; candles on demand. */
export default function CandleChart({ sym, prices, replayBars, times, trades, format, intradayLabels, scrollHistory = false, onReachStart, pickBar = false, onPickTime, scrollBack }: {
  sym: string; prices: number[]; replayBars?: ReplayBar[]; times: Time[]; trades: TradeMark[]; format?: (time: string) => string;
  scrollHistory?: boolean; onReachStart?: () => void;
  pickBar?: boolean; onPickTime?: (isoDate: string, time: Time) => void;
  /** Smoothly scroll the view this many bars back in time (animated by the chart). A new id replays it. */
  scrollBack?: { bars: number; id: number };
  intradayLabels?: { long: Intl.DateTimeFormat; short: Intl.DateTimeFormat; clock: Intl.DateTimeFormat };
}) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null>(null);
  const marks = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lastView = useRef<{ sym: string; times: Time[]; range: IRange<number> } | undefined>(undefined);
  const updating = useRef(false);
  const lastGesture = useRef(0);
  const reachStart = useRef(onReachStart);
  useEffect(() => { reachStart.current = onReachStart; }, [onReachStart]);
  const pickTimeRef = useRef(onPickTime);
  useEffect(() => { pickTimeRef.current = onPickTime; }, [onPickTime]);
  const pickBarRef = useRef(pickBar);
  useEffect(() => { pickBarRef.current = pickBar; }, [pickBar]);
  const [localMode, setMode] = useState<Mode>("line");
  const selectedMode = useContext(MarketChartMode);
  const mode = selectedMode ?? localMode;
  const t = useT();

  useEffect(() => {
    const c = createChart(box.current!, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: css("--color-ink-2"), fontFamily: css("--font"), attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { vertLine: { labelBackgroundColor: css("--color-ink") }, horzLine: { labelBackgroundColor: css("--color-ink") } },
    });
    const up = css("--color-gain"), down = css("--color-loss");
    series.current = mode === "line"
      ? c.addSeries(LineSeries, { color: css("--chart-line"), lineWidth: 2, priceLineVisible: false, crosshairMarkerBorderColor: css("--chart-line") })
      : c.addSeries(CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false });
    marks.current = createSeriesMarkers(series.current as ISeriesApi<"Line">, []);
    chart.current = c;
    const scale = c.timeScale();
    const element = box.current!;
    const onWheel = () => { lastGesture.current = performance.now(); };
    const onPointerMove = (event: PointerEvent) => {
      if (event.buttons || event.pointerType === "touch") lastGesture.current = performance.now();
    };
    const onRange = (range: IRange<number> | null) => {
      const previous = lastView.current;
      if (!range || !previous || updating.current) return;
      lastView.current = { ...previous, range };
      if (lastGesture.current && performance.now() - lastGesture.current < 500 &&
          range.from < previous.range.from && range.from < 18) reachStart.current?.();
    };
    const onClick = (param: { time?: Time }) => {
      if (pickBarRef.current && param.time) pickTimeRef.current?.(timeToIso(param.time), param.time);
    };
    c.subscribeClick(onClick);
    if (scrollHistory) {
      scale.subscribeVisibleLogicalRangeChange(onRange);
      element.addEventListener("wheel", onWheel, { capture: true, passive: true });
      element.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
    }
    return () => {
      c.unsubscribeClick(onClick);
      if (scrollHistory) {
        scale.unsubscribeVisibleLogicalRangeChange(onRange);
        element.removeEventListener("wheel", onWheel, true);
        element.removeEventListener("pointermove", onPointerMove, true);
      }
      c.remove();
      chart.current = null;
      series.current = null;
    };
  }, [mode, scrollHistory]);

  // TradingView-style cut crosshair while picking a bar on the chart.
  // Rewind animation: the chart's own animated scroll slides the view back by N bars.
  const scrollBackId = scrollBack?.id, scrollBackBars = scrollBack?.bars ?? 0;
  useEffect(() => {
    if (scrollBackId === undefined || !chart.current) return;
    chart.current.timeScale().scrollToPosition(-scrollBackBars, true);
  }, [scrollBackId, scrollBackBars]);

  useEffect(() => {
    if (!chart.current) return;
    chart.current.applyOptions({
      crosshair: {
        vertLine: {
          color: pickBar ? css("--color-ink") : undefined,
          width: pickBar ? 2 : 1,
          labelBackgroundColor: css("--color-ink"),
        },
        horzLine: { visible: !pickBar, labelBackgroundColor: css("--color-ink") },
      },
    });
  }, [pickBar, mode]);

  useEffect(() => {
    if (!series.current || !chart.current) return;
    const scale = chart.current.timeScale();
    const previous = lastView.current?.sym === sym ? lastView.current : undefined;
    updating.current = true;
    if (mode === "line") (series.current as ISeriesApi<"Line">).setData(prices.flatMap((v, i) => replayBars?.[i]?.closed ? [] : [{ time: times[i] as Time, value: v }]));
    else (series.current as ISeriesApi<"Candlestick">).setData(replayBars
      ? replayBars.flatMap(({ open, high, low, close, closed }, i) => closed ? [] : [{ time: times[i] as Time, open, high, low, close }])
      : toCandles(sym, prices, times));
    // Trades as quiet dots sitting on the price (Robinhood-style): a white halo, then a small dot in the
    // trade's colour (buy = gain green, sell = loss red). No arrows or text on the chart; details live in Positions.
    const gain = css("--color-gain"), loss = css("--color-loss"), halo = css("--color-white") || "#ffffff";
    marks.current!.setMarkers(trades.filter((t) => t.i >= 0 && t.i < prices.length).flatMap((t) => {
      const at = { time: times[t.i] as Time, position: "atPriceMiddle" as const, price: prices[t.i], shape: "circle" as const };
      return [
        { ...at, color: halo, size: 1.6, id: `${t.i}-${t.side}-halo` },
        { ...at, color: t.side === "buy" ? gain : loss, size: 0.9, id: `${t.i}-${t.side}` },
      ];
    }));
    if (scrollHistory) {
      const plotted = times.filter((_, i) => !replayBars?.[i]?.closed);
      if (plotted.length) {
        scale.setVisibleLogicalRange(historyViewport(previous, plotted, intradayLabels ? 90 : 48));
        const range = scale.getVisibleLogicalRange();
        if (range) lastView.current = { sym, times: plotted, range };
      }
    } else {
      scale.fitContent();
    }
    updating.current = false;
  }, [sym, prices, replayBars, times, trades, mode, scrollHistory, intradayLabels]);

  // Replays hide the real date: the axis and crosshair then show the caller's own labels ("Day 3").
  useEffect(() => {
    if (!chart.current) return;
    if (intradayLabels) {
      chart.current.applyOptions({
        localization: { timeFormatter: (time: Time) => intradayLabels.long.format(Number(time) * 1000) },
        timeScale: {
          timeVisible: true,
          tickMarkFormatter: (time: Time, kind: TickMarkType) =>
            (kind === TickMarkType.Time ? intradayLabels.clock : intradayLabels.short).format(Number(time) * 1000),
        },
      });
      return;
    }
    if (!format) return;
    const f = (t: Time) => format(timeToIso(t));
    chart.current.applyOptions({ localization: { timeFormatter: f }, timeScale: { tickMarkFormatter: f } });
  }, [format, intradayLabels, mode]);

  function showEarlier() {
    const scale = chart.current?.timeScale();
    const range = scale?.getVisibleLogicalRange();
    if (!scale || !range) return;
    if (range.from < 1) {
      reachStart.current?.();
      return;
    }
    const offset = Math.min(range.from, (range.to - range.from) * 0.75);
    const from = range.from - offset;
    scale.setVisibleLogicalRange({ from, to: range.to - offset });
    if (from < 18) reachStart.current?.();
  }

  return (
    <>
      <div className="chart-tools">
        {scrollHistory && <button className="btn btn-outline" onClick={showEarlier}>{t("← Earlier", "← Früher")}</button>}
        {selectedMode === null && <div className="seg" role="group" aria-label={t("Chart type", "Chartart")}>
          <button aria-pressed={mode === "line"} onClick={() => setMode("line")}>{t("Line", "Linie")}</button>
          <button aria-pressed={mode === "candles"} onClick={() => setMode("candles")}>{t("Candles", "Kerzen")}</button>
        </div>}
      </div>
      <div ref={box} className={pickBar ? "candle-chart is-picking" : "candle-chart"} />
    </>
  );
}
