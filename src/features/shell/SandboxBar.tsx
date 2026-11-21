"use client";
import Link from "next/link";
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
        <span className="sbar-rank" title={`${save.xp} XP`}>
          <ProgressRing value={rank.progress} size={24} label={`Rank ${rank.name}, ${Math.round(rank.progress * 100)} % to the next rank`} center={rank.level} />
          <span><strong>{rank.name}</strong> <span className="num">{save.xp} XP</span></span>
        </span>
        <Link href="/" className="sbar-link">Learning map</Link>
      </span>
    </div>
  );
}
