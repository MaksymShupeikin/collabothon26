"use client";
import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, LineSeries, createChart, createSeriesMarkers, type IChartApi, type ISeriesApi, type ISeriesMarkersPluginApi, type Time } from "lightweight-charts";
import { rng } from "@/shared/lib/rng";
import { useT } from "@/shared/lib/i18n";

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

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Price chart (TradingView Lightweight Charts) in the app's palette. Default: one calm line; candles on demand. */
export default function CandleChart({ sym, prices, times, trades, format }: { sym: string; prices: number[]; times: string[]; trades: TradeMark[]; format?: (time: string) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null>(null);
  const marks = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [mode, setMode] = useState<Mode>("line");
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
    return () => { c.remove(); chart.current = null; series.current = null; };
  }, [mode]);

  useEffect(() => {
    if (!series.current) return;
    if (mode === "line") (series.current as ISeriesApi<"Line">).setData(prices.map((v, i) => ({ time: times[i] as Time, value: v })));
    else (series.current as ISeriesApi<"Candlestick">).setData(toCandles(sym, prices, times));
    marks.current!.setMarkers(trades.filter((t) => t.i < prices.length).map((t) => ({
      time: times[t.i] as Time, position: t.side === "buy" ? "belowBar" : "aboveBar", shape: t.side === "buy" ? "arrowUp" : "arrowDown",
      color: css("--color-ink"), text: t.label,
    })));
    chart.current!.timeScale().fitContent();
  }, [sym, prices, times, trades, mode]);

  // Replays hide the real date: the axis and crosshair then show the caller's own labels ("Day 3").
  useEffect(() => {
    if (!chart.current || !format) return;
    const iso = (t: Time) => (typeof t === "object" ? `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}` : typeof t === "number" ? new Date(t * 1000).toISOString().slice(0, 10) : t);
    const f = (t: Time) => format(iso(t));
    chart.current.applyOptions({ localization: { timeFormatter: f }, timeScale: { tickMarkFormatter: f } });
  }, [format, mode]);

  return (
    <>
      <div className="chart-tools">
        <div className="seg" role="group" aria-label={t("Chart type", "Chartart")}>
          <button aria-pressed={mode === "line"} onClick={() => setMode("line")}>{t("Line", "Linie")}</button>
          <button aria-pressed={mode === "candles"} onClick={() => setMode("candles")}>{t("Candles", "Kerzen")}</button>
        </div>
      </div>
      <div ref={box} className="candle-chart" />
    </>
  );
}
