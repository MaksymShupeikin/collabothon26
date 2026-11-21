"use client";
import Link from "next/link";
import Icon from "@/components/Icon";
import LearningMaterial from "@/components/LearningMaterial";
import { RANKS, rankOf, useProgress } from "@/lib/progress";

const MODES = [
  { href: "/tour", icon: "compass", title: "Start the tour", text: "Learn the comdirect trading screen by using it — and place your first trade with play money.", cta: "Start tour" },
  { href: "/simulator", icon: "chart", title: "Market Simulator", text: "A living market driven by news. Most headlines are noise. Find the signal, beat your rivals.", cta: "Open market" },
  { href: "/history", icon: "hourglass", title: "History Mode", text: "Real headlines, hidden year. Predict what happened next and test your confidence.", cta: "Play history" },
];

export default function Home() {
  const { p } = useProgress();
  const rank = rankOf(p.xp);

  return (
    <main className="container stack">
      <section className="hero">
        <div>
          <h1>Learn to invest without risking a cent</h1>
          <p className="muted">The same screen as your comdirect depot, with play money. Learn every concept as a game, then test yourself in a market full of news, rumors and rivals.</p>
        </div>
        <div className="level">
          <svg className="level-ring" viewBox="0 0 120 120" role="img" aria-label={`Level ${rank.level} of ${RANKS.length}, ${Math.round(rank.progress * 100)}% to next level`}>
            <circle cx="60" cy="60" r="60" className="level-ring-bg" />
            <circle cx="60" cy="60" r="44" className="level-ring-track" />
            <circle cx="60" cy="60" r="44" className="level-ring-fill" transform="rotate(-90 60 60)" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - rank.progress * 100} />
            <text x="60" y="62" className="level-ring-num">{rank.level}</text>
          </svg>
          <div className="level-text">
            <strong>{rank.name}</strong>
            <span className="num">{p.xp}{rank.next ? ` / ${RANKS[rank.level][0]}` : ""} XP</span>
          </div>
        </div>
      </section>

      <section className="modes">
        {/* One primary action per screen: only the tour gets the yellow button. */}
        {MODES.map((m, i) => (
          <Link key={m.href} href={m.href} className="mode">
            <Icon name={m.icon} size={48} round />
            <h2>{m.title}</h2>
            <p className="small muted">{m.text}</p>
            <span className={i === 0 ? "btn btn-primary" : "mode-link"}>{m.cta} →</span>
          </Link>
        ))}
      </section>

      <LearningMaterial />
    </main>
  );
}
