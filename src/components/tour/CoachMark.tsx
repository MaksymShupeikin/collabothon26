"use client";
import { useEffect, useState, type ReactNode } from "react";
import ProgressRing from "../ProgressRing";

/** First *visible* [data-tour=name]: preserved (hidden) routes keep their DOM around. */
export function findTarget(name?: string): HTMLElement | null {
  if (!name) return null;
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) if (el.getClientRects().length) return el;
  return null;
}

/**
 * The screen dims, one element lights up and a coach bubble explains it.
 * Nothing is blocked: the player clicks the real interface underneath.
 */
export default function CoachMark({ target, title, children, progress, step, footer, place }: {
  target?: string; title: string; children: ReactNode; progress: number; step: string; footer?: ReactNode; place?: "corner";
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let el: HTMLElement | null = null;
    let scrolled = false;
    const update = () => {
      const found = findTarget(target);
      if (found !== el) { el = found; scrolled = false; }
      if (el && !scrolled) {
        const r = el.getBoundingClientRect();
        if (r.top < 80 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: "center", behavior: "smooth" });
        scrolled = true;
      }
      setRect((prev) => {
        const r = el?.getBoundingClientRect() ?? null;
        if (!r || !prev) return r;
        return Math.abs(r.top - prev.top) + Math.abs(r.left - prev.left) + Math.abs(r.width - prev.width) + Math.abs(r.height - prev.height) < 1 ? prev : r;
      });
    };
    update();
    const id = window.setInterval(update, 150); // follows scrolling, layout changes and view switches
    window.addEventListener("resize", update);
    return () => { window.clearInterval(id); window.removeEventListener("resize", update); };
  }, [target]);

  const pad = 6, W = 360, H = 260, vw = typeof window === "undefined" ? 1200 : window.innerWidth, vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const left = rect ? Math.min(Math.max(16, rect.left), vw - W - 16) : 0;
  const style = place === "corner" ? { bottom: 16, right: 16 } : !rect
    ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
    : rect.bottom + H < vh ? { top: rect.bottom + 16, left }
    : rect.top > H ? { top: rect.top - 16, left, transform: "translateY(-100%)" }
    : rect.right + W + 32 < vw ? { top: Math.max(16, Math.min(rect.top, vh - H)), left: rect.right + 16 }
    : { bottom: 16, right: 16 };

  return (
    <>
      {rect ? (
        <div className="coach-spot" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }} />
      ) : (
        <div className="coach-dim" />
      )}
      <div className="coach-bubble" role="dialog" aria-live="polite" aria-label={title} style={style}>
        <div className="coach-head">
          <ProgressRing value={progress} size={28} label={step} />
          <span className="xs muted">{step}</span>
        </div>
        <h3>{title}</h3>
        {children}
        {footer}
      </div>
    </>
  );
}
