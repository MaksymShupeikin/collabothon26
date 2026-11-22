"use client";
import { useEffect, useRef } from "react";
import { CandlestickSeries, createChart, createSeriesMarkers, HistogramSeries, LineSeries, type IChartApi, type IRange, type ISeriesApi, type ISeriesMarkersPluginApi, type PriceFormatCustom, type SeriesMarker, type Time, type UTCTimestamp } from "lightweight-charts";
import { historyViewport } from "@/shared/charts/history-viewport";
import { rng } from "@/shared/lib/rng";
import { css } from "@/shared/charts/PriceLine";
import type { ReplayBar } from "@/features/market/replay-market";

export type ChartMark = { day: number; kind: "you-buy" | "you-sell" | "bot" | "news"; text: string };
const BASE = 1_600_000_000; // fake epoch: one "day" per 86400 s, so real dates never leak into hidden replays
const EURO_PRICE: PriceFormatCustom = {
  type: "custom", minMove: 0.01,
  formatter: (p) => p.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

/**
 * Pro-mode chart widget (layout from ProTrader refs 10/14/42, look from our tokens):
 * candles, volume pane, "last price" tag, player trades in the accent colour, bot avatars, news flags.
 */
export default function ProChart({ sym, closes, replayBars, firstDay, label, marks, type, bollinger, span = 90, scrollHistory = false }: {
  sym: string;
  closes: number[]; // index 0 = firstDay
  replayBars?: ReplayBar[];
  firstDay: number;
  label: (day: number) => string;
  marks: ChartMark[];
  type: "candles" | "line";
  bollinger: boolean;
  span?: number; // bars in view
  scrollHistory?: boolean;
}) {
  const previous = useRef<{ sym: string; times: Time[] } | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candles = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const line = useRef<ISeriesApi<"Line"> | null>(null);
  const vol = useRef<ISeriesApi<"Histogram"> | null>(null);
  const bbU = useRef<ISeriesApi<"Line"> | null>(null);
  const bbL = useRef<ISeriesApi<"Line"> | null>(null);
  const markers = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lineMarkers = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const labelRef = useRef(label);
  useEffect(() => { labelRef.current = label; });

  useEffect(() => {
    const ink = css("--color-ink"), up = css("--color-gain"), down = css("--color-loss");
    const toDay = (t: Time) => Math.round(((t as number) - BASE) / 86400);
    const c = createChart(box.current!, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: css("--color-ink-2"), fontFamily: css("--font"), fontSize: 11, attributionLogo: false, panes: { separatorColor: css("--color-bg-light") } },
      grid: { vertLines: { color: css("--color-bg-light") }, horzLines: { color: css("--color-bg-light") } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 3, tickMarkFormatter: (t: Time) => labelRef.current(toDay(t)) },
      crosshair: { vertLine: { labelBackgroundColor: ink }, horzLine: { labelBackgroundColor: ink } },
      localization: { timeFormatter: (t: Time) => labelRef.current(toDay(t)) },
    });
    candles.current = c.addSeries(CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false, title: "Last price", priceFormat: EURO_PRICE });
    line.current = c.addSeries(LineSeries, { color: ink, lineWidth: 2, visible: false, title: "Last price", priceFormat: EURO_PRICE });
    bbU.current = c.addSeries(LineSeries, { color: css("--color-bg-dark"), lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: EURO_PRICE });
    bbL.current = c.addSeries(LineSeries, { color: css("--color-bg-dark"), lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: EURO_PRICE });
    vol.current = c.addSeries(HistogramSeries, { color: css("--color-bg-dark"), priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false }, 1);
    c.panes()[1]?.setHeight(64);
    markers.current = createSeriesMarkers(candles.current, []);
    lineMarkers.current = createSeriesMarkers(line.current, []);
    chart.current = c;
    return () => { c.remove(); chart.current = null; };
  }, []);

  useEffect(() => {
    if (!candles.current || !chart.current) return;
    const ts = chart.current.timeScale();
    const range = ts.getVisibleLogicalRange();
    const before = previous.current?.sym === sym && range ? { ...previous.current, range } : undefined;
    const t = (i: number) => (BASE + (firstDay + i) * 86400) as UTCTimestamp;
    let seed = 0;
    for (const ch of sym) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const model = replayBars ?? closes.map((cl, i) => {
      const o = i ? closes[i - 1] : cl;
      const r = rng(seed + (firstDay + i) * 7919);
      return { open: o, close: cl, high: Math.max(o, cl) * (1 + r() * 0.008), low: Math.min(o, cl) * (1 - r() * 0.008), activity: 0.4 + r() };
    });
    const data = model.flatMap((bar, i) => (replayBars?.[i]?.closed ? [] : [{ time: t(i), ...bar }]));
    const up = css("--color-gain"), down = css("--color-loss");
    candles.current.setData(data.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })));
    candles.current.applyOptions({ visible: type === "candles" });
    line.current!.setData(data.map((d) => ({ time: d.time, value: d.close })));
    line.current!.applyOptions({ visible: type === "line" });
    const actualVolume = replayBars?.every((bar) => bar.volume !== undefined);
    vol.current!.applyOptions({ priceFormat: replayBars && !actualVolume
      ? { type: "custom", formatter: (v: number) => `${v.toFixed(1)}×`, minMove: 0.1 }
      : { type: "volume" } });
    vol.current!.setData(data.map((d, i) => ({
      time: d.time, value: replayBars
        ? (("volume" in d ? d.volume : undefined) ?? d.activity)
        : Math.round(1e5 * d.activity * (1 + Math.abs(i ? d.close / data[i - 1].close - 1 : 0) * 40)),
      color: d.close >= d.open ? `${up}66` : `${down}66`,
    })));
    // Bollinger band (20, 2)
    const band = (k: number) => data.map((d, i) => {
      if (i < 19) return { time: d.time };
      const w = data.slice(i - 19, i + 1).map((bar) => bar.close), m = w.reduce((a, b) => a + b, 0) / 20;
      const sd = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / 20);
      return { time: d.time, value: m + k * 2 * sd };
    });
    bbU.current!.setData(bollinger ? band(1) : []);
    bbL.current!.setData(bollinger ? band(-1) : []);

    const accent = css("--color-accent"), ink = css("--color-ink"), ink2 = css("--color-ink-2");
    const ms: SeriesMarker<Time>[] = marks
      .filter((m) => m.day >= firstDay && m.day < firstDay + closes.length)
      .sort((a, b) => a.day - b.day)
      .map((m) => ({
        time: t(m.day - firstDay),
        position: m.kind === "you-sell" ? "aboveBar" : m.kind === "news" ? "aboveBar" : "belowBar",
        shape: m.kind === "you-buy" ? "arrowUp" : m.kind === "you-sell" ? "arrowDown" : m.kind === "news" ? "square" : "circle",
        color: m.kind.startsWith("you") ? accent : m.kind === "news" ? ink2 : ink,
        text: m.text,
        size: m.kind.startsWith("you") ? 2 : 1,
      }));
    markers.current!.setMarkers(type === "candles" ? ms : []);
    lineMarkers.current!.setMarkers(type === "line" ? ms : []);
    const n = data.length;
    if (scrollHistory && n > 0) {
      const times = data.map((bar) => bar.time);
      ts.setVisibleLogicalRange(historyViewport(before, times, span));
      previous.current = { sym, times };
    } else {
      ts.setVisibleLogicalRange({ from: Math.max(0, n - span), to: n + 2 });
    }
  }, [sym, closes, replayBars, firstDay, marks, type, bollinger, span, scrollHistory]);

  function showEarlier() {
    const scale = chart.current?.timeScale();
    const range: IRange<number> | null | undefined = scale?.getVisibleLogicalRange();
    if (!scale || !range) return;
    const offset = Math.min(Math.max(0, range.from), (range.to - range.from) * 0.75);
    scale.setVisibleLogicalRange({ from: range.from - offset, to: range.to - offset });
  }

  return <>{scrollHistory && <div className="chart-tools"><button className="btn btn-outline" onClick={showEarlier}>← Earlier</button></div>}<div ref={box} className="pro-chart" /></>;
}
