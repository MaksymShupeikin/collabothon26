import { useEffect, useState } from "react";

export type CoachStep = { target?: string; title: string; text: string; task?: string };

/** Dims the page, spotlights [data-tour=target] and explains it. `canNext` gates action steps. */
export default function CoachMark({ step, index, total, canNext, onNext, onSkip }: {
  step: CoachStep; index: number; total: number; canNext: boolean; onNext: () => void; onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("coach-target");
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const id = window.setInterval(update, 200); // follows smooth scroll and layout changes
    window.addEventListener("resize", update);
    return () => { el.classList.remove("coach-target"); window.clearInterval(id); window.removeEventListener("resize", update); };
  }, [step.target]);

  const pad = 6;
  const BUBBLE_H = 240;
  const left = rect ? Math.min(Math.max(16, rect.left), window.innerWidth - 376) : 0;
  // Below the target if it fits, else above, else pinned to the bottom (targets taller than the screen).
  const bubbleStyle = !rect
    ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
    : rect.bottom + BUBBLE_H < window.innerHeight ? { top: rect.bottom + 16, left }
    : rect.top > BUBBLE_H ? { top: rect.top - 16, left, transform: "translateY(-100%)" }
    : { bottom: 16, right: 16 };

  return (
    <>
      {/* Blocks clicks outside the spotlight; the spotlighted element sits above it. */}
      <div className="coach-block" style={rect ? { background: "transparent" } : { background: "rgba(11, 31, 38, 0.6)" }} />
      {rect && <div className="coach-spot" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }} />}
      <div className="coach-bubble" role="dialog" aria-live="polite" aria-label={step.title} style={bubbleStyle}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="badge">Step {index + 1} / {total}</span>
          <span className="xs muted">+10 XP</span>
        </div>
        <h3>{step.title}</h3>
        <p className="small">{step.text}</p>
        {step.task && <p className="small"><strong>Your turn:</strong> {step.task} {canNext ? "✓" : ""}</p>}
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-ghost btn-sm" onClick={onSkip}>Skip tour</button>
          <button className="btn btn-primary" onClick={onNext} disabled={!canNext}>{index + 1 === total ? "Finish" : "Next"}</button>
        </div>
      </div>
    </>
  );
}
