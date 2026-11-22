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
import { Wordmark } from "@/shared/ui/Wordmark";
import CardArt, { CARD_SHORT } from "@/features/learn/CardArt";
import { dict, tr, useT } from "@/shared/lib/i18n";
import s from "./LearningMap.module.css";

const STARS_MAX = 21;
/** Each boss is one of the market bots; its node wears the bot's pictogram. */
export const BOSS_ICON: Record<string, string> = { b2: "max", b3: "alex", b4: "paula" };

/** The hub after onboarding: next-up hero with rank, the world path, side modes, concept cards. */
export default function LearningMap() {
  const t = useT();
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
        <h1>{t("Welcome", "Willkommen")}</h1>
        <p>{t("Answer three quick questions first, so the examples fit your life.", "Beantworte zuerst drei kurze Fragen, damit die Beispiele zu deinem Leben passen.")}</p>
        <Link className="btn btn-primary" style={{ alignSelf: "flex-start" }} href="/start">{t("Start ›", "Starten ›")}</Link>
      </div>
    </main>
  );

  const allDone = save.done.includes("b4");
  const stars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  const worldsOpen = WORLDS.filter((w) => worldOpen(save, w.n)).length;
  const started = save.done.length > 0;

  return (
    <main className={`container ${s.page}`}>
      <section className={s.hero} aria-label={t("Next up", "Als Nächstes")}>
        <div className={s.next}>
          {next ? (
            <>
              <Quote />
              <button className={`btn btn-primary btn-lg ${s.go}`} onClick={() => launch(next)}>
                {started ? t("Continue", "Weiter") : t("Start", "Starten")}
                <span className="btn-context">{t(next.title)}</span>
                <Arrow />
              </button>
            </>
          ) : (
            <>
              <Quote />
              <Link className={`btn btn-primary btn-lg ${s.go}`} href="/ready">
                {t("Open your portfolio", "Dein Depot eröffnen")}
                <span className="btn-context">{t("All cleared", "Alles geschafft")}</span>
                <Arrow />
              </Link>
            </>
          )}
        </div>

        <div className={s.hud}>
          <div className={s.rank} ref={rankRef}>
            <ProgressRing value={rankShown ? rank.progress : 0} size={72} label={t(`Rank ${rank.level} of ${RANKS.length}, ${Math.round(rank.progress * 100)}% to the next rank`, `Rang ${rank.level} von ${RANKS.length}, ${Math.round(rank.progress * 100)} % bis zum nächsten Rang`)} center={rank.level} />
            <div className={s.rankText}>
              <strong>{t(rank.name)}</strong>
              <div className={s.xpBar} aria-hidden><span style={{ width: `${rankShown ? rank.progress * 100 : 0}%` }} /></div>
              <span className="num xs"><CountUp to={save.xp} active={rankShown} />{rank.nextAt ? t(` / ${rank.nextAt} XP · next ${rank.next}`, ` / ${rank.nextAt} XP · nächster: ${t(rank.next!)}`) : t(" XP · top rank", " XP · höchster Rang")}</span>
            </div>
          </div>
          <dl className={s.tally}>
            <div><dt>{t("Stars", "Sterne")} <Star /></dt><dd className="num"><CountUp to={stars} active={rankShown} /><small>/{STARS_MAX}</small></dd></div>
            <div><dt>{t("Cards", "Karten")} <CardGlyph /></dt><dd className="num"><CountUp to={save.cards.length} active={rankShown} /><small>/{CARDS.length}</small></dd></div>
            <div><dt>{t("Modules", "Module")} <Layers /></dt><dd className="num"><CountUp to={worldsOpen} active={rankShown} /><small>/{WORLDS.length}</small></dd></div>
          </dl>
        </div>
      </section>

      <section className={s.modes} aria-label={t("Play modes", "Spielmodi")}>
        <ModeTile open icon="chart" title={t("Real Market", "Echter Markt")} line={t("Practice with historical stock prices.", "Üben mit historischen Kursen.")}
          onOpen={() => router.push("/real-market")} />
        <ModeTile open icon="sprout" title={t("Investor Simulator", "Anleger-Simulator")} line={t("30 years of life in 10 minutes.", "30 Jahre Leben in 10 Minuten.")} onOpen={() => router.push("/invest")} />
        {/* all play modes are open from the start, separate from the modules */}
        <ModeTile open icon="hourglass" title={t("History Mode", "Geschichtsmodus")} line={t("Real crashes, hidden dates.", "Echte Crashs, verdeckte Daten.")}
          onOpen={() => router.push("/history")} />
        <ModeTile open icon="agent" title={t("AI Chatbot (MCP)", "KI-Chatbot (MCP)")} line={t("Claude, ChatGPT, Gemini & Grok.", "Claude, ChatGPT, Gemini & Grok.")}
          onOpen={() => router.push("/mcp")} />
      </section>

      <section aria-labelledby="worlds-h">
        <h2 id="worlds-h" className={s.sectionHead}>{t("Learning path", "Lernpfad")}</h2>
        <ol className={s.path}>
          {WORLDS.map((w) => (
            <WorldTile key={w.n} w={w} save={save} next={next} launch={launch} />
          ))}
        </ol>
        {/* The finish line: shown only once every module is cleared, so it never competes with the lessons. */}
        {allDone && (
          <Link href="/ready" className={s.finish}>
            <span className={s.flag} aria-hidden><Icon name="flag" size={30} /></span>
            <span className={s.finishText}>
              <span className={`xs ${s.kicker}`}>{t("Finish line", "Ziellinie")}</span>
              <strong>{t("Ready for real", "Bereit für echt")}</strong>
              <span className="xs">{t("You’re ready. Same portfolio, real money.", "Du bist bereit. Gleiches Depot, echtes Geld.")}</span>
            </span>
            {/* Sandbox → real platform: every module segment lit. */}
            <span className={s.bridge} aria-hidden>
              <span className={s.bridgeEnd}>edu</span>
              {WORLDS.map((w) => <span key={w.n} className={s.seg} />)}
              <span className={`${s.bridgeEnd} ${s.real}`}><Wordmark width={84} /></span>
            </span>
            <span className={s.finishGo} aria-hidden><Arrow /></span>
          </Link>
        )}
      </section>


      <section aria-labelledby="cards-h">
        <div className={s.cardsHeading}>
          <h2 id="cards-h">{t("Concept cards", "Wissenskarten")}</h2>
          <p className={s.collectionReward}>
            {t(`Collect all ${CARDS.length} cards`, `Sammle alle ${CARDS.length} Karten`)}
            {" · "}<strong>{t("25 € account bonus", "25 € Kontobonus")}</strong>
          </p>
        </div>
        <ul className={s.cards}>
          {CARDS.map((c) => {
            const has = save.cards.includes(c.id);
            return (
              <li key={c.id} className={`${s.mini} ${has ? s.has : s.sealed}`}>
                <span className={s.miniTop}>{t("Module", "Modul")} {c.world}</span>
                <span className={s.art}>
                  <CardArt id={c.id} size={88} />
                  {!has && <span className={s.seal}><Lock /></span>}
                </span>
                <span className={s.miniName}>{t(CARD_SHORT[c.id] ?? c.title)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <details className={s.demo}>
        <summary className="xs">{t("Demo tools", "Demo-Werkzeuge")}</summary>
        <div className={s.demoBody}>
          <label className="xs"><input type="checkbox" checked={save.allUnlocked} onChange={(e) => actions.setAllUnlocked(e.target.checked)} /> {t("Unlock all worlds", "Alle Welten freischalten")}</label>
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm(t("Reset all progress and start over?", "Gesamten Fortschritt zurücksetzen und neu beginnen?"))) { actions.reset(); router.push("/start"); } }}>{t("Reset progress", "Fortschritt zurücksetzen")}</button>
        </div>
      </details>
    </main>
  );
}

/** Short, well-sourced lines from known investors. Rotates every 20 s; a fixed list, nothing is fetched. */
const QUOTES = [
  { q: "Risk comes from not knowing what you’re doing", by: "Warren Buffett" },
  { q: "Know what you own, and know why you own it", by: "Peter Lynch" },
  { q: "The investor’s chief problem is likely to be himself", by: "Benjamin Graham" },
  { q: "Don’t look for the needle in the haystack. Just buy the haystack", by: "John Bogle" },
  { q: "In investing, what is comfortable is rarely profitable", by: "Robert Arnott" },
  { q: "Be fearful when others are greedy, and greedy when others are fearful", by: "Warren Buffett" },
];
dict({
  "Risk comes from not knowing what you’re doing": "Risiko entsteht, wenn man nicht weiß, was man tut",
  "Know what you own, and know why you own it": "Wisse, was du besitzt, und wisse, warum du es besitzt",
  "The investor’s chief problem is likely to be himself": "Das größte Problem des Anlegers ist wahrscheinlich er selbst",
  "Don’t look for the needle in the haystack. Just buy the haystack": "Such nicht die Nadel im Heuhaufen. Kauf einfach den Heuhaufen",
  "In investing, what is comfortable is rarely profitable": "Beim Investieren ist das Bequeme selten profitabel",
  "Be fearful when others are greedy, and greedy when others are fearful": "Sei ängstlich, wenn andere gierig sind, und gierig, wenn andere ängstlich sind",
});
const QUOTE_MS = 20_000;
const QUOTE_OUT_MS = 300; // matches .quoteLeaving in the CSS

/** Pause before the next keystroke: an even, unhurried rhythm with a breath after punctuation and only slight unevenness. */
function keyDelay(ch: string) {
  if (ch === "," || ch === ".") return 150;
  if (ch === " ") return 48;
  return 30 + Math.random() * 10;
}

/**
 * Typewriter: each letter inks in (a short fade, not a pop) behind a yellow caret, the author appears once the line is
 * complete, and after 20 s the line dissolves and the next one is typed. The whole line is laid out from the start
 * (untyped letters are hidden, not missing), so wrapping never jumps while it types.
 */
function Quote() {
  const t = useT();
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wait = (ms: number) => new Promise<void>((r) => { timer = setTimeout(r, ms); });
    // A different line per visit (picked after hydration, so server and client markup match).
    let idx = Math.floor(Date.now() / QUOTE_MS) % QUOTES.length;
    (async () => {
      await wait(still ? 0 : 250);
      while (alive) {
        const q = tr(QUOTES[idx].q);
        setI(idx); setLeaving(false);
        if (still) setN(q.length);
        else {
          setN(0); setBusy(true);
          for (let k = 1; k <= q.length; k++) { await wait(keyDelay(q[k - 1])); if (!alive) return; setN(k); }
        }
        setBusy(false);
        await wait(QUOTE_MS); if (!alive) return;
        if (!still) {
          setLeaving(true);
          await wait(QUOTE_OUT_MS); if (!alive) return;
          setN(0);
          await wait(120); if (!alive) return;
        }
        idx = (idx + 1) % QUOTES.length;
      }
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, [t.lang]); // a language switch types the line again
  const { by } = QUOTES[i];
  const q = t(QUOTES[i].q);
  // The caret lives inside the last typed letter (never after a just-typed space), so it can't drop to a new line on its own.
  const end = q.slice(0, n).trimEnd().length;
  const caret = <span key={busy ? "busy" : `idle${i}`} className={`${s.caret} ${busy ? s.caretBusy : ""}`} />;
  return (
    <figure className={`${s.quote} ${leaving ? s.quoteLeaving : ""}`}>
      <blockquote className={s.quoteText}>
        <p>
          <span className={s.srOnly}>{q}</span>
          <span aria-hidden>
            {end === 0 && caret}
            {Array.from(q).map((ch, k) => (
              <span key={k} className={k < n ? (k === end - 1 ? `${s.ch} ${s.chCaret}` : s.ch) : s.untyped}>
                {ch}{k === end - 1 && caret}
              </span>
            ))}
          </span>
        </p>
      </blockquote>
      <figcaption className={`${s.quoteBy} ${n === q.length && n > 0 && !leaving ? s.quoteByOn : ""}`}>{by}</figcaption>
    </figure>
  );
}

function WorldTile({ w, save, next, launch }: { w: World; save: Save; next: Chapter | undefined; launch: (c: Chapter) => void }) {
  const t = useT();
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
          <h3>{t(w.title)}</h3>
          {/* Hovering a node peeks at that level. */}
          <span className={`xs ${s.caption}`}>{open ? t(caption.title) : t(`Unlocks after ${prev?.title ?? `Module ${w.n - 1}`}`, `Öffnet nach ${prev ? t(prev.title) : `Modul ${w.n - 1}`}`)}</span>
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
                aria-label={`${c.kind === "chapter" ? c.n + " " : ""}${t(c.title)}${done ? t(", done", ", erledigt") : can ? "" : t(", locked", ", gesperrt")}${st ? t(`, ${st} of 3 stars`, `, ${st} von 3 Sternen`) : ""}`}>
                {c.kind === "boss" ? <Icon name={BOSS_ICON[c.id] ?? "max"} size={40} round />
                  : c.kind === "mission" ? <Star />
                  : done ? <Check /> : <span className="num">{c.n.split(".")[1]}</span>}
                {st > 0 && <span className={s.nodeStars} aria-hidden>{st}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {!open && <p className={`xs ${s.teaser}`}>{t(w.blurb)}</p>}
      {open && <div className={s.actions}>
        {todo ? (
          <button className={`btn ${current ? "btn-primary" : "btn-outline"} ${s.cta}`} onClick={() => launch(todo)}>
            {t("Start lesson", "Lektion starten")} <Arrow />
          </button>
        ) : (
          <button className={`btn btn-outline ${s.cta}`} onClick={() => launch(items[0])}>{t("Replay", "Wiederholen")}</button>
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
export const Arrow = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
export const Check = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
export const Lock = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M5 7V5.5a3 3 0 016 0V7" fill="none" stroke="currentColor" strokeWidth="1.8" /><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="currentColor" /></svg>;
// Same filled family as the star: a card with a diamond punched out, a globe.
const CardGlyph = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path fillRule="evenodd" d="M5 1.5h6a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2zM8 4.8L5.6 8 8 11.2 10.4 8z" fill="currentColor" /></svg>;
// Stacked layers: modules built one on top of the other.
const Layers = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M8 1.5l6.5 3.4L8 8.3 1.5 4.9z" fill="currentColor" /><path d="M2 8.1l6 3.1 6-3.1M2 11.3l6 3.1 6-3.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
export const Star = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="currentColor" /></svg>;
