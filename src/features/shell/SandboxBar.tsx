"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { rankOf, useGame } from "@/features/game/store";
import ProgressRing from "@/shared/ui/ProgressRing";
import { useT } from "@/shared/lib/i18n";
import LangSwitch from "@/features/shell/LangSwitch";

/** Thin bar above the copied comdirect screens: makes clear this is the training sandbox (🆕, not comdirect). */
export default function SandboxBar({ clock, dark = false, onSimple }: { clock?: string; dark?: boolean; onSimple?: () => void }) {
  const save = useGame();
  const rank = rankOf(save.xp);
  const t = useT();
  return (
    <div className={`sbar ${dark ? "dark" : ""}`} role="region" aria-label={t("Training sandbox", "Trainings-Sandbox")}>
      <span className="sbar-tag">{t("Training sandbox", "Trainings-Sandbox")}</span>
      <span className="sbar-note">{t("Play money · nothing here is real", "Spielgeld · hier ist nichts echt")}</span>
      {clock && <span className="sbar-clock num" aria-label={t("Simulated time", "Simulierte Zeit")}>{clock}</span>}
      <span className="sbar-right">
        <span className="sbar-rank" title={`${save.xp} XP`} data-xp-target>
          <ProgressRing value={rank.progress} size={24} label={t(`Rank ${rank.name}, ${Math.round(rank.progress * 100)} % to the next rank`, `Rang ${t(rank.name)}, ${Math.round(rank.progress * 100)} % bis zum nächsten Rang`)} center={rank.level} />
          <span><strong>{t(rank.name)}</strong> <span className="num sbar-xp"><TickingXp value={save.xp} /> XP</span></span>
        </span>
        <LangSwitch />
        {onSimple && <button type="button" className="sbar-link" onClick={onSimple}>{t("Simple view", "Einfache Ansicht")}</button>}
        <Link href="/" className="sbar-link">{t("Learning map", "Lernpfad")}</Link>
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
