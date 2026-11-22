"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HISTORY, surfaceHref, type Chapter } from "@/features/tour/chapters";
import { REPLAYS } from "@/features/market/scenarios";
import { pricesOf } from "@/features/market/engine";
import { actions, useGame, useLoaded } from "@/features/game/store";
import { setUi } from "@/features/game/ui";
import Icon from "@/shared/ui/Icon";
import { Arrow, Check, Star } from "@/features/learn/LearningMap";
import { useT } from "@/shared/lib/i18n";
import s from "./LearningMap.module.css";

const STORY_ICON: Record<string, string> = { "h-nvidia": "waves" };

/** History Mode: the historical replays, one list to pick from, all open. Years stay hidden until a story has been played. */
export default function HistoryMode() {
  const t = useT();
  const save = useGame();
  const router = useRouter();
  // Wait for the server save, like HomeSwitch, so locks and years never render wrong.
  const client = useLoaded();
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
          <Link href="/" className={`xs ${s.back}`}>{t("‹ Learning map", "‹ Lernpfad")}</Link>
          <h1 id="hist-h">{t("Real crashes,", "Echte Crashs,")}<br />{t("hidden dates", "verdeckte Daten")}</h1>
          <button className={`btn btn-primary btn-lg ${s.go}`} onClick={() => launch(next)}>
            {save.done.includes(next.id) ? t("Replay", "Wiederholen") : t("Start", "Starten")}
            <span className="btn-context">{t(next.title).replace(/^Boss: /, "vs. ")}</span>
            <Arrow />
          </button>
        </div>

        <CaseFile ch={next} index={stories.indexOf(next)} stories={stories} done={save.done} />
      </section>

      <section aria-labelledby="hist-list-h">
        <h2 id="hist-list-h" className={s.sectionHead}>{t("Stories", "Geschichten")}</h2>
        <ol className={s.histList}>
          {stories.map((c, i) => {
            const r = REPLAYS[c.replay!];
            const done = save.done.includes(c.id);
            const st = save.stars[c.id] ?? 0;
            return (
              <li key={c.id} className={`${s.histItem} ${c.id === next.id ? s.current : ""}`}>
                <Icon name={done ? "check" : c.kind === "boss" ? r.boss ?? "max" : STORY_ICON[c.id] ?? "hourglass"} size={48} round label={done ? t("Solved", "Gelöst") : undefined} />
                <div className={s.histText}>
                  <span className={`xs ${s.histKicker}`}>{t("Story", "Geschichte")} {i + 1} · {c.kind === "boss" ? t("Boss fight", "Bosskampf") : t("Guided", "Geführt")}</span>
                  <h3>{t(c.title)}</h3>
                  <span className="xs">{t(c.blurb)}</span>
                  <span className={`xs ${s.histStory}`}>{done ? t(r.reveal) : `${t("Story", "Geschichte")}: ${t(r.cover)} · ${year(c)}`}</span>
                </div>
                <div className={s.histSide}>
                  {st > 0 && <span className={`xs ${s.histStars}`} aria-label={t(`${st} of 3 stars`, `${st} von 3 Sternen`)}>{Array.from({ length: 3 }, (_, k) => <span key={k} className={k < st ? "" : s.starOff}><Star /></span>)}</span>}
                  <button className={`btn ${c.id === next.id ? "btn-primary" : "btn-outline"} ${s.cta}`} onClick={() => launch(c)}>
                    {done ? <><Check /> {t("Replay", "Wiederholen")}</> : <>{t("Play", "Spielen")} <Arrow /></>}
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
  const t = useT();
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
        <strong>{t(r.cover)}</strong>
      </div>
      <svg className={s.caseChart} viewBox={`0 0 260 ${H}`} role="img" aria-label={t("Price before the story starts; what happens next is hidden", "Kurs vor Beginn der Geschichte; was danach passiert, bleibt verdeckt")}>
        <polyline points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={ex} x2={ex} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 4" />
        <circle cx={ex} cy={ey} r="4.5" fill="var(--color-accent)" />
        <text x="222" y={H / 2} dominantBaseline="central" textAnchor="middle" className={s.caseQ}>?</text>
      </svg>
      <div className={s.caseFoot}>
        <span className={s.caseSegs} aria-hidden>{stories.map((c) => <span key={c.id} className={done.includes(c.id) ? s.caseSegOn : ""} />)}</span>
        <span className="xs">{t(`Story ${index + 1} of ${stories.length}`, `Geschichte ${index + 1} von ${stories.length}`)}</span>
      </div>
    </div>
  );
}
