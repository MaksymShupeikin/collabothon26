"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { rankOf, useGame } from "@/features/game/store";
import { Wordmark } from "@/shared/ui/Wordmark";
import { USER } from "@/shared/lib/user";

/** Header of our own (🆕) pages, as on main: logo block + edu, signed-in user. The hub (/) shows no tabs. */
export default function Header() {
  const save = useGame();
  const path = usePathname();
  const rank = rankOf(save.xp);
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo" aria-label="comdirect edu home">
          <span className="logo-mark"><Wordmark /></span>
          <span className="logo-edu">edu</span>
        </Link>
        {save.persona && save.proUnlocked && path !== "/" && (
          <nav className="hnav" aria-label="comdirect edu">
            <Link href="/pro">{save.proTrader ? "ProTrader" : "Trading area"}</Link>
          </nav>
        )}
        <div className="user" data-xp-target aria-label={`Your profile: ${USER.name}, level ${rank.level} ${rank.name}, ${save.xp} XP`}>
          <span className="user-text">
            <strong className="small">{USER.name}</strong>
            <span className="user-rank xs">{USER.email}</span>
          </span>
          <span className="user-orb" aria-hidden>
            <svg className="user-ring" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" className="user-ring-track" />
              <circle cx="26" cy="26" r="24" className="user-ring-fill" transform="rotate(-90 26 26)" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - rank.progress * 100} />
            </svg>
            <span className="user-avatar">{USER.initials}</span>
            <span className="user-level">{rank.level}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
