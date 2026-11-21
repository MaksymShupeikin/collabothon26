"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { chapterById, nextChapter, surfaceHref, type Chapter, type Ctx, type Step } from "@/lib/game/chapters";
import { PERSONAS } from "@/lib/game/personas";
import { actions, useGame } from "@/lib/game/store";
import { priceNow } from "@/lib/sim/engine";
import { setUi, useUi } from "@/lib/game/ui";
import MiniGameView from "../MiniGames";
import CoachMark from "./CoachMark";
import ConceptCard from "./ConceptCard";
import Icon from "../Icon";

const persona = (c: Ctx) => PERSONAS[c.save.persona ?? "starter"];
const resolve = (v: string | ((c: Ctx) => string) | undefined, c: Ctx) => (typeof v === "function" ? v(c) : v ?? "");

/** Runs the active chapter (spotlight tour) or mission (no spotlight, hint, stars) on a sandbox surface. */
export default function TourRunner({ surface }: { surface: "cabinet" | "pro" }) {
  const save = useGame();
  const ui = useUi();
  const ch = save.active ? chapterById(save.active) : undefined;
  if (!ch || ch.surface !== surface) return null;
  if (ch.kind === "boss") return null; // the boss round is run by the replay itself
  return ch.mission ? <MissionCard key={ch.id} ch={ch} ctx={{ save, ui }} /> : <ChapterTour key={ch.id} ch={ch} ctx={{ save, ui }} />;
}

function ChapterTour({ ch, ctx }: { ch: Chapter; ctx: Ctx }) {
  const steps = ch.steps ?? [];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const step: Step | undefined = steps[i];
  const isTask = !!step?.done && !step.quiz;
  const taskDone = isTask && step.done!(ctx);
  const taskText = step ? resolve(step.task, ctx) : "";

  function next() {
    actions.award(`${ch.id}:${i}`, 10);
    setPicked(null);
    if (i + 1 >= steps.length) {
      setFinished(true);
      (ch.card ?? []).forEach(actions.collect);
      actions.award(`${ch.id}:done`, 30);
      actions.finish(ch.id);
    } else setI(i + 1);
  }

  // Action steps continue by themselves once the action is done: no "Next" button for things the player can do.
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; });
  useEffect(() => {
    if (!taskDone) return;
    const id = window.setTimeout(() => nextRef.current(), 650);
    return () => window.clearTimeout(id);
  }, [taskDone, i]);

  if (finished) return <ChapterDone ch={ch} />;
  if (!step) return null;

  const quizDone = step.quiz && picked === step.quiz.answer;
  return (
    <CoachMark target={step.target} place={step.place} title={step.title} progress={i / steps.length} step={`${ch.n} · Step ${i + 1} of ${steps.length}`}
      footer={
        <div className="row coach-foot">
          <button className="btn btn-ghost btn-sm" onClick={() => { actions.start(null); setUi({}); }}>Leave chapter</button>
          {isTask ? (
            <span className={`xs ${taskDone ? "up" : "muted"}`}>{taskDone ? "✓ Done, +10 XP" : "Do it in the screen behind"}</span>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={next} disabled={!!step.quiz && !quizDone}>{i + 1 === steps.length ? "Finish" : "Next"}</button>
          )}
        </div>
      }>
      <p className="small">{resolve(step.text, ctx)}</p>
      {isTask && taskText && <p className="small task"><strong>Your turn:</strong> {taskText}</p>}
      {step.game && <div className="coach-game"><MiniGameView game={step.game} /></div>}
      {step.quiz && (
        <div className="stack-sm">
          <p className="small"><strong>{step.quiz.q}</strong></p>
          {step.quiz.options.map((o, k) => (
            <button key={o} className={`option ${picked !== null && k === step.quiz!.answer && picked === k ? "right" : picked === k ? "wrong" : ""}`}
              disabled={!!quizDone} onClick={() => { setPicked(k); if (k === step.quiz!.answer) actions.understood(`${ch.id}:q${i}`, 15); }}>
              {o}
            </button>
          ))}
          {picked !== null && <p className="xs">{picked === step.quiz.answer ? step.quiz.why : "Not quite. Try again."}</p>}
        </div>
      )}
    </CoachMark>
  );
}

/** End of a chapter: the concept card drops into the collection. */
export function ChapterDone({ ch, extra }: { ch: Chapter; extra?: React.ReactNode }) {
  const save = useGame();
  const next = nextChapter(save);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Chapter complete">
      <div className="modal modal-mid">
        <span className="badge badge-accent">{ch.n} complete</span>
        <h2>{ch.title}</h2>
        {extra}
        {(ch.card ?? []).length > 0 && (
          <>
            <p className="small"><Icon name="card" size={22} /> {(ch.card ?? []).length === 1 ? "A new concept card" : "New concept cards"} for your collection ({save.cards.length} / 12). Turn it over for a quick question.</p>
            <div className="card-row">{(ch.card ?? []).map((c) => <ConceptCard key={c} id={c} />)}</div>
          </>
        )}
        <div className="row">
          <Link className="btn btn-outline" href="/learn" onClick={() => actions.start(null)}>Learning map</Link>
          {next && next.id !== ch.id && (
            <Link className="btn btn-primary" href={surfaceHref(next)} onClick={() => { if (next.id === "w1") actions.resetSandbox(); actions.start(next.id); setUi({}); }}>
              Next: {next.n} {next.title} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MissionCard({ ch, ctx }: { ch: Chapter; ctx: Ctx }) {
  const m = ch.mission!;
  const [hint, setHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  // Mission progress lives in the ui bus (an external store), so the store-driven checks below don't setState in effects.
  const result = ctx.ui.mission as { id: string; phase: "week" | "find" | "done"; stars: number } | undefined;
  const mine = result?.id === ch.id ? result : undefined;
  const phase = mine?.phase ?? "play";
  const stars = mine?.stars ?? 0;
  const setPhase = (p: "week" | "find" | "done") => setUi({ mission: { id: ch.id, phase: p, stars } });
  const [open, setOpen] = useState(true);
  const last = useRef(0);
  useEffect(() => { setUi({ mission: undefined }); }, []);

  // A hint appears after ~20 s without any input, or on request.
  useEffect(() => {
    last.current = Date.now();
    const poke = () => { last.current = Date.now(); };
    window.addEventListener("pointerdown", poke);
    window.addEventListener("keydown", poke);
    const id = window.setInterval(() => {
      if (phase === "play" && Date.now() - last.current > 20000) { setHint(true); setUsedHint(true); }
    }, 1000);
    return () => { window.removeEventListener("pointerdown", poke); window.removeEventListener("keydown", poke); window.clearInterval(id); };
  }, [phase]);

  const ok = phase === "play" && m.check(ctx);
  const smart = m.smart(ctx);
  useEffect(() => {
    if (!ok) return;
    const s = 1 + (usedHint ? 0 : 1) + (smart ? 1 : 0);
    actions.award(`${ch.id}:done`, 50 + s * 20);
    setUi({ mission: { id: ch.id, phase: m.after === "week" ? "week" : "done", stars: s } });
    if (m.after !== "week") { (ch.card ?? []).forEach(actions.collect); actions.finish(ch.id, s); }
  }, [ok, smart, usedHint, ch, m.after]);

  function found() {
    (ch.card ?? []).forEach(actions.collect);
    actions.award(`${ch.id}:pnl`, 20);
    actions.finish(ch.id, stars);
    if (ch.id === "w1") actions.unlockPro();
    setPhase("done");
  }

  // One week later, in the depot: point at the profit or loss before the big moment.
  if (phase === "find" && ctx.ui.view === "depot") {
    const s = ctx.save.sim, h = s.acct.holdings[persona(ctx).w1.sym];
    const pl = h ? h.qty * priceNow(s, persona(ctx).w1.sym) - h.cost : 0;
    return (
      <CoachMark target="depot-pnl" title="One week later" progress={1} step="Mission · found it"
        footer={<div className="row coach-foot"><span /><button className="btn btn-primary btn-sm" onClick={found}>Continue</button></div>}>
        <p className="small">Your position is worth <strong className={pl >= 0 ? "up" : "down"}>{pl >= 0 ? "+" : "−"}{Math.abs(pl).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong> {pl >= 0 ? "more" : "less"} than you paid, costs included. That&apos;s your profit or loss, on paper until you sell.</p>
      </CoachMark>
    );
  }

  if (phase === "done") {
    if (ch.id === "w1") return <ProUnlocked stars={stars} />;
    return <ChapterDone ch={ch} extra={<Stars n={stars} smartLabel={m.smartLabel} />} />;
  }

  return (
    <aside className={`mission-card ${open ? "" : "mini"}`} aria-label="Mission">
      <button className="mission-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="badge badge-accent">Mission</span> <strong>{ch.title}</strong> <span className="xs muted">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="stack-sm">
          {phase === "play" && (
            <>
              <p className="small">{m.goal(ctx)}</p>
              <p className="xs muted">No spotlight this time. You’ve got this.</p>
              {hint ? <p className="small hint"><strong>Hint:</strong> {m.hint(ctx)}</p> : (
                <button className="btn btn-ghost btn-sm" onClick={() => { setHint(true); setUsedHint(true); }}>Show a hint (fewer stars)</button>
              )}
              <ul className="xs muted star-rules">
                <li>★ Done</li><li>★ Without a hint {usedHint ? "✗" : ""}</li><li>★ {m.smartLabel} {smart ? "✓" : ""}</li>
              </ul>
            </>
          )}
          {phase === "week" && (
            <>
              <p className="small"><strong>Done!</strong> Your order went through.</p>
              <Stars n={stars} smartLabel={m.smartLabel} />
              <button className="btn btn-primary" data-tour="week-jump" onClick={() => { actions.jump(5); setPhase("find"); }}>⏩ 1 week later</button>
            </>
          )}
          {phase === "find" && (
            <>
              <p className="small"><strong>One week later.</strong> Find your position and its profit or loss in the depot.</p>
              {ctx.ui.view !== "depot" && <p className="xs muted">Tip: “Depot” in the menu.</p>}
            </>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => actions.start(null)}>Leave mission</button>
        </div>
      )}
    </aside>
  );
}

export function Stars({ n, smartLabel }: { n: number; smartLabel?: string }) {
  return (
    <div className="stars" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((k) => <span key={k} className={k <= n ? "on" : ""} aria-hidden>★</span>)}
      {smartLabel && <span className="xs muted">{n} / 3 · done · no hint · {smartLabel.toLowerCase()}</span>}
    </div>
  );
}

/** The switch from web cabinet to Pro mode is a moment in the demo. */
function ProUnlocked({ stars }: { stars: number }) {
  return (
    <div className="overlay overlay-dark" role="dialog" aria-modal="true" aria-label="Pro mode unlocked">
      <div className="unlock">
        <Stars n={stars} />
        <p className="unlock-kicker">Mission complete · Profit &amp; loss card collected</p>
        <h1>You just did what most people never dare to do.</h1>
        <p className="unlock-sub">Pro mode unlocked: a ProTrader-style market with live news, rival bots and a time machine.</p>
        <div className="card-row"><ConceptCard id="pnl" /></div>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn-outline-light" href="/learn" onClick={() => { actions.celebratePro(); actions.start(null); }}>Learning map</Link>
          <Link className="btn btn-primary btn-lg" href="/pro" onClick={() => { actions.celebratePro(); actions.start("2.1"); setUi({}); }}>Enter Pro mode →</Link>
        </div>
      </div>
    </div>
  );
}
