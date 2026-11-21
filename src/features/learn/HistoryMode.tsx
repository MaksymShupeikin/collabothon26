"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { HISTORY, surfaceHref, type Chapter } from "@/features/tour/chapters";
import { REPLAYS } from "@/features/market/scenarios";
import { pricesOf } from "@/features/market/engine";
import { actions, useGame } from "@/features/game/store";
import { setUi } from "@/features/game/ui";
import Icon from "@/shared/ui/Icon";
import { Arrow, Check, Star } from "@/features/learn/LearningMap";
import s from "./LearningMap.module.css";

const noop = () => () => {};
const STORY_ICON: Record<string, string> = { "h-nvidia": "waves" };

/** History Mode: the historical replays, one list to pick from, all open. Years stay hidden until a story has been played. */
export default function HistoryMode() {
  const save = useGame();
  const router = useRouter();
  // Progress lives in localStorage: render on the client only, like HomeSwitch, so locks and years never hydrate wrong.
  const client = useSyncExternalStore(noop, () => true, () => false);
  const stories = HISTORY;
  const next = stories.find((c) => !save.done.includes(c.id)) ?? stories[0];

  function launch(ch: Chapter) {
    actions.start(ch.id);
    setUi({});
    router.push(surfaceHref(ch));
  }

  if (!client) return null;
  const year = (c: Chapter) => (save.done.includes(c.id) ? REPLAYS[c.replay!].universe.startDate.slice(0, 4) : "????");

  return (
    <main className={`container ${s.page}`}>
      <section className={`${s.hero} ${s.histHero}`} aria-labelledby="hist-h">
        <div className={s.next}>
          <Link href="/" className={`xs ${s.back}`}>‹ Learning map</Link>
          <h1 id="hist-h">Real crashes,<br />hidden dates</h1>
          <button className={`btn btn-primary btn-lg ${s.go}`} onClick={() => launch(next)}>
            {save.done.includes(next.id) ? "Replay" : "Start"}
            <span className={s.goSub}>{next.title.replace(/^Boss: /, "vs. ")}</span>
            <Arrow />
          </button>
        </div>

        <CaseFile ch={next} index={stories.indexOf(next)} stories={stories} done={save.done} />
      </section>

      <section aria-labelledby="hist-list-h">
        <h2 id="hist-list-h" className={s.sectionHead}>Stories</h2>
        <ol className={s.histList}>
          {stories.map((c, i) => {
            const r = REPLAYS[c.replay!];
            const done = save.done.includes(c.id);
            const st = save.stars[c.id] ?? 0;
            return (
              <li key={c.id} className={`${s.histItem} ${c.id === next.id ? s.current : ""}`}>
                <Icon name={done ? "check" : c.kind === "boss" ? r.boss ?? "max" : STORY_ICON[c.id] ?? "hourglass"} size={48} round label={done ? "Solved" : undefined} />
                <div className={s.histText}>
                  <span className={`xs ${s.histKicker}`}>Story {i + 1} · {c.kind === "boss" ? "Boss fight" : "Guided"}</span>
                  <h3>{c.title}</h3>
                  <span className="xs">{c.blurb}</span>
                  <span className={`xs ${s.histStory}`}>{done ? r.reveal : `Story: ${r.cover} · ${year(c)}`}</span>
                </div>
                <div className={s.histSide}>
                  {st > 0 && <span className={`xs ${s.histStars}`} aria-label={`${st} of 3 stars`}>{Array.from({ length: 3 }, (_, k) => <span key={k} className={k < st ? "" : s.starOff}><Star /></span>)}</span>}
                  <button className={`btn ${c.id === next.id ? "btn-primary" : "btn-outline"} ${s.cta}`} onClick={() => launch(c)}>
                    {done ? <><Check /> Replay</> : <>Play <Arrow /></>}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}

/**
 * The next story as a case file: masked name, hidden WKN and date, and the real price line up to day 0,
 * then a question mark where the story starts. Only the pre-history is drawn, so nothing is spoiled.
 */
function CaseFile({ ch, index, stories, done }: { ch: Chapter; index: number; stories: Chapter[]; done: string[] }) {
  const r = REPLAYS[ch.replay!];
  const u = r.universe;
  const pts = pricesOf(u)[r.hero].slice(u.history - 60, u.history + 1);
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const W = 180, H = 72; // the line fills x 0..W; the "?" sits in the space to its right
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * W, 6 + (1 - (p - lo) / (hi - lo || 1)) * (H - 12)]);
  const [ex, ey] = xy[xy.length - 1];
  return (
    <div className={`${s.hud} ${s.case}`}>
      <div className={s.caseName}>
        <strong>{r.cover}</strong>
      </div>
      <svg className={s.caseChart} viewBox={`0 0 260 ${H}`} role="img" aria-label="Price before the story starts; what happens next is hidden">
        <polyline points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={ex} x2={ex} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 4" />
        <circle cx={ex} cy={ey} r="4.5" fill="var(--color-accent)" />
        <text x="222" y={H / 2} dominantBaseline="central" textAnchor="middle" className={s.caseQ}>?</text>
      </svg>
      <div className={s.caseFoot}>
        <span className={s.caseSegs} aria-hidden>{stories.map((c) => <span key={c.id} className={done.includes(c.id) ? s.caseSegOn : ""} />)}</span>
        <span className="xs">Story {index + 1} of {stories.length}</span>
      </div>
    </div>
  );
}
