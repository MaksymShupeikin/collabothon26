"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cardById } from "@/lib/data/cards";
import { num, pct } from "@/lib/format";
import type { Chapter } from "@/lib/game/chapters";
import { actions } from "@/lib/game/store";
import type { News } from "@/lib/news";
import { BOTS, runBots } from "@/lib/sim/bots";
import { growth, maxDrawdown, priceAt, returnPct, riskScore, universeOf, type Sim } from "@/lib/sim/engine";
import type { BotMove, Replay } from "@/lib/sim/scenarios";
import Icon from "../Icon";
import LineChart from "../LineChart";
import ConceptCard from "../tour/ConceptCard";
import { Stars } from "../tour/TourRunner";
import Widget from "./Widget";

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
  const what = move.side === "buy" ? `bought ${move.buys!.map(([s]) => name(s)).join(", ")}` : `sold ${move.sells!.map(name).join(", ")}`;
  return (
    <div className="bot-bubble" role="status">
      <Icon name={move.bot} size={34} round label={BOTS[move.bot].name} />
      <div><strong className="xs">{BOTS[move.bot].name} {what}</strong><p className="small">“{move.say}”</p></div>
    </div>
  );
}

export function BossIntro({ replay, chapter, onStart }: { replay: Replay; chapter: Chapter; onStart: () => void }) {
  const boss = replay.boss!;
  return (
    <div className="overlay overlay-dark" role="dialog" aria-modal="true" aria-label={chapter.title}>
      <div className="boss">
        <span className="unlock-kicker">👾 Boss round · World {chapter.world}</span>
        <Icon name={boss} size={96} round label={BOTS[boss].name} />
        <h1>{BOTS[boss].name}</h1>
        <p className="unlock-sub">{BOTS[boss].habit}.</p>
        <div className="boss-rules">
          <p><strong>A historical replay.</strong> A real company and real events, but the name and the date stay hidden until the end.</p>
          <p><strong>Budget:</strong> 1.000 € play money, the same for you and every bot. Scores are in %.</p>
          <p><strong>To win:</strong> {replay.win}</p>
          <p className="xs">Score = return − ½ × worst drawdown. When a bot trades, name the habit behind it: XP for the right concept, no matter how the trade ends.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onStart} autoFocus>Start the round ›</button>
      </div>
    </div>
  );
}

export function SpotCard({ move, name, picked, onPick, onClose }: { move: BotMove; name: (s: string) => string; picked?: number; onPick: (k: number) => void; onClose: () => void }) {
  const q = move.spot!;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Spot the habit">
      <div className="modal spot">
        <span className="badge badge-accent">Spot the habit</span>
        <BotBubble move={move} name={name} />
        <h3>What&apos;s the risk here?</h3>
        <div className="stack-sm">
          {q.options.map((o, k) => (
            <button key={o} className={`option ${picked !== undefined && k === q.answer ? "right" : picked === k ? "wrong" : ""}`} disabled={picked !== undefined} onClick={() => onPick(k)}>{o}</button>
          ))}
        </div>
        {picked !== undefined && (
          <>
            <p className="small">{picked === q.answer ? "Right, +15 XP. " : "Not quite. "}{q.why}</p>
            <p className="xs muted">We judge the decision, not the outcome: the XP doesn&apos;t depend on how this trade ends.</p>
            <button className="btn btn-primary" style={{ alignSelf: "flex-end" }} onClick={onClose} autoFocus>Continue ›</button>
          </>
        )}
        {picked === undefined && <p className="xs muted">You&apos;re not guessing whether the trade will work. You&apos;re naming the habit.</p>}
      </div>
    </div>
  );
}

export function DecisionCard({ news, onDecide, onClose }: { news: News; onDecide: (act: boolean) => boolean; onClose: () => void }) {
  const [res, setRes] = useState<boolean | null>(null);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Act or ignore">
      <div className="modal">
        <span className="badge badge-accent">Read before you click</span>
        <h2>{news.headline}</h2>
        <p className="small">Is this new information that changes the picture, or something to ignore?</p>
        {res === null ? (
          <div className="row">
            <button className="btn btn-dark" onClick={() => setRes(onDecide(true))}>Act: it&apos;s new information</button>
            <button className="btn btn-outline" onClick={() => setRes(onDecide(false))}>Ignore</button>
          </div>
        ) : (
          <>
            <p className="small"><strong>{res ? "Good call." : "Not quite."}</strong> Watch the price for two days: then the news widget reveals what kind of news it was.</p>
            <button className="btn btn-primary" style={{ alignSelf: "flex-end" }} onClick={onClose} autoFocus>Continue ›</button>
          </>
        )}
      </div>
    </div>
  );
}

export function MistakeCam({ replay, sim, answers, name, compact }: { replay: Replay; sim: Sim; answers: Record<string, number>; name: (s: string) => string; compact?: boolean }) {
  const u = universeOf(replay.universe.id);
  const done = sim.day >= u.days;
  const moves = replay.moves.filter((m) => m.spot && (done || sim.day >= m.day + 3));
  if (!moves.length) return <p className="xs muted">When a bot&apos;s trade plays out, the Mistake Cam replays it here.</p>;
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
            <div className="row"><Icon name={m.bot} size={28} round /> <strong className="small">{BOTS[m.bot].name}</strong> <span className="xs muted">Day {m.day + 1}</span></div>
            <p className="xs">“{m.say}”</p>
            <p className="xs">{m.side === "buy" ? "Bought" : "Sold"} {name(s)} at {num(from)} € → now {num(to)} € (<span className={move >= 0 ? "up" : "down"}>{pct(move)}</span>).</p>
            <p className="xs"><strong>{worked ? "It worked, in spite of the strategy, not because of it." : "It went wrong."}</strong> Habit: {m.spot!.options[m.spot!.answer].toLowerCase()}.</p>
            {!compact && <p className="xs muted">{a === undefined ? "Not answered." : a === m.spot!.answer ? "✓ You spotted it." : "✗ You missed it."} Concept: {cardById(replay.concept)?.title}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function Rivals({ replay, sim, answers, cover }: { replay: Replay; sim: Sim; answers: Record<string, number>; cover: (s: string) => string }) {
  const board = useBoard(replay, sim);
  return (
    <Widget id="w-rivals" title="Rivals" sub="Mock bots · scripted" className="g-rivals">
      <table className="pt-table">
        <thead><tr><th>#</th><th>Trader</th><th className="r">Return</th><th className="r">Score</th></tr></thead>
        <tbody>
          {board.map((r, i) => (
            <tr key={r.id} className={r.id === "you" ? "sel" : ""}>
              <td className="num">{i + 1}</td>
              <td><span className="row nowrap"><Icon name={r.id} size={22} round /> {r.name}</span></td>
              <td className={`r num ${r.ret >= 0 ? "up" : "down"}`}>{pct(r.ret)}</td>
              <td className="r num"><strong>{num(r.score)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pt-sub-title xs">Mistake Cam</div>
      <MistakeCam replay={replay} sim={sim} answers={answers} name={cover} compact />
    </Widget>
  );
}

/** End of a replay: the reveal, the Mistake Cam, the leaderboard and (for bosses) the verdict. */
export function RevealModal({ replay, chapter, sim, answers, name, onClose }: { replay: Replay; chapter?: Chapter; sim: Sim; answers: Record<string, number>; name: (s: string) => string; onClose: () => void }) {
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

  const series = board.map((r, i) => ({ values: r.series.map((v) => v * 100), color: r.id === "you" ? "var(--color-accent)" : r.id === replay.boss ? "var(--color-ink)" : COLORS[i % COLORS.length], label: r.name, width: r.id === "you" ? 4 : r.id === replay.boss ? 3 : 1.5 }));
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Reveal">
      <div className="modal modal-wide reveal">
        <span className="badge badge-dark">The reveal</span>
        <h1 className="reveal-title">{replay.reveal}</h1>
        <p>{replay.after}</p>
        {boss && (
          <div className={`verdict ${won ? "won" : "lost"}`}>
            <Icon name={replay.boss!} size={48} round />
            <div>
              <strong>{won ? `You beat ${BOTS[replay.boss!].name}!` : `${BOTS[replay.boss!].name} wins this time.`}</strong>
              <p className="small">{avoided ? "✓ You avoided the boss's mistake." : "✗ You made the boss's mistake."} {beat ? "✓ Higher risk-adjusted score." : "✗ Lower risk-adjusted score."} {spotted} / {spots.length} habits spotted.</p>
            </div>
            <Stars n={stars} />
          </div>
        )}
        <div className="reveal-grid">
          <div>
            <h3>Leaderboard</h3>
            <p className="xs muted">Ranked by risk-adjusted score = return − ½ × worst drawdown. Never by trading volume or predictions.</p>
            <table className="wtable">
              <thead><tr><th>Trader</th><th className="r">Return</th><th className="r">Worst drop</th><th className="r">Score</th></tr></thead>
              <tbody>
                {board.map((r) => (
                  <tr key={r.id} className={r.id === "you" ? "me" : ""}>
                    <td><span className="row nowrap"><Icon name={r.id} size={26} round /> <span>{r.name}{r.habit && <span className="xs muted block">{r.habit}</span>}</span></span></td>
                    <td className={`r num ${r.ret >= 0 ? "up" : "down"}`}>{pct(r.ret)}</td>
                    <td className="r num">−{num(r.dd, 1)} %</td>
                    <td className="r num"><strong>{num(r.score)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="xs">Your understanding score: <strong>{spotted} / {spots.length}</strong> habits spotted.</p>
          </div>
          <div>
            <h3>Depot curves</h3>
            <LineChart series={series} height={200} />
            <div className="row xs legend-row">{series.map((s) => <span key={s.label}><span className="swatch" style={{ background: s.color }} /> {s.label}</span>)}</div>
          </div>
        </div>
        <h3>Mistake Cam</h3>
        <MistakeCam replay={replay} sim={sim} answers={answers} name={name} />
        <div className="card-row"><ConceptCard id={replay.concept} /></div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Look at the market</button>
          <Link className="btn btn-primary" href="/" onClick={() => actions.start(null)}>Learning map ›</Link>
        </div>
      </div>
    </div>
  );
}
