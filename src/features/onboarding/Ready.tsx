"use client";
import Link from "next/link";
import { num } from "@/shared/lib/format";
import { PERSONAS } from "@/features/game/personas";
import { rankOf, useGame } from "@/features/game/store";
import { useT } from "@/shared/lib/i18n";

/** "Ready for real?": the hand-off from the sandbox into the real comdirect portfolio. */
export default function Ready() {
  const save = useGame();
  const t = useT();
  const p = PERSONAS[save.persona ?? "starter"];
  const rank = rankOf(save.xp);
  const stars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  return (
    <main className="ready">
      <section className="ready-hero">
        <span className="entry-kicker">{t("Learn → practise → act", "Lernen → üben → handeln")}</span>
        <h1>{t("Ready for real?", "Bereit für echt?")}</h1>
        <p>{t("You’ve topped up, searched, ordered, read the news, survived a crash and watched others make the mistakes. Everything you did here works the same in your real comdirect portfolio.", "Du hast Geld überwiesen, Aktien gesucht, Orders erteilt, News gelesen, einen Crash überstanden und anderen bei ihren Fehlern zugesehen. Alles, was du hier gemacht hast, funktioniert genauso in deinem echten comdirect Depot.")}</p>
        <div className="ready-stats">
          <span><strong>{t(rank.name)}</strong><span className="xs">{t("rank", "Rang")}</span></span>
          <span><strong className="num">{save.cards.length} / 12</strong><span className="xs">{t("concept cards", "Wissenskarten")}</span></span>
          <span><strong className="num">{stars} / 21</strong><span className="xs">{t("mission stars", "Missionssterne")}</span></span>
        </div>
      </section>
      <section className="ready-steps container">
        <div className="card stack">
          <h2>{t("Your next step", "Dein nächster Schritt")}</h2>
          <p>{t("A savings plan of", "Ein Sparplan über")} <strong className="num">{num(p.plan, 0)} {t("€ a month", "€ im Monat")}</strong> {t("on a world ETF, like the one you set up in Module 4.", "auf einen Welt-ETF, wie der, den du in Modul 4 eingerichtet hast.")}</p>
          <div className="row">
            <a className="btn btn-primary btn-lg" href="https://www.comdirect.de/" target="_blank" rel="noopener noreferrer">{t("Open my real portfolio ›", "Mein echtes Depot öffnen ›")}</a>
            <Link className="btn btn-outline btn-lg" href="/trade">{t("More practice in free play", "Weiter üben im freien Spiel")}</Link>
          </div>
          <p className="xs muted">{t("Opens comdirect.de. Investing involves risk; past performance is no guide to the future. comdirect edu is a training sandbox, not advice.", "Öffnet comdirect.de. Geldanlage ist mit Risiken verbunden; vergangene Wertentwicklungen sind kein verlässlicher Indikator für die Zukunft. comdirect edu ist eine Trainings-Sandbox, keine Anlageberatung.")}</p>
        </div>
      </section>
    </main>
  );
}
