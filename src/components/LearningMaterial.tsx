"use client";
import Link from "next/link";
import { CONCEPTS, WORLDS } from "@/lib/data/concepts";
import { useProgress } from "@/lib/progress";
import Glyph from "./Glyph";

/** Topics with concept chips and material stats; shown on the home page and the Learning tab. */
export default function LearningMaterial() {
  const { p } = useProgress();
  const games = CONCEPTS.filter((c) => c.minigame);
  // A topic unlocks once 2 concepts of the previous topic are collected.
  const unlocked = (n: number) => n === 1 || CONCEPTS.filter((c) => c.world === n - 1 && p.done.includes(c.id)).length >= 2;
  // The first open topic with cards left gets the primary button.
  const currentTopic = WORLDS.find((w) => unlocked(w.n) && CONCEPTS.some((c) => c.world === w.n && !p.done.includes(c.id)))?.n;

  return (
    <section className="card">
          <div className="panel-head">
            Learning material
            <div className="stats">
              <span><strong className="num">{p.done.length}</strong>/{CONCEPTS.length} cards</span>
              <span><strong className="num">{games.filter((c) => p.done.includes(c.id)).length}</strong>/{games.length} games</span>
              <span><strong className="num">{WORLDS.filter((w) => unlocked(w.n)).length}</strong>/{WORLDS.length} topics</span>
            </div>
          </div>
          {/* Path (mockup 02): one dot per topic — done ✓, current yellow, locked grey. */}
          <ol className="path" aria-label="Your path">
            {WORLDS.map((w) => {
              const items = CONCEPTS.filter((c) => c.world === w.n);
              const complete = items.every((c) => p.done.includes(c.id));
              const state = complete ? "done" : w.n === currentTopic ? "current" : unlocked(w.n) ? "open" : "locked";
              return (
                <li key={w.n} className={`path-step ${state}`} aria-current={state === "current" ? "step" : undefined}>
                  <span className="path-dot" aria-hidden>{state === "done" ? <Glyph name="check" size={14} /> : state === "locked" ? <Glyph name="lock" size={14} /> : w.n}</span>
                  <span className="path-label">{w.title}</span>
                </li>
              );
            })}
          </ol>
          <div className="worlds">
            {WORLDS.map((w, i) => {
              const open = unlocked(w.n);
              const items = CONCEPTS.filter((c) => c.world === w.n);
              const doneCount = items.filter((c) => p.done.includes(c.id)).length;
              const complete = doneCount === items.length;
              const next = items.find((c) => !p.done.includes(c.id)) ?? items[0];
              const current = open && !complete && w.n === currentTopic;
              return (
                <div key={w.n} className={`world ${open ? "" : "locked"} ${current ? "current" : ""}`}>
                  <span className="part-num num" aria-hidden>{complete ? <Glyph name="check" size={14} /> : w.n}</span>
                  <div className="stack" style={{ gap: "var(--space-3)" }}>
                    <h2>{w.title}</h2>
                    <div className="chips">
                      {items.map((c) => (
                        <Link key={c.id} href={`/learn/${c.id}`} className={`chip ${p.done.includes(c.id) ? "done" : ""} ${open ? "" : "locked"}`} aria-disabled={!open}>
                          {c.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="world-action">
                    {!open ? (
                      <>
                        <span className="btn btn-outline" aria-disabled="true" title={`Collect 2 cards in ${WORLDS[i - 1].title}`}>Locked</span>
                      </>
                    ) : complete ? (
                      <>
                        <Link className="btn btn-outline" href={`/learn/${items[0].id}`}>Review</Link>
                      </>
                    ) : (
                      <>
                        <Link className={`btn ${current ? "btn-primary" : "btn-outline"}`} href={`/learn/${next.id}`}>{doneCount ? "Continue" : "Start"}: {next.title}</Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
    </section>
  );
}
