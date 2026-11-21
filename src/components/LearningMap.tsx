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
import { Stars } from "./tour/TourRunner";

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
  return (
    <main className="container map">
      <section className="map-top">
        <div className="map-hello">
          <span className="xs muted">{persona.label} · like {persona.who}</span>
          <h1>Your learning map</h1>
          {next ? (
            <button className="btn btn-primary btn-lg" onClick={() => launch(next)}>Continue: {next.n} {next.title} ›</button>
          ) : <Link className="btn btn-primary btn-lg" href="/ready">Ready for real? ›</Link>}
        </div>
        <div className="map-stats">
          <div className="stat">
            <ProgressRing value={rank.progress} size={64} label={`Rank ${rank.name}`} center={rank.level} />
            <span><strong>{rank.name}</strong><span className="xs muted num">{save.xp}{rank.nextAt ? ` / ${rank.nextAt}` : ""} XP{rank.next ? ` → ${rank.next}` : ""}</span></span>
          </div>
          <div className="stat">
            <Icon name="card" size={44} />
            <span><strong className="num">{save.cards.length} / 12</strong><span className="xs muted">concept cards</span></span>
          </div>
          <div className="stat">
            <span className="stat-star" aria-hidden>★</span>
            <span><strong className="num">{Object.values(save.stars).reduce((a, b) => a + b, 0)} / 21</strong><span className="xs muted">mission stars</span></span>
          </div>
        </div>
      </section>

      <ol className="path">
        {WORLDS.map((w) => {
          const open = worldOpen(save, w.n);
          const items = CHAPTERS.filter((c) => c.world === w.n);
          const doneN = items.filter((c) => save.done.includes(c.id)).length;
          return (
            <li key={w.n} className={`wcard ${open ? "" : "locked"}`}>
              <div className="wcard-head">
                <span className="part-num num" aria-hidden>{doneN === items.length ? "✓" : w.n}</span>
                <div>
                  <h2>World {w.n}: {w.title}</h2>
                  <span className="xs muted">{w.surface} · {w.blurb}</span>
                </div>
                <ProgressRing value={doneN / items.length} size={36} label={`${doneN} of ${items.length} done`} />
              </div>
              {!open && <p className="small muted locked-note"><Icon name="lock" size={18} /> Unlocks when the World {w.n - 1} mission is done.</p>}
              <ul className="chapters">
                {items.map((c) => {
                  const done = save.done.includes(c.id);
                  const can = isOpen(save, c);
                  const current = next?.id === c.id;
                  return (
                    <li key={c.id} className={`chap ${c.kind} ${done ? "done" : ""} ${current ? "current" : ""}`}>
                      <span className="chap-n">{c.n}</span>
                      <div className="chap-body">
                        <strong>{c.title}</strong>
                        <span className="xs muted">{c.blurb}</span>
                      </div>
                      <div className="chap-act">
                        {save.stars[c.id] ? <Stars n={save.stars[c.id]} /> : done ? <span className="xs up">✓ Done</span> : null}
                        {can ? (
                          <button className={`btn btn-sm ${current ? "btn-primary" : "btn-outline"}`} onClick={() => launch(c)}>{done ? "Replay" : c.kind === "boss" ? "Fight" : "Start"}</button>
                        ) : <span className="btn btn-sm btn-outline" aria-disabled="true">🔒</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {w.n === 1 && save.proUnlocked && <p className="xs pro-note">🔓 Pro mode unlocked</p>}
            </li>
          );
        })}
        <li className={`wcard final ${allDone || save.allUnlocked ? "" : "locked"}`}>
          <div className="wcard-head">
            <span className="part-num" aria-hidden>∞</span>
            <div><h2>Free play &amp; ready for real</h2><span className="xs muted">The open Pro-mode market, then the real comdirect depot.</span></div>
          </div>
          <div className="row pad">
            {save.proUnlocked ? <Link className="btn btn-outline btn-sm" href="/pro" onClick={() => actions.start(null)}>Free play</Link> : <span className="btn btn-outline btn-sm" aria-disabled="true">Free play 🔒</span>}
            <Link className={`btn btn-sm ${allDone ? "btn-primary" : "btn-outline"}`} href="/ready">Ready for real? ›</Link>
          </div>
        </li>
      </ol>

      <section className="collection" aria-label="Concept cards">
        <h2>Concept cards <span className="xs muted num">{save.cards.length} / 12</span></h2>
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
