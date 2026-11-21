"use client";
import { useEffect, useState } from "react";

/** Counts from `from` (default 0) up to `to` while `active`, resets when inactive (so it replays on the next activation). */
export default function CountUp({ to, from = 0, active, duration = 1100, delay = 150, format = String }: { to: number; from?: number; active: boolean; duration?: number; delay?: number; format?: (n: number) => string }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    let raf = 0;
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setV(active ? to : from));
      return () => cancelAnimationFrame(raf);
    }
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / duration));
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 4)))); // ease-out
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, from, active, duration, delay]);
  return <>{format(v)}</>;
}
