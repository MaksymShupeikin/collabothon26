"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { rankOf, useGame } from "@/lib/game/store";
import ProgressRing from "./ProgressRing";
import { Wordmark } from "./Wordmark";

/** Header of our own (🆕) pages: logo block + edu, rank ring and XP. */
export default function Header() {
  const save = useGame();
  const path = usePathname();
  const rank = rankOf(save.xp);
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo" aria-label="Back to comdirect">
          <span className="logo-mark"><Wordmark /></span>
          <span className="logo-edu">edu</span>
        </Link>
        {save.persona && (
          <nav className="hnav" aria-label="comdirect edu">
            <Link href="/learn" aria-current={path === "/learn" ? "page" : undefined}>Learning map</Link>
            <Link href="/cabinet">Web cabinet</Link>
            {save.proUnlocked && <Link href="/pro">Pro mode</Link>}
          </nav>
        )}
        {save.persona && (
          <div className="user" title={`${save.xp} XP`}>
            <ProgressRing value={rank.progress} size={36} label={`Rank ${rank.name}`} center={rank.level} />
            <span className="user-rank"><strong>{rank.name}</strong><span className="xs num">{save.xp} XP</span></span>
          </div>
        )}
      </div>
    </header>
  );
}
