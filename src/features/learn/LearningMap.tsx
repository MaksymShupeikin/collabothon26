"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CARDS } from "@/features/learn/cards";
import { CHAPTERS, isOpen, nextChapter, surfaceHref, worldOpen, WORLDS, type Chapter, type World } from "@/features/tour/chapters";
import { PERSONAS } from "@/features/game/personas";
import { actions, rankOf, RANKS, useGame, type Save } from "@/features/game/store";
import { setUi } from "@/features/game/ui";
import Icon from "@/shared/ui/Icon";
import ProgressRing from "@/shared/ui/ProgressRing";
import CountUp from "@/shared/ui/CountUp";
import CardArt, { CARD_SHORT } from "@/features/learn/CardArt";
import s from "./LearningMap.module.css";

const STARS_MAX = 21;
/** Each boss is one of the market bots; its node wears the bot's pictogram. */
const BOSS_ICON: Record<string, string> = { b2: "max", b3: "alex", b4: "paula" };

/** The hub after onboarding: next-up hero with rank, the world path, side modes, concept cards. */
export default function LearningMap() {
  const save = useGame();
  const router = useRouter();
  const rank = rankOf(save.xp);
  const next = nextChapter(save);
  const persona = save.persona ? PERSONAS[save.persona] : null;
  const rankRef = useRef<HTMLDivElement>(null);
  const [rankShown, setRankShown] = useState(false);

  // While the card's rank ring is on screen, the header's level badge is redundant: flag it so CSS can hide it.
  useEffect(() => {
    const el = rankRef.current;
    if (!el) return;
    const root = document.documentElement;
    const io = new IntersectionObserver(
      ([e]) => {
        setRankShown(e.isIntersecting); // the card's ring and XP bar fill up each time the card comes into view
        if (e.isIntersecting) root.setAttribute("data-rank-visible", ""); else root.removeAttribute("data-rank-visible");
      },
      { rootMargin: "-64px 0px 0px 0px" }, // sticky header covers the top 64px
    );
    io.observe(el);
    return () => { io.disconnect(); root.removeAttribute("data-rank-visible"); };
  }, [persona]);

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
  const worldsOpen = WORLDS.filter((w) => worldOpen(save, w.n)).length;
  // History mode = the historical replays; it opens the first one not played yet (or the first one to replay).
  const replays = CHAPTERS.filter((c) => c.replay && isOpen(save, c));
  const replay = replays.find((c) => !save.done.includes(c.id)) ?? replays[0];
  const started = save.done.length > 0;

  return (
    <main className={`container ${s.page}`}>
      <section className={s.hero} aria-label="Next up">
        <div className={s.next}>
          {next ? (
            <>
              <Quote />
              <button className={`btn btn-primary btn-lg ${s.go}`} onClick={() => launch(next)}>
                {started ? "Continue" : "Start"}
                <span className={s.goSub}>{next.title}</span>
                <Arrow />
              </button>
            </>
          ) : (
            <>
              <Quote />
              <Link className={`btn btn-primary btn-lg ${s.go}`} href="/ready">
                Open your depot
                <span className={s.goSub}>All cleared</span>
                <Arrow />
              </Link>
            </>
          )}
        </div>

        <div className={s.hud}>
          <div className={s.rank} ref={rankRef}>
            <ProgressRing value={rankShown ? rank.progress : 0} size={72} label={`Rank ${rank.level} of ${RANKS.length}, ${Math.round(rank.progress * 100)}% to the next rank`} center={rank.level} />
            <div className={s.rankText}>
              <strong>{rank.name}</strong>
              <div className={s.xpBar} aria-hidden><span style={{ width: `${rankShown ? rank.progress * 100 : 0}%` }} /></div>
              <span className="num xs"><CountUp to={save.xp} active={rankShown} />{rank.nextAt ? ` / ${rank.nextAt} XP · next ${rank.next}` : " XP · top rank"}</span>
            </div>
          </div>
          <dl className={s.tally}>
            <div><dt>Stars <Star /></dt><dd className="num"><CountUp to={stars} active={rankShown} /><small>/{STARS_MAX}</small></dd></div>
            <div><dt>Cards <CardGlyph /></dt><dd className="num"><CountUp to={save.cards.length} active={rankShown} /><small>/{CARDS.length}</small></dd></div>
            <div><dt>Worlds <Globe /></dt><dd className="num"><CountUp to={worldsOpen} active={rankShown} /><small>/{WORLDS.length}</small></dd></div>
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
            <WorldTile key={w.n} w={w} save={save} next={next} launch={launch} />
          ))}
        </ol>
      </section>


      <section aria-labelledby="cards-h">
        <h2 id="cards-h" className={s.sectionHead}>Concept cards</h2>
        <ul className={s.cards}>
          {CARDS.map((c) => {
            const has = save.cards.includes(c.id);
            return (
              <li key={c.id} className={`${s.mini} ${has ? s.has : s.sealed}`}>
                <span className={s.miniTop}>World {c.world}</span>
                <span className={s.art}>
                  <CardArt id={c.id} size={88} />
                  {!has && <span className={s.seal}><Lock /></span>}
                </span>
                <span className={s.miniName}>{CARD_SHORT[c.id] ?? c.title}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <details className={s.demo}>
        <summary className="xs">Demo tools</summary>
        <div className={s.demoBody}>
          <label className="xs"><input type="checkbox" checked={save.allUnlocked} onChange={(e) => actions.setAllUnlocked(e.target.checked)} /> Unlock all worlds</label>
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("Reset all progress and start over?")) { actions.reset(); router.push("/start"); } }}>Reset progress</button>
        </div>
      </details>
    </main>
  );
}

/** Short, well-sourced lines from known investors. Rotates every 30 s; a fixed list, nothing is fetched. */
const QUOTES = [
  { q: "Risk comes from not knowing what you’re doing", by: "Warren Buffett" },
  { q: "Know what you own, and know why you own it", by: "Peter Lynch" },
  { q: "The investor’s chief problem is likely to be himself", by: "Benjamin Graham" },
  { q: "Don’t look for the needle in the haystack. Just buy the haystack", by: "John Bogle" },
  { q: "In investing, what is comfortable is rarely profitable", by: "Robert Arnott" },
  { q: "Be fearful when others are greedy, and greedy when others are fearful", by: "Warren Buffett" },
];
const QUOTE_MS = 30_000;

function Quote() {
  const [i, setI] = useState(0);
  useEffect(() => {
    // A different line per visit (picked after hydration, so server and client markup match), then one step every 30 s.
    const first = setTimeout(() => setI(Math.floor(Date.now() / QUOTE_MS) % QUOTES.length), 0);
    const id = setInterval(() => setI((n) => (n + 1) % QUOTES.length), QUOTE_MS);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  const { q, by } = QUOTES[i];
  return (
    <figure className={s.quote}>
      <blockquote key={i} className={s.quoteText}><p>{q}</p></blockquote>
      <figcaption key={by + i} className={s.quoteBy}>{by}</figcaption>
    </figure>
  );
}

function WorldTile({ w, save, next, launch }: { w: World; save: Save; next: Chapter | undefined; launch: (c: Chapter) => void }) {
  const open = worldOpen(save, w.n);
  const items = CHAPTERS.filter((c) => c.world === w.n);
  const doneCount = items.filter((c) => save.done.includes(c.id)).length;
  const complete = doneCount === items.length;
  const todo = items.find((c) => !save.done.includes(c.id) && isOpen(save, c));
  const current = !!next && next.world === w.n;
  const [peek, setPeek] = useState<Chapter | null>(null);
  const caption = peek ?? todo ?? items[items.length - 1];
  const prev = WORLDS.find((x) => x.n === w.n - 1);
  const state = !open ? s.locked : current ? s.current : complete ? s.complete : "";

  return (
    <li className={`${s.world} ${state}`}>
      <div className={s.worldSlot}>
      <div className={s.worldTop}>
        <span className={s.badge} aria-hidden>{complete ? <Check /> : !open ? <Lock /> : w.n}</span>
        <div className={s.worldText}>
          <h3>{w.title}</h3>
          {/* Hovering a node peeks at that level. */}
          <span className={`xs ${s.caption}`}>{open ? caption.title : `Unlocks after ${prev?.title ?? `World ${w.n - 1}`}`}</span>
        </div>
      </div>
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
      </div>

      {!open && <p className={`xs ${s.teaser}`}>{w.blurb}</p>}
      {open && <div className={s.actions}>
        {todo ? (
          <button className={`btn ${current ? "btn-primary" : "btn-outline"} ${s.cta}`} onClick={() => launch(todo)}>
            Start lesson <Arrow />
          </button>
        ) : (
          <button className={`btn btn-outline ${s.cta}`} onClick={() => launch(items[0])}>Replay</button>
        )}
      </div>}
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
// Same filled family as the star: a card with a diamond punched out, a globe.
const CardGlyph = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path fillRule="evenodd" d="M5 1.5h6a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2zM8 4.8L5.6 8 8 11.2 10.4 8z" fill="currentColor" /></svg>;
const Globe = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><circle cx="8" cy="8" r="6.6" fill="currentColor" /><path d="M1.6 8h12.8M8 1.4c-2.6 2.2-2.6 11 0 13.2M8 1.4c2.6 2.2 2.6 11 0 13.2" fill="none" stroke="var(--color-ink)" strokeWidth="1.2" /></svg>;
const Star = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="currentColor" /></svg>;
