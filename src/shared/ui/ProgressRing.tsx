/** Yellow progress ring on a petrol disc; used for chapter progress and the rank ring. */
export default function ProgressRing({ value, size = 32, label, center }: { value: number; size?: number; label: string; center?: string | number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label}>
      <circle cx="60" cy="60" r="60" className="ring-bg" />
      <circle cx="60" cy="60" r="44" className="ring-track" />
      <circle cx="60" cy="60" r="44" className="ring-fill" transform="rotate(-90 60 60)" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - v * 100} />
      {center !== undefined && <text x="60" y="63" className="ring-num">{center}</text>}
    </svg>
  );
}
