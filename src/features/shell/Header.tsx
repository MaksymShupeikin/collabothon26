"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { actions, rankOf, useGame } from "@/features/game/store";
import { chapterById, simpleOnlyChapter } from "@/features/tour/chapters";
import { Wordmark } from "@/shared/ui/Wordmark";
import { USER } from "@/shared/lib/user";
import { useT } from "@/shared/lib/i18n";
import LangSwitch from "@/features/shell/LangSwitch";

/** Header of our own (🆕) pages, as on main: logo block + edu, signed-in user. The hub (/), History mode, the Investor Simulator and the trading area itself show no tabs. */
export default function Header() {
  const save = useGame();
  const path = usePathname();
  const rank = rankOf(save.xp);
  const t = useT();
  // On the simple trading area after "Simple view", the tab is the way back to ProTrader.
  const backToPro = path === "/pro" && save.simpleChosen && !simpleOnlyChapter(save.active ? chapterById(save.active) : undefined);
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo" aria-label={t("comdirect edu home", "comdirect edu Startseite")}>
          <span className="logo-mark"><Wordmark /></span>
          <span className="logo-edu">edu</span>
        </Link>
        <LangSwitch />
        {save.persona && (backToPro || !["/", "/history", "/invest", "/pro"].includes(path)) && (
          <nav className="hnav" aria-label="comdirect edu">
            {path === "/real-market" || save.proTrader || save.simpleChosen
              // Same as "Switch to ProTrader": /pro shows the ProTrader layout once save.proTrader is set.
              ? <Link href="/pro" onClick={() => actions.switchToProTrader()}>ProTrader</Link>
              : <Link href="/pro">{t("Trading area", "Handelsbereich")}</Link>}
          </nav>
        )}
        <div className="user" aria-label={t(`Your profile: ${USER.name}, level ${rank.level} ${rank.name}, ${save.xp} XP`, `Dein Profil: ${USER.name}, Level ${rank.level} ${t(rank.name)}, ${save.xp} XP`)}>
          <span className="user-text">
            <strong className="small">{USER.name}</strong>
            <span className="user-rank xs">{USER.email}</span>
          </span>
          <span className="user-orb" aria-hidden data-xp-target>
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
