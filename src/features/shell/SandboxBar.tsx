"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { rankOf, useGame } from "@/features/game/store";
import ProgressRing from "@/shared/ui/ProgressRing";

/** Thin bar above the copied comdirect screens: makes clear this is the training sandbox (🆕, not comdirect). */
export default function SandboxBar({ clock, dark = false }: { clock?: string; dark?: boolean }) {
  const save = useGame();
  const rank = rankOf(save.xp);
  return (
    <div className={`sbar ${dark ? "dark" : ""}`} role="region" aria-label="Training sandbox">
      <span className="sbar-tag">Training sandbox</span>
      <span className="sbar-note">Play money · nothing here is real</span>
      {clock && <span className="sbar-clock num" aria-label="Simulated time">{clock}</span>}
      <span className="sbar-right">
        <span className="sbar-rank" title={`${save.xp} XP`} data-xp-target>
          <ProgressRing value={rank.progress} size={24} label={`Rank ${rank.name}, ${Math.round(rank.progress * 100)} % to the next rank`} center={rank.level} />
          <span><strong>{rank.name}</strong> <span className="num sbar-xp"><TickingXp value={save.xp} /> XP</span></span>
        </span>
        <Link href="/" className="sbar-link">Learning map</Link>
      </span>
    </div>
  );
}

/** Counts up to the new total once the flying "+N XP" has landed in the chip. */
function TickingXp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (value <= start || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => setShown(value), 0);
      return () => window.clearTimeout(id);
    }
    let raf = 0;
    const t0 = performance.now() + 1400, dur = 600;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); setShown(value); };
  }, [value]);
  return <>{shown}</>;
}
