"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CARDS } from "@/features/learn/cards";
import { CHAPTERS, isOpen, nextChapter, surfaceHref, worldOpen, WORLDS, type Chapter, type World } from "@/features/tour/chapters";
import { PERSONAS } from "@/features/game/personas";
import { actions, rankOf, RANKS, useGame, type Save } from "@/features/game/store";
import { setUi } from "@/features/game/ui";
import Icon from "@/shared/ui/Icon";
import ProgressRing from "@/shared/ui/ProgressRing";
import ConceptCard from "@/features/learn/ConceptCard";
import s from "./LearningMap.module.css";

const STARS_MAX = 21;
/** Each boss is one of the market bots; its node wears the bot's pictogram. */
const BOSS_ICON: Record<string, string> = { b2: "max", b3: "alex", b4: "paula" };

/** The hub after onboarding: next-up hero with rank, the world path, side modes, concept cards. */
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
  function openSandbox() {
    actions.start(null);
    setUi({});
    router.push("/cabinet");
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
  const worldsOpen = WORLDS.filter((w) => worldOpen(save, w.n)).length;
  // History mode = the historical replays; it opens the first one not played yet (or the first one to replay).
  const replays = CHAPTERS.filter((c) => c.replay && isOpen(save, c));
  const replay = replays.find((c) => !save.done.includes(c.id)) ?? replays[0];
  const started = save.done.length > 0;

  return (
    <main className={`container ${s.page}`}>
      <section className={s.hero} aria-labelledby="next-up">
        <div className={s.next}>
          {next ? (
            <>
              <h1 id="next-up">{next.title}</h1>
              <button className={`btn btn-primary btn-lg ${s.go}`} onClick={() => launch(next)}>
                {started ? "Continue" : "Start"}
                <span className={s.goSub}>{next.kind === "chapter" ? `Level ${next.n}` : next.kind === "mission" ? "Mission" : "Boss fight"}</span>
                <Arrow />
              </button>
            </>
          ) : (
            <>
              <h1 id="next-up">Ready for real?</h1>
              <Link className={`btn btn-primary btn-lg ${s.go}`} href="/ready">
                Open your depot
                <span className={s.goSub}>All cleared</span>
                <Arrow />
              </Link>
            </>
          )}
        </div>

        <div className={s.hud}>
          <div className={s.rank}>
            <ProgressRing value={rank.progress} size={72} label={`Rank ${rank.level} of ${RANKS.length}, ${Math.round(rank.progress * 100)}% to the next rank`} center={rank.level} />
            <div className={s.rankText}>
              <strong>{rank.name}</strong>
              <div className={s.xpBar} aria-hidden><span style={{ width: `${rank.progress * 100}%` }} /></div>
              <span className="num xs">{save.xp}{rank.nextAt ? ` / ${rank.nextAt} XP · next ${rank.next}` : " XP · top rank"}</span>
            </div>
          </div>
          <dl className={s.tally}>
            <div><dt>Stars</dt><dd className="num"><Star />{stars}<small>/{STARS_MAX}</small></dd></div>
            <div><dt>Cards</dt><dd className="num">{save.cards.length}<small>/{CARDS.length}</small></dd></div>
            <div><dt>Worlds</dt><dd className="num">{worldsOpen}<small>/{WORLDS.length}</small></dd></div>
          </dl>
        </div>
      </section>

      <section className={s.modes} aria-label="Play modes">
        <ModeTile open={proOpen} lockText="After World 1" icon="chart" title="Market Simulator" line="Live news. Beat the bots."
          onOpen={() => { actions.start(null); setUi({}); router.push("/pro"); }} />
        <ModeTile open={!!replay} lockText="In World 2" icon="hourglass" title="History Mode" line={replay ? replay.title.replace(/^Boss: /, "vs. ") : "Real crashes, hidden dates."}
          onOpen={() => replay && launch(replay)} />
        <ModeTile open icon="play" title="Ready for real" line={allDone ? "You're ready." : "Your real depot."} highlight={allDone}
          onOpen={() => router.push("/ready")} />
      </section>

      <section aria-labelledby="worlds-h">
        <h2 id="worlds-h" className={s.sectionHead}>Worlds</h2>
        <ol className={s.path}>
          {WORLDS.map((w) => (
            <WorldTile key={w.n} w={w} save={save} next={next} launch={launch}
              extra={w.n === 1 ? (
                <button className={`btn btn-dark ${s.sandbox}`} onClick={openSandbox}>
                  <SandboxGlyph /> Open sandbox
                </button>
              ) : null} />
          ))}
        </ol>
      </section>


      <section aria-labelledby="cards-h">
        <h2 id="cards-h" className={s.sectionHead}>Concept cards <span className="num">{save.cards.length}/{CARDS.length}</span></h2>
        <div className={s.cards}>
          {CARDS.map((c) => {
            const has = save.cards.includes(c.id);
            return (
              <button key={c.id} className={`${s.mini} ${has ? s.has : ""}`} disabled={!has} onClick={() => setCard(c.id)} aria-label={has ? c.title : `Card from World ${c.world}, not collected yet`}>
                <Icon name={has ? "card" : "lock"} size={22} />
                <span>{has ? c.title : `W${c.world}`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <details className={s.demo}>
        <summary className="xs">Demo tools</summary>
        <div className={s.demoBody}>
          <label className="xs"><input type="checkbox" checked={save.allUnlocked} onChange={(e) => actions.setAllUnlocked(e.target.checked)} /> Unlock all worlds</label>
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("Reset all progress and start over?")) { actions.reset(); router.push("/start"); } }}>Reset progress</button>
        </div>
      </details>

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

function WorldTile({ w, save, next, launch, extra }: { w: World; save: Save; next: Chapter | undefined; launch: (c: Chapter) => void; extra: ReactNode }) {
  const open = worldOpen(save, w.n);
  const items = CHAPTERS.filter((c) => c.world === w.n);
  const doneCount = items.filter((c) => save.done.includes(c.id)).length;
  const complete = doneCount === items.length;
  const todo = items.find((c) => !save.done.includes(c.id) && isOpen(save, c));
  const current = !!next && next.world === w.n;
  const [peek, setPeek] = useState<Chapter | null>(null);
  const caption = peek ?? todo ?? items[items.length - 1];
  const state = !open ? s.locked : current ? s.current : complete ? s.complete : "";

  return (
    <li className={`${s.world} ${state}`}>
      <div className={s.worldTop}>
        <span className={s.badge} aria-hidden>{complete ? <Check /> : !open ? <Lock /> : w.n}</span>
        <span className={`num xs ${s.count}`}>{doneCount}/{items.length}</span>
      </div>
      <div>
        <h3>{w.title}</h3>
        <span className={`xs ${s.surface}`}>World {w.n} · {w.surface}</span>
      </div>

      <div className={s.track} onMouseLeave={() => setPeek(null)}>
        <div className={s.rail} aria-hidden><span style={{ width: `${(doneCount / items.length) * 100}%` }} /></div>
        <div className={s.nodes}>
          {items.map((c) => {
            const done = save.done.includes(c.id);
            const can = isOpen(save, c);
            const isNext = next?.id === c.id;
            const st = save.stars[c.id] ?? 0;
            const cls = [s.node, done ? s.nodeDone : "", isNext ? s.nodeNext : "", can ? "" : s.nodeLocked, c.kind === "mission" ? s.nodeBig : "", c.kind === "boss" ? s.nodeBoss : ""].join(" ");
            return (
              <button key={c.id} className={cls} disabled={!can} onClick={() => launch(c)}
                onMouseEnter={() => setPeek(c)} onFocus={() => setPeek(c)} onBlur={() => setPeek(null)}
                aria-label={`${c.kind === "chapter" ? c.n + " " : ""}${c.title}${done ? ", done" : can ? "" : ", locked"}${st ? `, ${st} of 3 stars` : ""}`}>
                {c.kind === "boss" ? <Icon name={BOSS_ICON[c.id] ?? "max"} size={40} round />
                  : c.kind === "mission" ? <Star />
                  : done ? <Check /> : <span className="num">{c.n.split(".")[1]}</span>}
                {st > 0 && <span className={s.nodeStars} aria-hidden>{st}</span>}
              </button>
            );
          })}
        </div>
        <span className={`xs ${s.caption}`} aria-hidden>{open ? caption.title : `Finish World ${w.n - 1}`}</span>
      </div>

      <div className={s.actions}>
        {!open ? (
          <span className={`btn btn-outline ${s.cta}`} aria-disabled="true"><Lock /> Locked</span>
        ) : todo ? (
          <button className={`btn ${current ? "btn-primary" : "btn-outline"} ${s.cta}`} onClick={() => launch(todo)}>
            {doneCount > 0 ? "Continue" : "Start"} <Arrow />
          </button>
        ) : (
          <button className={`btn btn-outline ${s.cta}`} onClick={() => launch(items[0])}>Replay</button>
        )}
        {extra}
      </div>
    </li>
  );
}

function ModeTile({ open, lockText, icon, title, line, onOpen, highlight }: { open: boolean; lockText?: string; icon: string; title: string; line: string; onOpen: () => void; highlight?: boolean }) {
  return (
    <button className={`${s.mode} ${highlight ? s.modeHot : ""}`} disabled={!open} onClick={onOpen}>
      <Icon name={open ? icon : "lock"} size={44} round={open} />
      <span className={s.modeText}>
        <strong>{title}</strong>
        <span className="xs">{open ? line : lockText}</span>
      </span>
      {open && <Arrow />}
    </button>
  );
}

// Small authored glyphs, one stroke family, so no emoji or unicode stands in for icons.
const Arrow = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Lock = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M5 7V5.5a3 3 0 016 0V7" fill="none" stroke="currentColor" strokeWidth="1.8" /><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="currentColor" /></svg>;
const Star = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="currentColor" /></svg>;
const SandboxGlyph = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><rect x="2" y="3" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M5 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M5 9l2-2 1.5 1.5L11 6" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
