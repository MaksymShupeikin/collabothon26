"use client";
import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, LineSeries, createChart, createSeriesMarkers, type IChartApi, type ISeriesApi, type ISeriesMarkersPluginApi, type Time } from "lightweight-charts";
import { rng } from "@/lib/rng";

export type TradeMark = { i: number; side: "buy" | "sell"; label: string };
type Mode = "line" | "candles";

// The engine simulates daily closes; candles are built from them: open = previous close,
// wicks = a small seeded random overshoot, so the same market always draws the same candles.
function toCandles(sym: string, prices: number[], times: string[]) {
  let seed = 0;
  for (const ch of sym) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return prices.map((c, i) => {
    const o = i ? prices[i - 1] : c;
    const r = rng(seed + i * 7919);
    return { time: times[i] as Time, open: o, close: c, high: Math.max(o, c) * (1 + r() * 0.008), low: Math.min(o, c) * (1 - r() * 0.008) };
  });
}

// Read tokens from the chart's own element, so a scoped theme (e.g. the dark trading screen) applies.
const css = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

/** Price chart (TradingView Lightweight Charts). Default: one calm line; candles on demand. */
export default function CandleChart({ sym, prices, times, trades }: { sym: string; prices: number[]; times: string[]; trades: TradeMark[] }) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null>(null);
  const marks = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [mode, setMode] = useState<Mode>("line");

  useEffect(() => {
    const el = box.current!;
    const c = createChart(el, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: css(el, "--color-ink-2"), fontFamily: css(el, "--font"), attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { vertLine: { labelBackgroundColor: css(el, "--color-bg-light") }, horzLine: { labelBackgroundColor: css(el, "--color-bg-light") } },
    });
    const up = css(el, "--color-gain"), down = css(el, "--color-loss");
    series.current = mode === "line"
      ? c.addSeries(LineSeries, { color: css(el, "--color-accent"), lineWidth: 2, priceLineVisible: false, crosshairMarkerBorderColor: css(el, "--color-accent") })
      : c.addSeries(CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false });
    marks.current = createSeriesMarkers(series.current as ISeriesApi<"Line">, []);
    chart.current = c;
    return () => { c.remove(); chart.current = null; series.current = null; };
  }, [mode]);

  useEffect(() => {
    if (!series.current || !box.current) return;
    if (mode === "line") (series.current as ISeriesApi<"Line">).setData(prices.map((v, i) => ({ time: times[i] as Time, value: v })));
    else (series.current as ISeriesApi<"Candlestick">).setData(toCandles(sym, prices, times));
    const ink = css(box.current, "--color-ink");
    marks.current!.setMarkers(trades.filter((t) => t.i < prices.length).map((t) => ({
      time: times[t.i] as Time, position: t.side === "buy" ? "belowBar" : "aboveBar", shape: t.side === "buy" ? "arrowUp" : "arrowDown",
      color: ink, text: t.label,
    })));
    chart.current!.timeScale().fitContent();
  }, [sym, prices, times, trades, mode]);

  return (
    <>
      <div className="chart-tools">
        <div className="seg" role="group" aria-label="Chart type">
          <button aria-pressed={mode === "line"} onClick={() => setMode("line")}>Line</button>
          <button aria-pressed={mode === "candles"} onClick={() => setMode("candles")}>Candles</button>
        </div>
      </div>
      <div ref={box} className="candle-chart" />
    </>
  );
}
