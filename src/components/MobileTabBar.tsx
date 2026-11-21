"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Line icons, 24px, stroke = currentColor (yellow when active).
const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  learn: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2.5 9 2.5 12 0v-5" /></>,
  market: <path d="M3 17l5-6 4 3 6-8 3 3" />,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

const TABS = [
  { href: "/", label: "Home", icon: "home", match: /^\/$/ },
  { href: "/learn", label: "Learn", icon: "learn", match: /^\/learn(\/|$)/ },
  { href: "/simulator", label: "Market", icon: "market", match: /^\/(simulator|tour)(\/|$)/ },
  { href: "/history", label: "History", icon: "history", match: /^\/history(\/|$)/ },
];

/** Bottom tab bar on phones (mockup 03). Hidden on wider screens by CSS. */
export default function MobileTabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.match.test(path) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[t.icon]}</svg>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
