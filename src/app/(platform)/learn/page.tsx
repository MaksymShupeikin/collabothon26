"use client";
import Link from "next/link";
import { CONCEPTS, WORLDS } from "@/lib/data/concepts";
import { RANKS, rankOf, useProgress } from "@/lib/progress";

export default function LearnIndex() {
  const { p } = useProgress();
  const rank = rankOf(p.xp);
  // A topic unlocks once 2 concepts of the previous topic are collected.
  const unlocked = (n: number) => n === 1 || CONCEPTS.filter((c) => c.world === n - 1 && p.done.includes(c.id)).length >= 2;
  // The first open topic with cards left gets the primary button.
  const currentTopic = WORLDS.find((w) => unlocked(w.n) && CONCEPTS.some((c) => c.world === w.n && !p.done.includes(c.id)))?.n;

  return (
    <main className="container stack">
        <section className="card">
          <div className="panel-head">
            Learning material
            <div className="level">
              <svg className="level-ring" viewBox="0 0 120 120" role="img" aria-label={`Level ${rank.level} of ${RANKS.length}, ${Math.round(rank.progress * 100)}% to next level`}>
                <circle cx="60" cy="60" r="60" className="level-ring-bg" />
                <circle cx="60" cy="60" r="44" className="level-ring-track" />
                <circle cx="60" cy="60" r="44" className="level-ring-fill" transform="rotate(-90 60 60)" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - rank.progress * 100} />
                <text x="60" y="62" className="level-ring-num">{rank.level}</text>
              </svg>
              <span><strong>{rank.name}</strong> <span className="muted num">{p.xp}{rank.next ? ` / ${RANKS[rank.level][0]}` : ""} XP</span></span>
            </div>
          </div>
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
                  <span className="part-num num" aria-hidden>{complete ? "✓" : w.n}</span>
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
    </main>
  );
}
