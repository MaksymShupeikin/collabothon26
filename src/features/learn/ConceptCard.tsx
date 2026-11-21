"use client";
import { useState } from "react";
import { cardById } from "@/features/learn/cards";
import { actions } from "@/features/game/store";
import Icon from "@/shared/ui/Icon";
import { useT } from "@/shared/lib/i18n";

/** A concept card. Front: one sentence. Back: example + one quiz question (XP for the right answer). */
export default function ConceptCard({ id, startFlipped = false }: { id: string; startFlipped?: boolean }) {
  const t = useT();
  const card = cardById(id);
  const [flipped, setFlipped] = useState(startFlipped);
  const [picked, setPicked] = useState<number | null>(null);
  if (!card) return null;
  return (
    <div className={`ccard ${flipped ? "flipped" : ""}`}>
      {!flipped ? (
        <button className="ccard-face" onClick={() => setFlipped(true)} aria-label={t(`${card.title}: turn the card`, `${t(card.title)}: Karte umdrehen`)}>
          <span className="ccard-top"><Icon name="card" size={28} /> <span className="xs">{t("Module", "Modul")} {card.world}</span></span>
          <strong className="ccard-title">{t(card.title)}</strong>
          <span className="ccard-front">{t(card.front)}</span>
          <span className="xs muted">{t("Turn the card ↻", "Karte umdrehen ↻")}</span>
        </button>
      ) : (
        <div className="ccard-face back">
          <span className="ccard-top"><strong>{t(card.title)}</strong><button className="btn btn-ghost btn-sm" onClick={() => setFlipped(false)}>{t("↻ Front", "↻ Vorderseite")}</button></span>
          <p className="small">{t(card.example)}</p>
          <p className="small"><strong>{t(card.quiz.q)}</strong></p>
          <div className="stack-sm">
            {card.quiz.options.map((o, i) => (
              <button key={o} className={`option ${picked !== null && i === card.quiz.answer ? "right" : picked === i ? "wrong" : ""}`} disabled={picked !== null}
                onClick={() => { setPicked(i); if (i === card.quiz.answer) actions.understood(`card:${id}`, 15); }}>
                {t(o)}
              </button>
            ))}
          </div>
          {picked !== null && <p className="xs">{picked === card.quiz.answer ? t("Right. +15 XP", "Richtig. +15 XP") : t("Not quite. The green one is right.", "Nicht ganz. Die grüne Antwort ist richtig.")}</p>}
        </div>
      )}
    </div>
  );
}
