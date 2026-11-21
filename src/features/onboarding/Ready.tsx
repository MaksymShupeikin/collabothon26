"use client";
import Link from "next/link";
import { num } from "@/shared/lib/format";
import { PERSONAS } from "@/features/game/personas";
import { rankOf, useGame } from "@/features/game/store";

/** "Ready for real?": the hand-off from the sandbox into the real comdirect depot. */
export default function Ready() {
  const save = useGame();
  const p = PERSONAS[save.persona ?? "starter"];
  const rank = rankOf(save.xp);
  const stars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  return (
    <main className="ready">
      <section className="ready-hero">
        <span className="entry-kicker">Learn → practise → act</span>
        <h1>Ready for real?</h1>
        <p>You’ve topped up, searched, ordered, read the news, survived a crash and watched others make the mistakes. Everything you did here works the same in your real comdirect depot.</p>
        <div className="ready-stats">
          <span><strong>{rank.name}</strong><span className="xs">rank</span></span>
          <span><strong className="num">{save.cards.length} / 12</strong><span className="xs">concept cards</span></span>
          <span><strong className="num">{stars} / 21</strong><span className="xs">mission stars</span></span>
        </div>
      </section>
      <section className="ready-steps container">
        <div className="card stack">
          <h2>Your next step</h2>
          <p>A savings plan of <strong className="num">{num(p.plan, 0)} € a month</strong> on a world ETF, like the one you set up in World 4.</p>
          <div className="row">
            <a className="btn btn-primary btn-lg" href="https://www.comdirect.de/" target="_blank" rel="noopener noreferrer">Open my real depot ›</a>
            <Link className="btn btn-outline btn-lg" href="/pro">More practice in free play</Link>
          </div>
          <p className="xs muted">Opens comdirect.de. Investing involves risk; past performance is no guide to the future. comdirect edu is a training sandbox, not advice.</p>
        </div>
      </section>
    </main>
  );
}
