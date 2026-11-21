"use client";
import { useEffect, useRef } from "react";
import { AreaSeries, createChart, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";

export const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Clean line chart for the web cabinet stock page (layout from the comdirect app's Wertpapier-Details). */
export default function PriceLine({ points, intraday = false }: { points: { time: number | string; value: number }[]; intraday?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    const ink = css("--color-ink");
    const c = createChart(box.current!, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: css("--color-ink-2"), fontFamily: css("--font"), attributionLogo: false, fontSize: 12 },
      grid: { vertLines: { visible: false }, horzLines: { color: css("--color-bg-light"), style: 2 } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { vertLine: { labelBackgroundColor: ink }, horzLine: { labelBackgroundColor: ink } },
      localization: { locale: "en-GB", priceFormatter: (p: number) => p.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      handleScroll: false, handleScale: false,
    });
    series.current = c.addSeries(AreaSeries, { lineColor: ink, lineWidth: 2, topColor: "rgba(11, 31, 38, 0.12)", bottomColor: "rgba(11, 31, 38, 0)", priceLineVisible: false });
    chart.current = c;
    return () => { c.remove(); chart.current = null; };
  }, []);

  useEffect(() => {
    chart.current?.applyOptions({ timeScale: { timeVisible: intraday, secondsVisible: false } });
    series.current?.setData(points.map((p) => ({ time: p.time as Time, value: p.value })));
    chart.current?.timeScale().fitContent();
  }, [points, intraday]);

  return <div ref={box} className="price-line" />;
}
