"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/simulator", label: "Trading" },
  { href: "/learn", label: "Learning" },
  { href: "/history", label: "History" },
];
const IN_PLATFORM = /^\/(simulator|tour|learn|history)(\/|$)/;

/** Platform tabs + trading actions, rendered inside the header. Hidden on the landing page. */
export default function PlatformNav() {
  const path = usePathname();
  if (!IN_PLATFORM.test(path)) return null;
  const trading = path === "/simulator" || path === "/tour";
  return (
    <>
      <nav className="hnav" aria-label="Platform">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-current={path === t.href || path.startsWith(t.href + "/") || (t.href === "/simulator" && path === "/tour") ? "page" : undefined}>{t.label}</Link>
        ))}
      </nav>
      {/* Trading-only actions; the simulator listens for the new-market event. */}
      {trading && (
        <div className="hactions">
          <button className="btn btn-sm hbtn" onClick={() => window.dispatchEvent(new Event("cd-new-market"))}>New market +</button>
          <Link className="btn btn-sm hbtn" href="/tour">Start tour →</Link>
        </div>
      )}
    </>
  );
}
