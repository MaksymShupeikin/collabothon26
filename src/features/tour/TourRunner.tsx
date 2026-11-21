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
import { useT, type T } from "@/shared/lib/i18n";

const persona = (c: Ctx) => PERSONAS[c.save.persona ?? "starter"];
// Text functions already return the current language; plain strings are looked up.
const resolve = (v: string | ((c: Ctx) => string) | undefined, c: Ctx, t: T) => (typeof v === "function" ? v(c) : v ? t(v) : "");

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
  const t = useT();
  const steps = ch.steps ?? [];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const step: Step | undefined = steps[i];
  const isTask = !!step?.done && !step.quiz;
  const taskDone = isTask && step.done!(ctx);
  const taskText = step ? resolve(step.task, ctx, t) : "";

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
    <CoachMark target={step.target} place={step.place} live={isTask} allow={isTask ? step.zone ?? step.target ?? "*" : undefined} title={step.title && t(step.title)} progress={(i + 1) / steps.length} step={`${ch.n} · ${t(`Step ${i + 1} of ${steps.length}`, `Schritt ${i + 1} von ${steps.length}`)}`}
      footer={
        <div className="row coach-foot">
          <button className="btn btn-ghost btn-sm" onClick={() => { actions.start(null); setUi({}); }}>{t("Leave chapter", "Kapitel verlassen")}</button>
          {isTask ? (
            taskDone ? <span className="xp-done">✓ {t("Done", "Erledigt")} {pays > 0 && <span className="xp-chip">+{pays} XP</span>}</span> : pays > 0 ? <span className="xp-chip is-pending">+{pays} XP</span> : null
          ) : (
            <button className="btn btn-primary btn-sm" onClick={next} disabled={!!step.quiz && !quizDone}>{i + 1 === steps.length ? t("Finish", "Abschließen") : <>{t("Next", "Weiter")} <NextArrow /></>}</button>
          )}
        </div>
      }>
      {step.text && <p className="small">{resolve(step.text, ctx, t)}</p>}
      {isTask && taskText && <p className="small task"><strong>{t("Your turn", "Du bist dran")}</strong><span>{taskText}</span></p>}
      {step.game && <div className="coach-game"><MiniGameView game={step.game} /></div>}
      {step.quiz && (
        <div className="coach-quiz">
          <span className="quiz-kicker">{t("Quick check", "Kurzer Check")}</span>
          <p className="quiz-q">{t(step.quiz.q)}</p>
          <div className="quiz-options">
            {step.quiz.options.map((o, k) => {
              const state = picked === k ? (k === step.quiz!.answer ? "right" : "wrong") : "";
              return (
                <button key={o} className={`option ${state}`}
                  disabled={!!quizDone} onClick={() => { setPicked(k); if (k === step.quiz!.answer) actions.understood(`${ch.id}:q${i}`, 15); }}>
                  <span className="opt-key" aria-hidden>{state === "right" ? "✓" : state === "wrong" ? "✕" : String.fromCharCode(65 + k)}</span>
                  <span className="opt-label">{t(o)}</span>
                </button>
              );
            })}
          </div>
          {picked !== null && <p className={`quiz-fb ${picked === step.quiz.answer ? "is-right" : "is-wrong"}`} role="status">{picked === step.quiz.answer ? t(step.quiz.why) : t("Not quite. Try again.", "Nicht ganz. Versuch es noch mal.")}</p>}
        </div>
      )}
    </CoachMark>
  );
}

/** Same arrow glyph as the learning map's "Start lesson" button. */
const NextArrow = () => <svg className="btn-arrow" viewBox="0 0 16 16" aria-hidden><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** End of a chapter: the concept card drops into the collection. */
export function ChapterDone({ ch, extra, skipCard }: { ch: Chapter; extra?: React.ReactNode; skipCard?: boolean }) {
  const t = useT();
  const save = useGame();
  // finishing a history story leads to the next history story, not the learning path
  const history = isHistory(ch);
  const next = history ? HISTORY.find((c) => c.id !== ch.id && !save.done.includes(c.id)) : nextChapter(save);
  const [stay, setStay] = useState(!!skipCard);
  // History stories get the same button as History mode's "Start": reused classes, glyph and hover motion
  const nextLink = next && next.id !== ch.id ? (
    <Link className={`btn btn-primary ${history ? `btn-lg ${hm.go}` : "btn-sm"}`} href={surfaceHref(next)} onClick={() => { if (next.id === "w1") actions.resetSandbox(); actions.start(next.id); setUi({}); }}>
      {history
        ? <>{save.done.includes(next.id) ? t("Replay", "Wiederholen") : t("Start", "Starten")}<span className="btn-context">{t(next.title).replace(/^Boss: /, "vs. ")}</span><Arrow /></>
        : <>{next.kind === "boss" ? t(next.title) : t(`Start ${next.kind === "mission" ? "mission" : next.n}: ${next.title}`, `${next.kind === "mission" ? "Mission" : next.n} starten: ${t(next.title)}`)} →</>}
    </Link>
  ) : null;
  const label = ch.kind === "mission" ? t("Mission", "Mission") : history ? t("Story", "Geschichte") : t(`Chapter ${ch.n}`, `Kapitel ${ch.n}`);
  // replay stories live in History mode, so that's where "back" goes
  const home = history ? { href: "/history", name: t("History mode", "Geschichtsmodus") } : { href: "/", name: t("Learning map", "Lernpfad") };
  if (stay) return <SandboxBar label={t(`${label} complete`, `${label} abgeschlossen`)} next={nextLink} home={home} />;
  const cards = ch.card ?? [];
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("Chapter complete", "Kapitel abgeschlossen")}>
      <div className="done-card">
        <div className="coach-head">
          <span className="coach-step"><strong>✓ {label}</strong><span>{t("complete", "abgeschlossen")}</span></span>
          <div className="coach-bar" aria-hidden><span style={{ width: "100%" }} /></div>
        </div>
        <h3>{t("You finished “", "Geschafft: „")}{t(ch.title)}{t("”", "“")}</h3>
        {extra}
        {cards.length > 0 && (
          <>
            <p className="small"><Icon name="card" size={22} /> {cards.length === 1 ? t("A new concept card", "Eine neue Wissenskarte") : t("New concept cards", "Neue Wissenskarten")} {t(`for your collection (${save.cards.length} / 12). Turn it over for a quick question.`, `für deine Sammlung (${save.cards.length} / 12). Dreh sie um für eine kurze Frage.`)}</p>
            <div className="card-row">{cards.map((c) => <ConceptCard key={c} id={c} />)}</div>
          </>
        )}
        <div className="row done-foot">
          <div className="row">
            <Link className="btn btn-ghost btn-sm" href={home.href} onClick={() => actions.start(null)}>{t(`Back to ${home.name}`, `Zurück zum ${home.name}`)}</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setStay(true)}>{t("Keep exploring here", "Hier weiter erkunden")}</button>
          </div>
          {nextLink}
        </div>
      </div>
    </div>
  );
}

/** After "Keep exploring here": free play, with the way out (or on) docked at the bottom. */
function SandboxBar({ label, next, home }: { label: string; next: React.ReactNode; home?: { href: string; name: string } }) {
  const t = useT();
  home ??= { href: "/", name: t("Learning map", "Lernpfad") };
  return (
    <aside className="sandbox-bar" aria-label={t("Lesson complete", "Lektion abgeschlossen")}>
      <span className="sandbox-check" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <div className="sandbox-text">
        <strong>{label}</strong>
        <span>{t("Free play: click around, nothing is scored.", "Freies Spiel: Klick dich durch, nichts wird gewertet.")}</span>
      </div>
      <div className="sandbox-actions">
        <Link className="btn btn-ghost btn-sm" href={home.href} onClick={() => actions.start(null)}>{home.name}</Link>
        {next}
      </div>
    </aside>
  );
}

function MissionCard({ ch, ctx }: { ch: Chapter; ctx: Ctx }) {
  const t = useT();
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
      <CoachMark target="depot-pnl" title={t("One week later", "Eine Woche später")} progress={1} step={t("Mission · found it", "Mission · gefunden")}
        footer={<div className="row coach-foot"><span /><button className="btn btn-primary btn-sm" onClick={found}>{t("Continue", "Weiter")}</button></div>}>
        <p className="small">{t("Your stocks are worth", "Deine Aktien sind")} <strong className={pl >= 0 ? "up" : "down"}>{pl >= 0 ? "+" : "−"}{Math.abs(pl).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong> {pl >= 0 ? t("more", "mehr") : t("less", "weniger")} {t("than you paid, costs included. That's your profit or loss, on paper until you sell.", "wert, als du bezahlt hast, inklusive Kosten. Das ist dein Gewinn oder Verlust, auf dem Papier, bis du verkaufst.")}</p>
      </CoachMark>
    );
  }

  if (phase === "done") {
    if (ch.id === "w1") return <ProUnlocked stars={stars} />;
    return <ChapterDone ch={ch} extra={<><Stars n={stars} smartLabel={t(m.smartLabel)} />{ch.id === "w4" && <div className="light-panel"><PlanCompare monthly={persona(ctx).plan} /></div>}</>} />;
  }

  return (
    <aside className={`mission-card ${open ? "" : "mini"}`} aria-label={t("Mission", "Mission")}>
      <button className="mission-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="badge badge-accent">{t("Mission", "Mission")}</span> <strong>{t(ch.title)}</strong>
        <svg className="mission-chev" viewBox="0 0 12 8" width="12" height="8" aria-hidden><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="stack-sm">
          {phase === "play" && (
            <>
              <p className="small">{m.goal(ctx)}</p>
              {hint && <p className="small hint"><strong>{t("Hint:", "Tipp:")}</strong> {m.hint(ctx)}</p>}
              <ul className="xs star-rules" aria-label={t("Stars to earn", "Sterne zu holen")}>
                <li>{t("Done", "Erledigt")}</li>
                <li className={usedHint ? "lost" : ""}>{t("No hint", "Kein Tipp")}</li>
                <li className={smart ? "on" : ""}>{t(m.smartLabel)}</li>
              </ul>
            </>
          )}
          {phase === "week" && (
            <>
              <p className="small"><strong>{t("Done!", "Geschafft!")}</strong> {t("Your order went through.", "Deine Order wurde ausgeführt.")}</p>
              <Stars n={stars} smartLabel={t(m.smartLabel)} />
              <button className="btn btn-primary" data-tour="week-jump" onClick={() => { actions.jump(5); setPhase("find"); }}>{t("⏩ 1 week later", "⏩ 1 Woche später")}</button>
            </>
          )}
          {phase === "find" && (
            <>
              <p className="small"><strong>{t("One week later.", "Eine Woche später.")}</strong> {t("Find your position and its profit or loss in the portfolio.", "Finde deine Position und ihren Gewinn oder Verlust im Depot.")}</p>
              {ctx.ui.view !== "depot" && <p className="xs muted">{t("Tip: “Portfolio” in the menu.", "Tipp: „Depot“ im Menü.")}</p>}
            </>
          )}
          <div className="mission-foot">
            {phase === "play" && !hint && <button className="btn btn-ghost btn-sm" onClick={() => { setHint(true); setUsedHint(true); }}>{t("Need a hint?", "Brauchst du einen Tipp?")}</button>}
            <button className="btn btn-ghost btn-sm mission-leave" onClick={() => actions.start(null)}>{t("Leave", "Verlassen")}</button>
          </div>
        </div>
      )}
    </aside>
  );
}

export function Stars({ n, smartLabel }: { n: number; smartLabel?: string }) {
  const t = useT();
  return (
    <div className="stars" aria-label={t(`${n} of 3 stars`, `${n} von 3 Sternen`)}>
      {[1, 2, 3].map((k) => <span key={k} className={k <= n ? "on" : ""} aria-hidden>★</span>)}
      {smartLabel && <span className="xs muted">{n} / 3 · {t("done · no hint", "erledigt · kein Tipp")} · {t.lang === "de" ? smartLabel : smartLabel.toLowerCase()}</span>}
    </div>
  );
}

/** The switch from web cabinet to Pro mode is a moment in the demo. */
function ProUnlocked({ stars }: { stars: number }) {
  const t = useT();
  const [stay, setStay] = useState(false);
  const enter = (
    <Link className="btn btn-primary btn-sm" href="/pro" onClick={() => { actions.celebratePro(); actions.start("2.1"); setUi({}); }}>{t("Next: enter the trading area →", "Weiter: in den Handelsbereich →")}</Link>
  );
  if (stay) return <SandboxBar label={t("Mission complete", "Mission abgeschlossen")} next={enter} />;
  return (
    <div className="overlay overlay-dark" role="dialog" aria-modal="true" aria-label={t("Pro mode unlocked", "Pro-Modus freigeschaltet")}>
      <div className="unlock">
        <Stars n={stars} />
        <p className="unlock-kicker">{t("Mission complete · Profit & loss card collected", "Mission abgeschlossen · Karte „Gewinn & Verlust“ gesammelt")}</p>
        <h1>{t("You just did what most people never dare to do.", "Du hast gerade getan, was sich die meisten nie trauen.")}</h1>
        <div className="card-row"><ConceptCard id="pnl" /></div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn btn-outline-light" onClick={() => { actions.celebratePro(); setStay(true); }}>{t("Keep exploring here", "Hier weiter erkunden")}</button>
          <Link className="btn btn-outline-light" href="/" onClick={() => { actions.celebratePro(); actions.start(null); }}>{t("Back to learning map", "Zurück zum Lernpfad")}</Link>
          <Link className="btn btn-primary btn-lg" href="/pro" onClick={() => { actions.celebratePro(); actions.start("2.1"); setUi({}); }}>{t("Enter the trading area →", "In den Handelsbereich →")}</Link>
        </div>
      </div>
    </div>
  );
}
