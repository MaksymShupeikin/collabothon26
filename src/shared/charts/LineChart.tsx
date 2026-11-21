export type Series = { values: number[]; color: string; label: string; width?: number; dash?: string };
export type Marker = { i: number; label: string; kind: "buy" | "sell" | "bot" };

const W = 600, H = 220, PAD = 8;

/** Minimal SVG line chart: no dependency needed for a few polylines. */
/** `topLast`: draw series[0] on top of the others (it still sets the markers). */
export default function LineChart({ series, markers = [], length, height = H, topLast = false }: { series: Series[]; markers?: Marker[]; length?: number; height?: number; topLast?: boolean }) {
  const all = series.flatMap((s) => s.values);
  if (all.length < 2) return <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label="No data yet" />;
  const min = Math.min(...all), max = Math.max(...all);
  const n = Math.max(length ?? 0, ...series.map((s) => s.values.length)) - 1 || 1;
  const x = (i: number) => PAD + (i / n) * (W - 2 * PAD);
  const y = (v: number) => height - PAD - ((v - min) / (max - min || 1)) * (height - 2 * PAD);
  const main = series[0].values;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={`Chart: ${series.map((s) => s.label).join(", ")}`}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={W} y1={height * f} y2={height * f} stroke="var(--color-bg-light)" />
      ))}
      {(topLast ? [...series.slice(1), series[0]] : series).map((s) => (
        <polyline key={s.label} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeLinejoin="round" strokeDasharray={s.dash} strokeLinecap={s.dash ? "round" : undefined}
          points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
      ))}
      {markers.filter((m) => m.i < main.length).map((m, k) => (
        <circle key={k} cx={x(m.i)} cy={y(main[m.i])} r={m.kind === "bot" ? 4 : 6}
          fill={m.kind === "buy" ? "var(--color-gain)" : m.kind === "sell" ? "var(--color-loss)" : "var(--color-border)"}
          stroke="var(--color-white)" strokeWidth={2}>
          <title>{m.label}</title>
        </circle>
      ))}
    </svg>
  );
}
