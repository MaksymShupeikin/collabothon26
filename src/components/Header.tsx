"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGame } from "@/lib/game/store";
import { Wordmark } from "./Wordmark";

// shortcut: mock signed-in user, as on main; read from the comdirect session once a backend exists.
const USER = { name: "Max Mustermann", initials: "MM" };

/** Header of our own (🆕) pages, as on main: logo block + edu, signed-in user. The hub (/) shows no tabs. */
export default function Header() {
  const save = useGame();
  const path = usePathname();
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo" aria-label="comdirect edu home">
          <span className="logo-mark"><Wordmark /></span>
          <span className="logo-edu">edu</span>
        </Link>
        {save.persona && path !== "/" && (
          <nav className="hnav" aria-label="comdirect edu">
            <Link href="/">Learning map</Link>
            <Link href="/cabinet">Web cabinet</Link>
            {save.proUnlocked && <Link href="/pro">{save.proTrader ? "ProTrader" : "Trading area"}</Link>}
          </nav>
        )}
        <div className="user" aria-label="Your profile">
          <strong className="small">{USER.name}</strong>
          <span className="user-avatar" aria-hidden>{USER.initials}</span>
        </div>
      </div>
    </header>
  );
}
