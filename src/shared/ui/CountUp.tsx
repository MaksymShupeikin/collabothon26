"use client";
import { useEffect, useState } from "react";

/** Counts from 0 up to `to` while `active`, resets to 0 when inactive (so it replays on the next activation). */
export default function CountUp({ to, active, duration = 1100, delay = 150 }: { to: number; active: boolean; duration?: number; delay?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) { setV(0); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(to); return; }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / duration));
      setV(Math.round(to * (1 - Math.pow(1 - p, 4)))); // ease-out
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, active, duration, delay]);
  return <>{v}</>;
}
