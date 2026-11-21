"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CARDS } from "@/lib/data/cards";
import { CHAPTERS, isOpen, nextChapter, surfaceHref, worldOpen, WORLDS, type Chapter } from "@/lib/game/chapters";
import { PERSONAS } from "@/lib/game/personas";
import { actions, rankOf, RANKS, useGame } from "@/lib/game/store";
import { setUi } from "@/lib/game/ui";
import Icon from "./Icon";
import ProgressRing from "./ProgressRing";
import ConceptCard from "./tour/ConceptCard";

const STARS_MAX = 21;

/** The hub after onboarding (layout from main): dark hero with rank, three mode cards, learning material. */
export default function LearningMap() {
  const save = useGame();
  const router = useRouter();
  const [card, setCard] = useState<string | null>(null);
  const rank = rankOf(save.xp);
  const next = nextChapter(save);
  const persona = save.persona ? PERSONAS[save.persona] : null;

  function launch(ch: Chapter) {
    if (ch.id === "w1") actions.resetSandbox();
    actions.start(ch.id);
    setUi({});
    router.push(surfaceHref(ch));
  }

  if (!persona) return (
    <main className="container stack">
      <div className="card stack">
        <h1>Welcome</h1>
        <p>Answer three quick questions first, so the examples fit your life.</p>
        <Link className="btn btn-primary" style={{ alignSelf: "flex-start" }} href="/start">Start ›</Link>
      </div>
    </main>
  );

  const allDone = save.done.includes("b4");
  const proOpen = save.proUnlocked || save.allUnlocked;
  const stars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  // History mode = the historical replays; it opens the first one not played yet (or the first one to replay).
  const replays = CHAPTERS.filter((c) => c.replay && isOpen(save, c));
  const replay = replays.find((c) => !save.done.includes(c.id)) ?? replays[0];
  const started = save.done.length > 0;

  return (
    <main className="container stack">
      <section className="hero">
        <div>
          <h1>Learn to invest without risking a cent</h1>
          <p className="muted">The same screen as your comdirect depot, with play money. Learn every concept as a game, then test yourself in a market full of news, rumors and rivals.</p>
        </div>
        <div className="level">
          <ProgressRing value={rank.progress} size={88} label={`Rank ${rank.level} of ${RANKS.length}, ${Math.round(rank.progress * 100)}% to the next rank`} center={rank.level} />
          <div className="level-text">
            <strong>{rank.name}</strong>
            <span className="num">{save.xp}{rank.nextAt ? ` / ${rank.nextAt}` : ""} XP</span>
          </div>
        </div>
      </section>

      <section className="modes">
        <button className="card mode" onClick={() => (next ? launch(next) : router.push("/ready"))}>
          <Icon name="compass" size={64} round />
          <h2>{started ? "Continue the tour" : "Start the tour"}</h2>
          <p className="small muted">Learn the comdirect trading screen by using it — and place your first trade with play money.</p>
          <span className="btn btn-dark btn-sm">{next ? (started ? `Continue: ${next.n} ${next.title}` : "Start tour") : "Ready for real?"} →</span>
        </button>
        <ModeCard open={proOpen} lockText="Unlocks after the World 1 mission" icon="chart" title="Market Simulator"
          text="A living market driven by news, with a time machine. Most headlines are noise. Find the signal, beat your rivals."
          cta="Open market" onOpen={() => { actions.start(null); setUi({}); router.push("/pro"); }} />
        <ModeCard open={!!replay} lockText="Unlocks in World 2" icon="hourglass" title="History Mode"
          text="Real market moments, hidden date. Trade them against the bots, then see what really happened."
          cta={replay ? `Play: ${replay.title}` : "Play history"} onOpen={() => replay && launch(replay)} />
      </section>

      <section className="card">
        <div className="panel-head">
          Learning material
          <div className="stats">
            <span><strong className="num">{save.cards.length}</strong>/{CARDS.length} cards</span>
            <span><strong className="num">{stars}</strong>/{STARS_MAX} stars</span>
            <span><strong className="num">{WORLDS.filter((w) => worldOpen(save, w.n)).length}</strong>/{WORLDS.length} worlds</span>
          </div>
        </div>
        <div className="worlds">
          {WORLDS.map((w) => {
            const open = worldOpen(save, w.n);
            const items = CHAPTERS.filter((c) => c.world === w.n);
            const complete = items.every((c) => save.done.includes(c.id));
            const todo = items.find((c) => !save.done.includes(c.id) && isOpen(save, c));
            const current = !!next && next.world === w.n;
            return (
              <div key={w.n} className={`world ${open ? "" : "locked"} ${current ? "current" : ""}`}>
                <span className="part-num num" aria-hidden>{complete ? "✓" : w.n}</span>
                <div className="stack" style={{ gap: "var(--space-3)" }}>
                  <div>
                    <h2>World {w.n}: {w.title}</h2>
                    <span className="xs muted">{w.surface} · {w.blurb}</span>
                  </div>
                  <div className="chips">
                    {items.map((c) => {
                      const can = isOpen(save, c);
                      return (
                        <button key={c.id} className={`chip ${save.done.includes(c.id) ? "done" : ""} ${can ? "" : "locked"} ${next?.id === c.id ? "next" : ""}`}
                          disabled={!can} onClick={() => launch(c)} title={c.blurb}>
                          {c.kind === "chapter" ? c.title : `${c.n} ${c.title}`}
                          {save.stars[c.id] ? <span className="chip-stars" aria-label={`${save.stars[c.id]} of 3 stars`}> {"★".repeat(save.stars[c.id])}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                  {w.n === 1 && save.proUnlocked && <span className="xs pro-note">🔓 Pro mode unlocked</span>}
                </div>
                <div className="world-action">
                  {!open ? (
                    <span className="btn btn-outline" aria-disabled="true" title={`Finish the World ${w.n - 1} mission`}>🔒 Locked</span>
                  ) : todo ? (
                    <button className={`btn ${current ? "btn-primary" : "btn-outline"}`} onClick={() => launch(todo)}>
                      {items.some((c) => save.done.includes(c.id)) ? "Continue" : "Start"}: {todo.title}
                    </button>
                  ) : (
                    <button className="btn btn-outline" onClick={() => launch(items[0])}>Review</button>
                  )}
                </div>
              </div>
            );
          })}
          <div className={`world ${allDone || save.allUnlocked ? "" : "locked"}`}>
            <span className="part-num" aria-hidden>∞</span>
            <div>
              <h2>Free play &amp; ready for real</h2>
              <span className="xs muted">The open Pro-mode market, then the real comdirect depot.</span>
            </div>
            <div className="world-action">
              <Link className={`btn ${allDone ? "btn-primary" : "btn-outline"}`} href="/ready">Ready for real? ›</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="card collection" aria-label="Concept cards">
        <div className="panel-head">Concept cards <span className="stats"><span><strong className="num">{save.cards.length}</strong>/{CARDS.length} collected</span></span></div>
        <div className="cards-grid">
          {CARDS.map((c) => {
            const has = save.cards.includes(c.id);
            return (
              <button key={c.id} className={`mini-card ${has ? "has" : ""}`} disabled={!has} onClick={() => setCard(c.id)} aria-label={has ? c.title : "Not collected yet"}>
                <Icon name={has ? "card" : "lock"} size={24} />
                <strong>{has ? c.title : "?"}</strong>
                <span className="xs">World {c.world}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="demo-tools" aria-label="Demo tools">
        <span className="xs muted">Demo tools</span>
        <label className="xs"><input type="checkbox" checked={save.allUnlocked} onChange={(e) => actions.setAllUnlocked(e.target.checked)} /> Unlock all worlds</label>
        <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("Reset all progress and start over?")) { actions.reset(); router.push("/start"); } }}>Reset progress</button>
        <span className="xs muted">Ranks: {RANKS.map(([x, n]) => `${n} ${x}`).join(" · ")}</span>
      </section>

      {card && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Concept card" onClick={() => setCard(null)}>
          <div className="modal modal-mid" onClick={(e) => e.stopPropagation()}>
            <div className="card-row"><ConceptCard id={card} /></div>
            <button className="btn btn-outline" style={{ alignSelf: "center" }} onClick={() => setCard(null)}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}

function ModeCard({ open, lockText, icon, title, text, cta, onOpen }: { open: boolean; lockText: string; icon: string; title: string; text: string; cta: string; onOpen: () => void }) {
  return (
    <button className={`card mode ${open ? "" : "locked"}`} disabled={!open} onClick={onOpen}>
      <Icon name={icon} size={64} round />
      <h2>{title}</h2>
      <p className="small muted">{text}</p>
      <span className={`btn btn-sm ${open ? "btn-dark" : "btn-outline"}`}>{open ? `${cta} →` : <>🔒&nbsp;{lockText}</>}</span>
    </button>
  );
}
