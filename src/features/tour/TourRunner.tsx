"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/features/learn/LearningMap";
import hm from "@/features/learn/LearningMap.module.css";
import { chapterById, HISTORY, isHistory, nextChapter, surfaceHref, type Chapter, type Ctx, type Step } from "@/features/tour/chapters";
import { PERSONAS } from "@/features/game/personas";
import { actions, useGame } from "@/features/game/store";
import { priceNow } from "@/features/market/engine";
import { setUi, useUi } from "@/features/game/ui";
import MiniGameView from "@/features/learn/MiniGames";
import PlanCompare from "@/features/tour/PlanCompare";
import CoachMark from "@/features/tour/CoachMark";
import ConceptCard from "@/features/learn/ConceptCard";
import Icon from "@/shared/ui/Icon";

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

  // replays reveal the company name once the last (reveal) step is on screen
  useEffect(() => { if (steps.length && i === steps.length - 1) setUi({ tourFinished: ch.id }); }, [i, steps.length, ch.id]);

  // Action steps continue by themselves once the action is done: no "Next" button for things the player can do.
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; });
  useEffect(() => {
    if (!taskDone) return;
    const id = window.setTimeout(() => nextRef.current(), 650);
    return () => window.clearTimeout(id);
  }, [taskDone, i]);

  if (finished) return <ChapterDone ch={ch} skipCard />;
  if (!step) return null;

  const quizDone = step.quiz && picked === step.quiz.answer;
  // What this click pays (0 on a replay: awards only count once).
  const earned = ctx.save.earned;
  const pays = (earned.includes(`${ch.id}:${i}`) ? 0 : 10) + (i + 1 === steps.length && !earned.includes(`${ch.id}:done`) ? 30 : 0);
  return (
    <CoachMark target={step.target} place={step.place} live={isTask} allow={isTask ? step.zone ?? step.target ?? "*" : undefined} title={step.title} progress={(i + 1) / steps.length} step={`${ch.n} · Step ${i + 1} of ${steps.length}`}
      footer={
        <div className="row coach-foot">
          <button className="btn btn-ghost btn-sm" onClick={() => { actions.start(null); setUi({}); }}>Leave chapter</button>
          {isTask ? (
            taskDone ? <span className="xp-done">✓ Done {pays > 0 && <span className="xp-chip">+{pays} XP</span>}</span> : pays > 0 ? <span className="xp-chip is-pending">+{pays} XP</span> : null
          ) : (
            <button className="btn btn-primary btn-sm" onClick={next} disabled={!!step.quiz && !quizDone}>{i + 1 === steps.length ? "Finish" : <>Next <NextArrow /></>}</button>
          )}
        </div>
      }>
      {step.text && <p className="small">{resolve(step.text, ctx)}</p>}
      {isTask && taskText && <p className="small task"><strong>Your turn</strong><span>{taskText}</span></p>}
      {step.game && <div className="coach-game"><MiniGameView game={step.game} /></div>}
      {step.quiz && (
        <div className="coach-quiz">
          <span className="quiz-kicker">Quick check</span>
          <p className="quiz-q">{step.quiz.q}</p>
          <div className="quiz-options">
            {step.quiz.options.map((o, k) => {
              const state = picked === k ? (k === step.quiz!.answer ? "right" : "wrong") : "";
              return (
                <button key={o} className={`option ${state}`}
                  disabled={!!quizDone} onClick={() => { setPicked(k); if (k === step.quiz!.answer) actions.understood(`${ch.id}:q${i}`, 15); }}>
                  <span className="opt-key" aria-hidden>{state === "right" ? "✓" : state === "wrong" ? "✕" : String.fromCharCode(65 + k)}</span>
                  <span className="opt-label">{o}</span>
                </button>
              );
            })}
          </div>
          {picked !== null && <p className={`quiz-fb ${picked === step.quiz.answer ? "is-right" : "is-wrong"}`} role="status">{picked === step.quiz.answer ? step.quiz.why : "Not quite. Try again."}</p>}
        </div>
      )}
    </CoachMark>
  );
}

/** Same arrow glyph as the learning map's "Start lesson" button. */
const NextArrow = () => <svg className="btn-arrow" viewBox="0 0 16 16" aria-hidden><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** End of a chapter: the concept card drops into the collection. */
export function ChapterDone({ ch, extra, skipCard }: { ch: Chapter; extra?: React.ReactNode; skipCard?: boolean }) {
  const save = useGame();
  // finishing a history story leads to the next history story, not the learning path
  const history = isHistory(ch);
  const next = history ? HISTORY.find((c) => c.id !== ch.id && !save.done.includes(c.id)) : nextChapter(save);
  const [stay, setStay] = useState(!!skipCard);
  // History stories get the same button as History mode's "Start": reused classes, glyph and hover motion
  const nextLink = next && next.id !== ch.id ? (
    <Link className={`btn btn-primary ${history ? `btn-lg ${hm.go}` : "btn-sm"}`} href={surfaceHref(next)} onClick={() => { if (next.id === "w1") actions.resetSandbox(); actions.start(next.id); setUi({}); }}>
      {history
        ? <>{save.done.includes(next.id) ? "Replay" : "Start"}<span className="btn-context">{next.title.replace(/^Boss: /, "vs. ")}</span><Arrow /></>
        : <>{next.kind === "boss" ? next.title : `Start ${next.kind === "mission" ? "mission" : next.n}: ${next.title}`} →</>}
    </Link>
  ) : null;
  const label = ch.kind === "mission" ? "Mission" : history ? "Story" : `Chapter ${ch.n}`;
  // replay stories live in History mode, so that's where "back" goes
  const home = history ? { href: "/history", name: "History mode" } : { href: "/", name: "Learning map" };
  if (stay) return <SandboxBar label={`${label} complete`} next={nextLink} home={home} />;
  const cards = ch.card ?? [];
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Chapter complete">
      <div className="done-card">
        <div className="coach-head">
          <span className="coach-step"><strong>✓ {label}</strong><span>complete</span></span>
          <div className="coach-bar" aria-hidden><span style={{ width: "100%" }} /></div>
        </div>
        <h3>You finished “{ch.title}”</h3>
        {extra}
        {cards.length > 0 && (
          <>
            <p className="small"><Icon name="card" size={22} /> {cards.length === 1 ? "A new concept card" : "New concept cards"} for your collection ({save.cards.length} / 12). Turn it over for a quick question.</p>
            <div className="card-row">{cards.map((c) => <ConceptCard key={c} id={c} />)}</div>
          </>
        )}
        <div className="row done-foot">
          <div className="row">
            <Link className="btn btn-ghost btn-sm" href={home.href} onClick={() => actions.start(null)}>Back to {home.name}</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setStay(true)}>Keep exploring here</button>
          </div>
          {nextLink}
        </div>
      </div>
    </div>
  );
}

/** After "Keep exploring here": free play, with the way out (or on) docked at the bottom. */
function SandboxBar({ label, next, home = { href: "/", name: "Learning map" } }: { label: string; next: React.ReactNode; home?: { href: string; name: string } }) {
  return (
    <aside className="sandbox-bar" aria-label="Lesson complete">
      <span className="sandbox-check" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <div className="sandbox-text">
        <strong>{label}</strong>
        <span>Free play: click around, nothing is scored.</span>
      </div>
      <div className="sandbox-actions">
        <Link className="btn btn-ghost btn-sm" href={home.href} onClick={() => actions.start(null)}>{home.name}</Link>
        {next}
      </div>
    </aside>
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
  useEffect(() => { setUi({ mission: undefined }); }, []);

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

  // One week later, in the portfolio: point at the profit or loss before the big moment.
  if (phase === "find" && ctx.ui.view === "depot") {
    const s = ctx.save.sim;
    const pl = Object.entries(s.acct.holdings).reduce((sum, [sym, h]) => sum + h.qty * priceNow(s, sym) - h.cost, 0);
    return (
      <CoachMark target="depot-pnl" title="One week later" progress={1} step="Mission · found it"
        footer={<div className="row coach-foot"><span /><button className="btn btn-primary btn-sm" onClick={found}>Continue</button></div>}>
        <p className="small">Your stocks are worth <strong className={pl >= 0 ? "up" : "down"}>{pl >= 0 ? "+" : "−"}{Math.abs(pl).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong> {pl >= 0 ? "more" : "less"} than you paid, costs included. That&apos;s your profit or loss, on paper until you sell.</p>
      </CoachMark>
    );
  }

  if (phase === "done") {
    if (ch.id === "w1") return <ProUnlocked stars={stars} />;
    return <ChapterDone ch={ch} extra={<><Stars n={stars} smartLabel={m.smartLabel} />{ch.id === "w4" && <div className="light-panel"><PlanCompare monthly={persona(ctx).plan} /></div>}</>} />;
  }

  return (
    <aside className={`mission-card ${open ? "" : "mini"}`} aria-label="Mission">
      <button className="mission-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="badge badge-accent">Mission</span> <strong>{ch.title}</strong>
        <svg className="mission-chev" viewBox="0 0 12 8" width="12" height="8" aria-hidden><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="stack-sm">
          {phase === "play" && (
            <>
              <p className="small">{m.goal(ctx)}</p>
              {hint && <p className="small hint"><strong>Hint:</strong> {m.hint(ctx)}</p>}
              <ul className="xs star-rules" aria-label="Stars to earn">
                <li>Done</li>
                <li className={usedHint ? "lost" : ""}>No hint</li>
                <li className={smart ? "on" : ""}>{m.smartLabel}</li>
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
              <p className="small"><strong>One week later.</strong> Find your position and its profit or loss in the portfolio.</p>
              {ctx.ui.view !== "depot" && <p className="xs muted">Tip: “Portfolio” in the menu.</p>}
            </>
          )}
          <div className="mission-foot">
            {phase === "play" && !hint && <button className="btn btn-ghost btn-sm" onClick={() => { setHint(true); setUsedHint(true); }}>Need a hint?</button>}
            <button className="btn btn-ghost btn-sm mission-leave" onClick={() => actions.start(null)}>Leave</button>
          </div>
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
  const [stay, setStay] = useState(false);
  const enter = (
    <Link className="btn btn-primary btn-sm" href="/pro" onClick={() => { actions.celebratePro(); actions.start("2.1"); setUi({}); }}>Next: enter the trading area →</Link>
  );
  if (stay) return <SandboxBar label="Mission complete" next={enter} />;
  return (
    <div className="overlay overlay-dark" role="dialog" aria-modal="true" aria-label="Pro mode unlocked">
      <div className="unlock">
        <Stars n={stars} />
        <p className="unlock-kicker">Mission complete · Profit &amp; loss card collected</p>
        <h1>You just did what most people never dare to do.</h1>
        <div className="card-row"><ConceptCard id="pnl" /></div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn btn-outline-light" onClick={() => { actions.celebratePro(); setStay(true); }}>Keep exploring here</button>
          <Link className="btn btn-outline-light" href="/" onClick={() => { actions.celebratePro(); actions.start(null); }}>Back to learning map</Link>
          <Link className="btn btn-primary btn-lg" href="/pro" onClick={() => { actions.celebratePro(); actions.start("2.1"); setUi({}); }}>Enter the trading area →</Link>
        </div>
      </div>
    </div>
  );
}
