"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cardById } from "@/features/learn/cards";
import { num, pct } from "@/shared/lib/format";
import type { Chapter } from "@/features/tour/chapters";
import { actions } from "@/features/game/store";
import type { News } from "@/features/market/news";
import { BOTS, runBots } from "@/features/market/bots";
import { growth, maxDrawdown, priceAt, returnPct, riskScore, universeOf, type Sim } from "@/features/market/engine";
import type { BotMove, Replay } from "@/features/market/scenarios";
import Icon from "@/shared/ui/Icon";
import LineChart from "@/shared/charts/LineChart";
import ConceptCard from "@/features/learn/ConceptCard";
import { Stars } from "@/features/tour/TourRunner";
import Widget from "@/features/pro/Widget";
import { dict, useT } from "@/shared/lib/i18n";

dict({ You: "Du" });

// ── Scores ────────────────────────────────────────────────────────────────

type Row = { id: string; name: string; habit?: string; series: number[]; score: number; ret: number; dd: number };

export function useBoard(replay: Replay, sim: Sim): Row[] {
  const bots = useMemo(() => runBots(replay), [replay]);
  return useMemo(() => {
    const d = sim.day;
    const you = growth(sim.acct.values.slice(0, d + 1), sim.acct.deposits.slice(0, d + 1));
    const rows: Row[] = [{ id: "you", name: "You", series: you, score: riskScore(you), ret: returnPct(you), dd: maxDrawdown(you) * 100 }];
    for (const b of bots) {
      const s = b.acct.values.slice(0, d + 1).map((v) => v / replay.budget);
      rows.push({ id: b.id, name: BOTS[b.id].name, habit: BOTS[b.id].habit, series: s, score: riskScore(s), ret: returnPct(s), dd: maxDrawdown(s) * 100 });
    }
    return rows.sort((a, b) => b.score - a.score);
  }, [bots, sim, replay.budget]);
}

/** Holdings weights per day (share of total money), rebuilt from the trade list. */
function weightsByDay(sim: Sim) {
  const u = universeOf(sim.universe);
  const out: Record<string, number>[] = [];
  const qty: Record<string, number> = {};
  for (let d = 0; d <= sim.day; d++) {
    for (const t of sim.acct.trades.filter((x) => x.day === d)) qty[t.sym] = (qty[t.sym] ?? 0) + (t.side === "buy" ? t.qty : -t.qty);
    const total = sim.acct.values[d] || 1;
    out.push(Object.fromEntries(Object.entries(qty).map(([s, q]) => [s, (q * priceAt(u, s, d)) / total])));
  }
  return out;
}

const COLORS = ["var(--color-ink-2)", "var(--color-border)", "var(--color-bg-dark)", "var(--color-gain)", "var(--color-loss)"];

// ── Pieces ────────────────────────────────────────────────────────────────

export function BotBubble({ move, name }: { move: BotMove; name: (s: string) => string }) {
  const t = useT();
  const what = move.side === "buy" ? t(`bought ${move.buys!.map(([s]) => name(s)).join(", ")}`, `kauft ${move.buys!.map(([s]) => name(s)).join(", ")}`) : t(`sold ${move.sells!.map(name).join(", ")}`, `verkauft ${move.sells!.map(name).join(", ")}`);
  return (
    <div className="bot-bubble" role="status">
      <Icon name={move.bot} size={34} round label={t(BOTS[move.bot].name)} />
      <div><strong className="xs">{t(BOTS[move.bot].name)} {what}</strong><p className="small">{t("“", "„")}{t(move.say)}{t("”", "“")}</p></div>
    </div>
  );
}

export function BossIntro({ replay, chapter, onStart }: { replay: Replay; chapter: Chapter; onStart: () => void }) {
  const t = useT();
  const boss = replay.boss!;
  return (
    <div className="overlay overlay-dark" role="dialog" aria-modal="true" aria-label={t(chapter.title)}>
      <div className="boss">
        <span className="unlock-kicker">👾 {t("Boss round", "Bossrunde")}{chapter.world ? ` · ${t("Module", "Modul")} ${chapter.world}` : ""}</span>
        <Icon name={boss} size={96} round label={t(BOTS[boss].name)} />
        <h1>{t(BOTS[boss].name)}</h1>
        <p className="unlock-sub">{t(BOTS[boss].habit)}.</p>
        <div className="boss-rules">
          {replay.sim
            ? <p><strong>{t("A simulated market.", "Ein simulierter Markt.")}</strong> {t("Made-up headlines, real companies, real lessons.", "Erfundene Schlagzeilen, echte Unternehmen, echte Lektionen.")}</p>
            : <p><strong>{t("A historical replay.", "Ein historisches Replay.")}</strong> {t("A real company and real events, but the name and the date stay hidden until the end.", "Ein echtes Unternehmen und echte Ereignisse, aber Name und Datum bleiben bis zum Ende verdeckt.")}</p>}
          <p><strong>{t("Budget:", "Budget:")}</strong> {t("1.000 € play money, the same for you and every bot. Scores are in %.", "1.000 € Spielgeld, gleich viel für dich und jeden Bot. Die Scores sind in %.")}</p>
          <p><strong>{t("To win:", "Zum Sieg:")}</strong> {t(replay.win)}</p>
          <p className="xs">{t("Score = return − ½ × worst drawdown. When a bot trades, name the habit behind it: XP for the right concept, no matter how the trade ends.", "Score = Rendite − ½ × größter Drawdown. Wenn ein Bot handelt, benenne die Gewohnheit dahinter: XP für das richtige Konzept, egal wie der Trade ausgeht.")}</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onStart} autoFocus>{t("Start the round ›", "Runde starten ›")}</button>
      </div>
    </div>
  );
}

export function SpotCard({ move, name, picked, onPick, onClose }: { move: BotMove; name: (s: string) => string; picked?: number; onPick: (k: number) => void; onClose: () => void }) {
  const t = useT();
  const q = move.spot!;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("Spot the habit", "Erkenne die Gewohnheit")}>
      <div className="modal spot">
        <span className="badge badge-accent">{t("Spot the habit", "Erkenne die Gewohnheit")}</span>
        <BotBubble move={move} name={name} />
        <h3>{t("What's the risk here?", "Was ist hier das Risiko?")}</h3>
        <div className="stack-sm">
          {q.options.map((o, k) => (
            <button key={o} className={`option ${picked !== undefined && k === q.answer ? "right" : picked === k ? "wrong" : ""}`} disabled={picked !== undefined} onClick={() => onPick(k)}>{t(o)}</button>
          ))}
        </div>
        {picked !== undefined && (
          <>
            <p className="small">{picked === q.answer ? t("Right, +15 XP. ", "Richtig, +15 XP. ") : t("Not quite. ", "Nicht ganz. ")}{t(q.why)}</p>
            <p className="xs muted">{t("We judge the decision, not the outcome: the XP doesn't depend on how this trade ends.", "Wir bewerten die Entscheidung, nicht das Ergebnis: Die XP hängen nicht davon ab, wie dieser Trade ausgeht.")}</p>
            <button className="btn btn-primary" style={{ alignSelf: "flex-end" }} onClick={onClose} autoFocus>{t("Continue ›", "Weiter ›")}</button>
          </>
        )}
        {picked === undefined && <p className="xs muted">{t("You're not guessing whether the trade will work. You're naming the habit.", "Du rätst nicht, ob der Trade aufgeht. Du benennst die Gewohnheit.")}</p>}
      </div>
    </div>
  );
}

export function DecisionCard({ news, onDecide, onClose }: { news: News; onDecide: (act: boolean) => boolean; onClose: () => void }) {
  const t = useT();
  const [res, setRes] = useState<boolean | null>(null);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("Act or ignore", "Handeln oder ignorieren")}>
      <div className="modal">
        <span className="badge badge-accent">{t("Read before you click")}</span>
        <h2>{t(news.headline)}</h2>
        <p className="small">{t("Is this new information that changes the picture, or something to ignore?", "Ist das neue Information, die das Bild verändert, oder etwas zum Ignorieren?")}</p>
        {res === null ? (
          <div className="row">
            <button className="btn btn-dark" onClick={() => setRes(onDecide(true))}>{t("Act: it's new information", "Handeln: Das ist neue Information")}</button>
            <button className="btn btn-outline" onClick={() => setRes(onDecide(false))}>{t("Ignore", "Ignorieren")}</button>
          </div>
        ) : (
          <>
            <p className="small"><strong>{res ? t("Good call.", "Gut entschieden.") : t("Not quite.", "Nicht ganz.")}</strong> {t("Watch the price for two days: then the news widget reveals what kind of news it was.", "Beobachte den Kurs zwei Tage lang: Dann zeigt das News-Widget, welche Art von News es war.")}</p>
            <button className="btn btn-primary" style={{ alignSelf: "flex-end" }} onClick={onClose} autoFocus>{t("Continue ›", "Weiter ›")}</button>
          </>
        )}
      </div>
    </div>
  );
}

export function MistakeCam({ replay, sim, answers, name, compact }: { replay: Replay; sim: Sim; answers: Record<string, number>; name: (s: string) => string; compact?: boolean }) {
  const t = useT();
  const u = universeOf(replay.universe.id);
  const done = sim.day >= u.days;
  const moves = replay.moves.filter((m) => m.spot && (done || sim.day >= m.day + 3));
  if (!moves.length) return <p className="xs muted">{t("When a bot's trade plays out, the Mistake Cam replays it here.", "Wenn sich der Trade eines Bots entwickelt hat, zeigt die Fehler-Cam ihn hier noch einmal.")}</p>;
  return (
    <div className="mcam">
      {moves.map((m) => {
        const s = (m.buys?.[0]?.[0] ?? m.sells![0]);
        const from = priceAt(u, s, m.day), to = priceAt(u, s, Math.min(sim.day, u.days));
        const move = (to / from - 1) * 100;
        const worked = m.side === "buy" ? move > 0 : move < 0;
        const a = answers[m.bot + m.day];
        return (
          <div key={m.bot + m.day} className="mcam-item">
            <div className="row"><Icon name={m.bot} size={28} round /> <strong className="small">{t(BOTS[m.bot].name)}</strong> <span className="xs muted">{t("Day", "Tag")} {m.day + 1}</span></div>
            <p className="xs">{t("“", "„")}{t(m.say)}{t("”", "“")}</p>
            <p className="xs">{t(m.side === "buy" ? "Bought" : "Sold", m.side === "buy" ? "Gekauft:" : "Verkauft:")} {name(s)} {t("at", "zu")} {num(from)} € → {t("now", "jetzt")} {num(to)} € (<span className={move >= 0 ? "up" : "down"}>{pct(move)}</span>).</p>
            <p className="xs"><strong>{worked ? t("It worked, in spite of the strategy, not because of it.", "Es hat geklappt, trotz der Strategie, nicht wegen ihr.") : t("It went wrong.", "Es ging schief.")}</strong> {t("Habit", "Gewohnheit")}: {t.lang === "de" ? t(m.spot!.options[m.spot!.answer]) : m.spot!.options[m.spot!.answer].toLowerCase()}.</p>
            {!compact && <p className="xs muted">{a === undefined ? t("Not answered.", "Nicht beantwortet.") : a === m.spot!.answer ? t("✓ You spotted it.", "✓ Erkannt.") : t("✗ You missed it.", "✗ Nicht erkannt.")} {t("Concept", "Konzept")}: {t(cardById(replay.concept)?.title ?? "")}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function Rivals({ replay, sim, answers, cover }: { replay: Replay; sim: Sim; answers: Record<string, number>; cover: (s: string) => string }) {
  const t = useT();
  const board = useBoard(replay, sim);
  return (
    <Widget id="w-rivals" title={t("Rivals", "Rivalen")} sub={t("Mock bots · scripted", "Test-Bots · geskriptet")} className="g-rivals">
      <table className="pt-table">
        <thead><tr><th>#</th><th>Trader</th><th className="r">{t("Return", "Rendite")}</th><th className="r">Score</th></tr></thead>
        <tbody>
          {board.map((r, i) => (
            <tr key={r.id} className={r.id === "you" ? "sel" : ""}>
              <td className="num">{i + 1}</td>
              <td><span className="row nowrap"><Icon name={r.id} size={22} round /> {t(r.name)}</span></td>
              <td className={`r num ${r.ret >= 0 ? "up" : "down"}`}>{pct(r.ret)}</td>
              <td className="r num"><strong>{num(r.score)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pt-sub-title xs">{t("Mistake Cam", "Fehler-Cam")}</div>
      <MistakeCam replay={replay} sim={sim} answers={answers} name={cover} compact />
    </Widget>
  );
}

/** End of a replay: the reveal, the Mistake Cam, the leaderboard and (for bosses) the verdict. */
export function RevealModal({ replay, chapter, sim, answers, name, onClose }: { replay: Replay; chapter?: Chapter; sim: Sim; answers: Record<string, number>; name: (s: string) => string; onClose: () => void }) {
  const t = useT();
  const board = useBoard(replay, sim);
  const you = board.find((r) => r.id === "you")!;
  const boss = replay.boss ? board.find((r) => r.id === replay.boss)! : undefined;
  const weights = useMemo(() => weightsByDay(sim), [sim]);
  const avoided = replay.avoid({ weights, trades: sim.acct.trades });
  const beat = boss ? you.score > boss.score : true;
  const spots = replay.moves.filter((m) => m.spot);
  const spotted = spots.filter((m) => answers[m.bot + m.day] === m.spot!.answer).length;
  const won = !!boss && avoided && beat;
  const stars = !boss ? 0 : 1 + (won ? 1 : 0) + (won && spotted === spots.length ? 1 : 0);

  useEffect(() => {
    actions.award(`replay:${replay.id}`, 50);
    if (won) actions.award(`boss:${replay.id}`, 100);
    if (chapter) {
      (chapter.card ?? []).forEach(actions.collect);
      actions.finish(chapter.id, stars || undefined);
    }
  }, [replay.id, won, chapter, stars]);

  const series = board.map((r, i) => ({ values: r.series.map((v) => v * 100), color: r.id === "you" ? "var(--color-accent)" : r.id === replay.boss ? "var(--color-ink)" : COLORS[i % COLORS.length], label: t(r.name), width: r.id === "you" ? 4 : r.id === replay.boss ? 3 : 1.5 }));
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("Reveal", "Auflösung")}>
      <div className="modal modal-wide reveal">
        <span className="badge badge-dark">{replay.sim ? t("Round over", "Runde vorbei") : t("The reveal", "Die Auflösung")}</span>
        <h1 className="reveal-title">{t(replay.reveal)}</h1>
        <p>{t(replay.after)}</p>
        {boss && (
          <div className={`verdict ${won ? "won" : "lost"}`}>
            <Icon name={replay.boss!} size={48} round />
            <div>
              <strong>{won ? t(`You beat ${BOTS[replay.boss!].name}!`, `Du hast ${t(BOTS[replay.boss!].name)} geschlagen!`) : t(`${BOTS[replay.boss!].name} wins this time.`, `Diesmal gewinnt ${t(BOTS[replay.boss!].name)}.`)}</strong>
              <p className="small">{avoided ? t("✓ You avoided the boss's mistake.", "✓ Du hast den Fehler des Bosses vermieden.") : t("✗ You made the boss's mistake.", "✗ Du hast den Fehler des Bosses gemacht.")} {beat ? t("✓ Higher risk-adjusted score.", "✓ Höherer risikobereinigter Score.") : t("✗ Lower risk-adjusted score.", "✗ Niedrigerer risikobereinigter Score.")} {spotted} / {spots.length} {t("habits spotted.", "Gewohnheiten erkannt.")}</p>
            </div>
            <Stars n={stars} />
          </div>
        )}
        <div className="reveal-grid">
          <div>
            <h3>{t("Leaderboard", "Rangliste")}</h3>
            <p className="xs muted">{t("Ranked by risk-adjusted score = return − ½ × worst drawdown. Never by trading volume or predictions.", "Sortiert nach risikobereinigtem Score = Rendite − ½ × größter Drawdown. Nie nach Handelsvolumen oder Prognosen.")}</p>
            <table className="wtable">
              <thead><tr><th>Trader</th><th className="r">{t("Return", "Rendite")}</th><th className="r">{t("Worst drop", "Größter Einbruch")}</th><th className="r">Score</th></tr></thead>
              <tbody>
                {board.map((r) => (
                  <tr key={r.id} className={r.id === "you" ? "me" : ""}>
                    <td><span className="row nowrap"><Icon name={r.id} size={26} round /> <span>{t(r.name)}{r.habit && <span className="xs muted block">{t(r.habit)}</span>}</span></span></td>
                    <td className={`r num ${r.ret >= 0 ? "up" : "down"}`}>{pct(r.ret)}</td>
                    <td className="r num">−{num(r.dd, 1)} %</td>
                    <td className="r num"><strong>{num(r.score)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="xs">{t("Your understanding score:", "Dein Verständnis-Score:")} <strong>{spotted} / {spots.length}</strong> {t("habits spotted.", "Gewohnheiten erkannt.")}</p>
          </div>
          <div>
            <h3>{t("Portfolio curves", "Depotverläufe")}</h3>
            <LineChart series={series} height={200} />
            <div className="row xs legend-row">{series.map((s) => <span key={s.label}><span className="swatch" style={{ background: s.color }} /> {s.label}</span>)}</div>
          </div>
        </div>
        <h3>{t("Mistake Cam", "Fehler-Cam")}</h3>
        <MistakeCam replay={replay} sim={sim} answers={answers} name={name} />
        <div className="card-row"><ConceptCard id={replay.concept} /></div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>{t("Look at the market", "Den Markt ansehen")}</button>
          {replay.sim
            ? <Link className="btn btn-primary" href="/" onClick={() => actions.start(null)}>{t("Back to the learning map ›", "Zurück zum Lernpfad ›")}</Link>
            : <Link className="btn btn-primary" href="/history" onClick={() => actions.start(null)}>{t("Back to History mode ›", "Zurück zum Geschichtsmodus ›")}</Link>}
        </div>
      </div>
    </div>
  );
}
