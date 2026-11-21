"use client";
import Link from "next/link";
import { useGame } from "@/features/game/store";

/** One click into the sandbox: no sign-up, no forms (idea.md §4.1). */
export default function EntryBanner() {
  const save = useGame();
  return (
    <section className="entry" aria-label="comdirect edu">
      <div className="entry-text">
        <span className="entry-kicker">New · Training sandbox</span>
        <h2>Practice first, then invest</h2>
        <p>Your portfolio is still empty? Try it here first: the same comdirect screens, with play money and a coach at your side. No sign-up.</p>
      </div>
      <Link className="btn btn-dark btn-lg" href={save.persona ? "/" : "/start"}>{save.persona ? "Continue practising ›" : "Start practising ›"}</Link>
      <svg className="entry-line" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden>
        <polyline points="0,96 40,90 80,98 120,80 160,86 200,70 240,76 280,58 320,66 360,48 400,54 440,38 480,44 520,26 560,30 600,14" />
      </svg>
    </section>
  );
}
