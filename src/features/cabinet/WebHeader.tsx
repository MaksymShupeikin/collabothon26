"use client";
import { useState } from "react";
import { ALL_COMPANIES, COMPANIES, type Company } from "@/features/market/companies";
import { Wordmark } from "@/shared/ui/Wordmark";

// Layout copied from the comdirect web customer area (references/01, 1_web-kundenbereich/*); text in English.
export const MAIN_NAV = ["Personal area", "Informer", "Current account", "Investing", "Depot", "Trading", "Loans", "Help & service"] as const;
export const SUB_NAV = ["Depot", "Order", "Account & card", "Investing", "Musterdepot", "PostBox", "Administration"] as const;

export function searchCompanies(q: string, list: Company[] = COMPANIES) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return list.filter((c) => [c.name, c.short, c.wkn, c.isin, c.sym].some((f) => f.toLowerCase().includes(s)));
}

export function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
  if (i < 0 || !q.trim()) return <>{text}</>;
  const n = q.trim().length;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + n)}</mark>{text.slice(i + n)}</>;
}

export default function WebHeader({ onSearch, onNav, current, sub, logout, extraTop }: {
  onSearch?: (sym: string, q: string) => void;
  onNav?: (main: string, sub?: string) => void;
  current?: string;
  sub?: string;
  logout: React.ReactNode;
  extraTop?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = searchCompanies(q, ALL_COMPANIES.filter((c) => COMPANIES.includes(c)));
  const pick = (c: Company) => { onSearch?.(c.sym, q); setQ(""); setOpen(false); (document.activeElement as HTMLElement | null)?.blur(); };
  return (
    <header className="wh">
      <div className="wh-top">
        <span className="wh-logo"><Wordmark /></span>
        <div className="wh-tools">
          {extraTop}
          <span className="wh-link">Musterdepot</span>
          <div className="wh-search" data-tour="header-search">
            <input type="search" placeholder="WKN, ISIN, name" aria-label="Search securities by WKN, ISIN or name" value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
              onKeyDown={(e) => { if (e.key === "Enter" && results[0]) pick(results[0]); if (e.key === "Escape") e.currentTarget.blur(); }} />
            <SearchIcon />
            {open && q.trim() && (
              <ul className="wh-results" role="listbox">
                {results.length === 0 && <li className="wh-noresult small muted">No security found. Try a name, WKN or ISIN.</li>}
                {results.map((c) => (
                  <li key={c.sym}>
                    <button role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); pick(c); }}>
                      <span className="wh-r-name"><Highlight text={c.name.toUpperCase()} q={q.toUpperCase()} /></span>
                      <span className={`type-tag ${c.type === "ETF" ? "etf" : ""}`}>{c.type === "ETF" ? "ETF" : "Stock"}</span>
                      <span className="num xs">{c.wkn}</span>
                      <span aria-hidden>›</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {logout}
        </div>
      </div>
      <nav className="wh-nav" aria-label="Main">
        {MAIN_NAV.map((m) => (
          <button key={m} className={current === m ? "on" : ""} onClick={() => onNav?.(m)}
            data-tour={m === "Personal area" ? "nav-home" : m === "Informer" ? "nav-finder" : undefined}>{m}</button>
        ))}
      </nav>
      <nav className="wh-sub" aria-label="Personal area">
        {SUB_NAV.map((s) => (
          <button key={s} className={sub === s ? "on" : ""} onClick={() => onNav?.("Personal area", s)}
            data-tour={s === "Depot" ? "nav-depot" : s === "Account & card" ? "nav-umsaetze" : undefined}>
            {s === "Account & card" ? "Transactions" : s}{!["Musterdepot", "Order", "Depot", "Account & card"].includes(s) && <span className="chev" aria-hidden>⌄</span>}
          </button>
        ))}
      </nav>
    </header>
  );
}

export function SearchIcon() {
  return <svg className="wh-search-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M15 15l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}
