"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { onSave } from "@/features/game/store";
import { playXpChime } from "@/features/game/sfx";

type Burst = { id: number; delta: number; x: number; y: number };

/** Where the reward springs from: the coach bubble / done card / mission card if one is up, else mid-screen. */
function origin() {
  for (const sel of [".done-card", ".coach-bubble", ".mission-card"]) {
    const el = document.querySelector<HTMLElement>(sel);
    const r = el?.getBoundingClientRect();
    if (r && r.width) return { x: r.left + r.width / 2, y: Math.max(48, r.top + 8) };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
}

/** Where it lands: the rank chip in the sandbox bar (clamped on screen if the bar is scrolled away). */
function landing() {
  const el = [...document.querySelectorAll<HTMLElement>("[data-xp-target]")].find((e) => e.getClientRects().length);
  const r = el?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : window.innerWidth - 80;
  const y = r ? r.top + r.height / 2 : 24;
  return { el, x: Math.min(Math.max(24, x), window.innerWidth - 24), y: Math.min(Math.max(16, y), window.innerHeight - 16) };
}

/**
 * Every XP gain pops a big "+N XP" over the active card, holds a beat, then flies into the rank chip,
 * which pulses as it lands. Watches the save on every page, so any award (step, quiz, chapter, mission) triggers it.
 */
export default function XpGain() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  // Listens to save writes directly (not the rendered value), so hydration and page changes never
  // read as a gain. Mounted once in the root layout, so it works on every page.
  useEffect(() => {
    return onSave((prev, next) => {
      const delta = next.xp - prev.xp;
      if (delta <= 0) return;
      // Deferred a tick so the next step's bubble is placed first.
      window.setTimeout(() => {
        const { x, y } = origin();
        setBursts((list) => [...list, { id: performance.now() + Math.random(), delta, x, y }]);
        playXpChime();
      }, 0);
    });
  }, []);

  return (
    <div className="xp-layer" aria-live="polite">
      {bursts.map((b) => (
        <XpBurst key={b.id} burst={b} onDone={() => setBursts((list) => list.filter((x) => x.id !== b.id))} />
      ))}
    </div>
  );
}

function XpBurst({ burst, onDone }: { burst: Burst; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { el: target, x, y } = landing();
    const dx = x - burst.x, dy = y - burst.y;
    const at = (tx: number, ty: number, s: number) => `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${s})`;

    const anim = reduce
      ? el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1400 })
      : el.animate(
          [
            { transform: at(0, 12, 0.3), opacity: 0 },
            { transform: at(0, -18, 1.25), opacity: 1, offset: 0.16, easing: "cubic-bezier(0.2, 0, 0, 1)" },
            { transform: at(0, -22, 1), opacity: 1, offset: 0.28 },
            { transform: at(0, -26, 1), opacity: 1, offset: 0.52, easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
            { transform: at(dx, dy, 0.35), opacity: 0.9, offset: 0.94 },
            { transform: at(dx, dy, 0.2), opacity: 0 },
          ],
          { duration: 1500, fill: "forwards" },
        );

    // The chip reacts when the reward arrives.
    const hit = window.setTimeout(() => {
      if (!target) return;
      target.classList.remove("xp-hit");
      void target.offsetWidth;
      target.classList.add("xp-hit");
    }, reduce ? 200 : 1400);
    anim.onfinish = () => done.current();
    return () => { window.clearTimeout(hit); anim.cancel(); };
  }, [burst]);

  return (
    <div ref={ref} className="xp-burst" style={{ left: burst.x, top: burst.y }}>
      <span className="xp-burst-ring" aria-hidden />
      <span className="xp-burst-star" aria-hidden>★</span>
      <strong>+{burst.delta}</strong>
      <span>XP</span>
    </div>
  );
}
