"use client";
import Link from "next/link";
import { useState } from "react";
import { conceptById } from "@/lib/data/concepts";
import { HISTORY, type Direction } from "@/lib/data/history";
import { useProgress } from "@/lib/progress";
import Glyph from "@/components/Glyph";

const DIRS: { d: Direction; label: string }[] = [{ d: "up", label: "Up" }, { d: "flat", label: "Flat" }, { d: "down", label: "Down" }];
const CONF = [50, 70, 90];
type Result = { right: boolean; conf: number };

export default function HistoryPage() {
  const { addXP } = useProgress();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<Direction | null>(null);
  const [conf, setConf] = useState(70);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const round = HISTORY[i];
  const finished = results.length === HISTORY.length && i === HISTORY.length - 1 && revealed;

  function reveal() {
    const right = dir === round.answer;
    setResults([...results, { right, conf }]);
    if (right) addXP(conf === 90 ? 20 : conf === 70 ? 15 : 10);
    setRevealed(true);
  }
  function next() { setI(i + 1); setDir(null); setConf(70); setRevealed(false); }
  function restart() { setI(0); setDir(null); setConf(70); setRevealed(false); setResults([]); }

  const concept = conceptById(round.concept);
  return (
    <div className="container concept stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>History</h1>
        <span className="badge badge-dark">{i + 1} / {HISTORY.length}</span>
      </div>

      <section className="card stack">
        <div className="panel-head">{revealed ? round.reveal : "Date hidden"}</div>
        {round.headlines.map((h) => (
          <div key={h.text} className={`news-item ${revealed && h.relevant ? "major" : ""}`}>
            {h.text}
            {revealed && !h.relevant && <div className="xs muted">Noise</div>}
          </div>
        ))}
      </section>

      <section className="card stack">
        <h2>{round.question}</h2>
        <div className="row" role="group" aria-label="Your prediction">
          {DIRS.map(({ d, label }) => (
            <button key={d} className="btn btn-outline dir" aria-pressed={dir === d} disabled={revealed} onClick={() => setDir(d)}><Glyph name={d} size={20} /> {label}</button>
          ))}
        </div>
        <div className="row">
          <span className="small">Sure?</span>
          <div className="seg" role="group" aria-label="Confidence">
            {CONF.map((c) => <button key={c} aria-pressed={conf === c} disabled={revealed} onClick={() => setConf(c)}>{c}%</button>)}
          </div>
        </div>
        {!revealed && <button className="btn btn-primary" disabled={!dir} onClick={reveal}>Reveal</button>}
        {revealed && (
          <div className="stack" style={{ gap: "var(--space-3)" }}>
            <h3 className={dir === round.answer ? "up" : "down"}><Glyph name={dir === round.answer ? "check" : "cross"} size={20} /> {dir === round.answer ? "Right" : "Wrong"}</h3>
            <p className="small">{round.outcome}</p>
            <p className="small"><strong>{round.lesson}</strong></p>
            {concept && <Link className="small" href={`/learn/${concept.id}`}>{concept.title} →</Link>}
            {i < HISTORY.length - 1 && <button className="btn btn-dark" onClick={next}>Next →</button>}
          </div>
        )}
      </section>

      {finished && (
        <section className="card stack">
          <h2>{results.filter((r) => r.right).length} / {HISTORY.length} right</h2>
          {CONF.map((c) => {
            const rs = results.filter((r) => r.conf === c);
            if (!rs.length) return null;
            const hit = Math.round((rs.filter((r) => r.right).length / rs.length) * 100);
            const verdict = hit < c - 15 ? "overconfident" : hit > c + 15 ? "underconfident" : "well calibrated";
            return <p key={c} className="small">Said {c}% sure → right {hit}% · <strong>{verdict}</strong></p>;
          })}
          <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={restart}>Play again</button>
        </section>
      )}
    </div>
  );
}
