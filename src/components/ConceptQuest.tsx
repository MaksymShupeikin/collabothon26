"use client";
import Link from "next/link";
import { useState } from "react";
import { CONCEPTS, WORLDS, type Concept } from "@/lib/data/concepts";
import { useProgress } from "@/lib/progress";
import Icon from "./Icon";
import MiniGameView from "./MiniGames";

export default function ConceptQuest({ concept }: { concept: Concept }) {
  const { p, complete } = useProgress();
  const [picked, setPicked] = useState<number | null>(null);
  const next = CONCEPTS[CONCEPTS.findIndex((c) => c.id === concept.id) + 1];
  const world = WORLDS[concept.world - 1];
  const done = p.done.includes(concept.id);

  return (
    <div className="container concept stack">
      <article className="card concept-card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="badge">{world.title}</span>
          {done && <span className="badge badge-dark"><Icon name="card" size={18} /> Collected</span>}
        </div>
        <h1>{concept.title}</h1>
        <p style={{ fontSize: "var(--text-lg)", lineHeight: "32px" }}>{concept.sentence}</p>
        <p className="small muted">{concept.example}</p>
      </article>

      {concept.minigame && (
        <section className="card stack">
          <div className="panel-head"><span><Icon name="game" size={24} /> {concept.game}</span></div>
          <MiniGameView game={concept.minigame} />
        </section>
      )}

      <section className="card stack">
        <h3>{concept.quiz.q}</h3>
        {concept.quiz.options.map((o, i) => (
          <button key={o} className={`option ${picked === i ? (i === concept.quiz.answer ? "right" : "wrong") : ""}`}
            onClick={() => { setPicked(i); if (i === concept.quiz.answer) complete(concept.id, 25); }}>
            {o}
          </button>
        ))}
      </section>

      {next && <Link className="btn btn-dark" style={{ alignSelf: "flex-end" }} href={`/learn/${next.id}`}>{next.title} →</Link>}
    </div>
  );
}
