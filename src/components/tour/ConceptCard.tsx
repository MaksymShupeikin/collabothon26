"use client";
import { useState } from "react";
import { cardById } from "@/lib/data/cards";
import { actions } from "@/lib/game/store";
import Icon from "../Icon";

/** A concept card. Front: one sentence. Back: example + one quiz question (XP for the right answer). */
export default function ConceptCard({ id, startFlipped = false }: { id: string; startFlipped?: boolean }) {
  const card = cardById(id);
  const [flipped, setFlipped] = useState(startFlipped);
  const [picked, setPicked] = useState<number | null>(null);
  if (!card) return null;
  return (
    <div className={`ccard ${flipped ? "flipped" : ""}`}>
      {!flipped ? (
        <button className="ccard-face" onClick={() => setFlipped(true)} aria-label={`${card.title}: turn the card`}>
          <span className="ccard-top"><Icon name="card" size={28} /> <span className="xs">World {card.world}</span></span>
          <strong className="ccard-title">{card.title}</strong>
          <span className="ccard-front">{card.front}</span>
          <span className="xs muted">Turn the card ↻</span>
        </button>
      ) : (
        <div className="ccard-face back">
          <span className="ccard-top"><strong>{card.title}</strong><button className="btn btn-ghost btn-sm" onClick={() => setFlipped(false)}>↻ Front</button></span>
          <p className="small">{card.example}</p>
          <p className="small"><strong>{card.quiz.q}</strong></p>
          <div className="stack-sm">
            {card.quiz.options.map((o, i) => (
              <button key={o} className={`option ${picked !== null && i === card.quiz.answer ? "right" : picked === i ? "wrong" : ""}`} disabled={picked !== null}
                onClick={() => { setPicked(i); if (i === card.quiz.answer) actions.understood(`card:${id}`, 15); }}>
                {o}
              </button>
            ))}
          </div>
          {picked !== null && <p className="xs">{picked === card.quiz.answer ? "Right. +15 XP" : "Not quite. The green one is right."}</p>}
        </div>
      )}
    </div>
  );
}
