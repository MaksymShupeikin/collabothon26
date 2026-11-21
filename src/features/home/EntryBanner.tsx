"use client";
import Link from "next/link";
import { useGame } from "@/features/game/store";
import { useT } from "@/shared/lib/i18n";

/** One click into the sandbox: no sign-up, no forms (idea.md §4.1). */
export default function EntryBanner() {
  const save = useGame();
  const t = useT();
  return (
    <section className="entry" aria-label="comdirect edu">
      <div className="entry-text">
        <span className="entry-kicker">{t("New · Training sandbox", "Neu · Trainings-Sandbox")}</span>
        <h2>{t("Practice first, then invest", "Erst üben, dann investieren")}</h2>
        <p>{t("Your portfolio is still empty? Try it here first: the same comdirect screens, with play money and a coach at your side. No sign-up.", "Ihr Depot ist noch leer? Probieren Sie es hier zuerst aus: dieselben comdirect-Seiten, mit Spielgeld und einem Coach an Ihrer Seite. Ohne Anmeldung.")}</p>
      </div>
      <Link className="btn btn-dark btn-lg" href={save.persona ? "/" : "/start"}>{save.persona ? t("Continue practising ›", "Weiter üben ›") : t("Start practising ›", "Jetzt üben ›")}</Link>
      <svg className="entry-line" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden>
        <polyline points="0,96 40,90 80,98 120,80 160,86 200,70 240,76 280,58 320,66 360,48 400,54 440,38 480,44 520,26 560,30 600,14" />
      </svg>
    </section>
  );
}
