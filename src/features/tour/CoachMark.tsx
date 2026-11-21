"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

/** First *visible* [data-tour=name]: preserved (hidden) routes keep their DOM around. */
export function findTarget(name?: string): HTMLElement | null {
  if (!name) return null;
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) if (el.getClientRects().length) return el;
  return null;
}

/**
 * The screen dims, one element lights up and a coach bubble explains it.
 * The interface underneath only reacts when the step needs it: on explanation steps only the bubble
 * is clickable, on the player's turn the highlighted element (or the step's zone) works too.
 */
type Box = { top: number; left: number; width: number; height: number };
const M = 16, GAP = 16;

function overlap(a: Box, b: Box) {
  const x = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const y = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return x > 0 && y > 0 ? x * y : 0;
}

/**
 * Picks where the bubble goes, using its measured size. Explanations sit next to the target
 * (right, below, above, left); on the player's turn the bubble docks in a corner so the screen stays free.
 * The first candidate that fits on screen without touching the target wins, else the one covering least.
 */
function placeBubble(rect: DOMRect | null, size: { w: number; h: number }, vw: number, vh: number, dock: boolean): CSSProperties {
  const { w, h } = size;
  const clampX = (x: number) => Math.min(Math.max(M, x), vw - w - M);
  const clampY = (y: number) => Math.min(Math.max(M, y), vh - h - M);
  const corners: Box[] = [
    { top: vh - h - M, left: vw - w - M, width: w, height: h }, // bottom-right
    { top: vh - h - M, left: M, width: w, height: h },          // bottom-left
    { top: M + 64, left: vw - w - M, width: w, height: h },     // top-right, below the header
  ];
  if (!rect) return dock ? { top: corners[0].top, left: corners[0].left } : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  const t: Box = { top: rect.top - GAP / 2, left: rect.left - GAP / 2, width: rect.width + GAP, height: rect.height + GAP };
  const beside: Box[] = [
    { top: clampY(rect.top), left: rect.right + GAP, width: w, height: h },          // right
    { top: rect.bottom + GAP, left: clampX(rect.left), width: w, height: h },        // below
    { top: rect.top - GAP - h, left: clampX(rect.left), width: w, height: h },       // above
    { top: clampY(rect.top), left: rect.left - GAP - w, width: w, height: h },       // left
  ];
  const candidates = dock ? corners : [...beside, ...corners];
  const fits = (b: Box) => b.left >= M - 0.5 && b.top >= M - 0.5 && b.left + b.width <= vw - M + 0.5 && b.top + b.height <= vh - M + 0.5;
  const best = candidates.find((b) => fits(b) && !overlap(b, t))
    ?? candidates.filter(fits).sort((a, b) => overlap(a, t) - overlap(b, t))[0]
    ?? corners[0];
  return { top: best.top, left: best.left };
}

/** Pointer and key events that would act on the interface. Scrolling and hovering stay free. */
const GATED = ["pointerdown", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "touchstart", "keydown"] as const;
const FREE_KEYS = new Set(["Tab", "Shift", "Escape", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

/**
 * Blocks interaction outside the bubble and the allowed zone ([data-tour=allow]).
 * allow "*" leaves everything open; an allowed zone that isn't on screen (the player has to get there first) does too.
 */
function useActionGate(bubble: RefObject<HTMLDivElement | null>, allow: string | undefined, onBlocked: () => void) {
  const blockedRef = useRef(onBlocked);
  useEffect(() => { blockedRef.current = onBlocked; });
  useEffect(() => {
    if (allow === "*") return;
    const gate = (e: Event) => {
      const node = e.target as Node | null;
      if (!node || bubble.current?.contains(node)) return;
      if (allow) {
        const zone = findTarget(allow);
        if (!zone || zone.contains(node)) return;
      }
      if (e instanceof KeyboardEvent && FREE_KEYS.has(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "pointerdown") blockedRef.current();
    };
    for (const t of GATED) window.addEventListener(t, gate, { capture: true });
    return () => { for (const t of GATED) window.removeEventListener(t, gate, { capture: true }); };
  }, [allow, bubble]);
}

export default function CoachMark({ target, title, children, progress, step, footer, place, live, allow }: {
  target?: string; title: string; children: ReactNode; progress: number; step: string; footer?: ReactNode; place?: "corner";
  /** The player's turn: no dimming, the target just glows softly so the real screen stays readable. */
  live?: boolean;
  /** data-tour name the player may interact with ("*" = anything). Unset: only the bubble reacts. */
  allow?: string;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 380, h: 260 });
  const [view, setView] = useState({ vw: 1200, vh: 800 });
  // A click on a locked part of the screen nudges the bubble, so it's clear where to look.
  const [nudge, setNudge] = useState(0);
  useActionGate(bubbleRef, allow, () => setNudge((n) => n + 1));
  useEffect(() => {
    if (!nudge) return;
    const el = bubbleRef.current;
    el?.classList.remove("is-nudge");
    void el?.offsetWidth; // restart the animation
    el?.classList.add("is-nudge");
  }, [nudge]);

  // Real bubble size, so placement never guesses (content changes per step).
  useEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const measure = () => setSize((p) => (Math.abs(p.w - el.offsetWidth) + Math.abs(p.h - el.offsetHeight) < 1 ? p : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    const onResize = () => { setView({ vw: window.innerWidth, vh: window.innerHeight }); update(); };
    onResize();
    const id = window.setInterval(update, 150); // follows scrolling, layout changes and view switches
    window.addEventListener("resize", onResize);
    return () => { window.clearInterval(id); window.removeEventListener("resize", onResize); };
  }, [target]);

  const pad = 6;
  const style: CSSProperties = place === "corner" ? { bottom: M, right: M } : placeBubble(rect, size, view.vw, view.vh, !!live);

  const [chapter, ...more] = step.split(" · ");
  const rest = more.join(" · ");
  const pct = Math.max(0, Math.min(1, progress)) * 100;

  return (
    <>
      {rect ? (
        <div className={`coach-spot${live ? " is-live" : ""}`} style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }} />
      ) : !live && (
        <div className="coach-dim" />
      )}
      <div ref={bubbleRef} className={`coach-bubble${live ? " is-docked" : ""}`} role="dialog" aria-live="polite" aria-label={title} style={style}>
        <div className="coach-head">
          <span className="coach-step">
            <strong>{chapter}</strong>{rest && <span>{rest}</span>}
          </span>
          <div className="coach-bar" role="progressbar" aria-label={step} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        <h3>{title}</h3>
        {children}
        {footer}
      </div>
    </>
  );
}
