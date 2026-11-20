"use client";
import { useEffect, useRef } from "react";
import { CandlestickSeries, createChart, createSeriesMarkers, type IChartApi, type ISeriesApi, type ISeriesMarkersPluginApi, type Time } from "lightweight-charts";
import { rng } from "@/lib/rng";

export type TradeMark = { i: number; side: "buy" | "sell"; label: string };

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

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Candlestick chart (TradingView Lightweight Charts) in the app's palette. */
export default function CandleChart({ sym, prices, times, trades }: { sym: string; prices: number[]; times: string[]; trades: TradeMark[] }) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const marks = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    const c = createChart(box.current!, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: css("--color-ink-2"), fontFamily: css("--font"), attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: css("--color-bg-light") } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { vertLine: { labelBackgroundColor: css("--color-ink") }, horzLine: { labelBackgroundColor: css("--color-ink") } },
    });
    const up = css("--color-gain"), down = css("--color-loss");
    series.current = c.addSeries(CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false });
    marks.current = createSeriesMarkers(series.current, []);
    chart.current = c;
    return () => { c.remove(); chart.current = null; };
  }, []);

  useEffect(() => {
    if (!series.current) return;
    series.current.setData(toCandles(sym, prices, times));
    marks.current!.setMarkers(trades.filter((t) => t.i < prices.length).map((t) => ({
      time: times[t.i] as Time, position: t.side === "buy" ? "belowBar" : "aboveBar", shape: t.side === "buy" ? "arrowUp" : "arrowDown",
      color: css("--color-ink"), text: t.label,
    })));
    chart.current!.timeScale().fitContent();
  }, [sym, prices, times, trades]);

  return <div ref={box} className="candle-chart" />;
}
