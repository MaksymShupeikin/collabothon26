"use client";
import Link from "next/link";
import { useState } from "react";
import { CONCEPTS, QUIZ_XP, WORLDS, type Concept } from "@/lib/data/concepts";
import { useProgress } from "@/lib/progress";
import Glyph from "./Glyph";
import Icon from "./Icon";
import MiniGameView from "./MiniGames";

/** One learning card (mockup 03): topic pill, idea, example, optional mini-game, one question, one primary action. */
export default function ConceptQuest({ concept }: { concept: Concept }) {
  const { p, complete } = useProgress();
  const [picked, setPicked] = useState<number | null>(null);
  const next = CONCEPTS[CONCEPTS.findIndex((c) => c.id === concept.id) + 1];
  const world = WORLDS[concept.world - 1];
  const inWorld = CONCEPTS.filter((c) => c.world === concept.world);
  const position = inWorld.findIndex((c) => c.id === concept.id) + 1;
  const done = p.done.includes(concept.id);
  const answered = picked !== null;
  const right = picked === concept.quiz.answer;

  return (
    <div className="container concept lesson">
      <header className="lesson-head">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="badge">{world.title} · {position}/{inWorld.length}</span>
          {done && <span className="badge badge-dark"><Icon name="card" size={18} /> Collected</span>}
        </div>
        <h1>{concept.title}</h1>
        <p className="lesson-idea">{concept.sentence}</p>
        <p className="small muted">{concept.example}</p>
      </header>

      {concept.minigame && (
        <section className="lesson-block" aria-label={concept.game}>
          <h2 className="lesson-label"><Icon name="game" size={20} /> {concept.game}</h2>
          <MiniGameView game={concept.minigame} />
        </section>
      )}

      <section className="lesson-block" aria-labelledby="quiz-q">
        <h2 id="quiz-q" className="lesson-q">{concept.quiz.q}</h2>
        <div className="options" role="radiogroup" aria-labelledby="quiz-q">
          {concept.quiz.options.map((o, i) => {
            const state = picked === i ? (i === concept.quiz.answer ? "right" : "wrong") : "";
            return (
              <button key={o} role="radio" aria-checked={picked === i} className={`option ${state}`}
                onClick={() => { setPicked(i); if (i === concept.quiz.answer) complete(concept.id, QUIZ_XP); }}>
                <span className="option-mark" aria-hidden>{state === "right" ? <Glyph name="check" size={14} /> : state === "wrong" ? <Glyph name="cross" size={14} /> : null}</span>
                {o}
              </button>
            );
          })}
        </div>
        <p className="small" aria-live="polite">
          {answered && (right ? <span className="badge badge-accent">+{QUIZ_XP} XP</span> : <span className="muted">Not quite. Try another answer.</span>)}
        </p>
      </section>

      {next && (
        <Link className={`btn btn-lg ${right || done ? "btn-primary" : "btn-outline"} lesson-next`} href={`/learn/${next.id}`}>
          Next card: {next.title} →
        </Link>
      )}
    </div>
  );
}
