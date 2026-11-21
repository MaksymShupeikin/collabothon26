"use client";
import { useState } from "react";
import { ALL_COMPANIES, COMPANIES, type Company } from "@/features/market/companies";
import { Wordmark } from "@/shared/ui/Wordmark";
import { dict, useT } from "@/shared/lib/i18n";

// Layout copied from the comdirect web customer area (references/01, 1_web-kundenbereich/*); text in English.
export const MAIN_NAV = ["Personal area", "Informer", "Current account", "Portfolio", "Trading"] as const;
export const SUB_NAV = ["Portfolio", "Order", "Account & card"] as const;
// Nav names stay English as ids; this is what the customer reads.
dict({ "Personal area": "Persönlicher Bereich", Informer: "Informer", "Current account": "Girokonto", Portfolio: "Depot", Trading: "Trading", Order: "Order", Transactions: "Umsätze" });

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
  const t = useT();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = searchCompanies(q, ALL_COMPANIES.filter((c) => COMPANIES.includes(c)));
  const pick = (c: Company) => { onSearch?.(c.sym, q); setQ(""); setOpen(false); (document.activeElement as HTMLElement | null)?.blur(); };
  return (
    <header className="wh">
      <div className="wh-top">
        <span className="wh-logo"><Wordmark /></span>
        {extraTop}
        <div className="wh-tools">
          <div className="wh-search" data-tour="header-search">
            <input type="search" placeholder={t("WKN, ISIN, name", "WKN, ISIN, Name")} aria-label={t("Search securities by WKN, ISIN or name", "Wertpapiere nach WKN, ISIN oder Name suchen")} value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
              onKeyDown={(e) => { if (e.key === "Enter" && results[0]) pick(results[0]); if (e.key === "Escape") e.currentTarget.blur(); }} />
            <SearchIcon />
            {open && q.trim() && (
              <ul className="wh-results" role="listbox">
                {results.length === 0 && <li className="wh-noresult small muted">{t("No security found. Try a name, WKN or ISIN.", "Kein Wertpapier gefunden. Versuchen Sie es mit Name, WKN oder ISIN.")}</li>}
                {results.map((c) => (
                  <li key={c.sym}>
                    <button role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); pick(c); }}>
                      <span className="wh-r-name"><Highlight text={c.name.toUpperCase()} q={q.toUpperCase()} /></span>
                      <span className={`type-tag ${c.type === "ETF" ? "etf" : ""}`}>{c.type === "ETF" ? "ETF" : t("Stock", "Aktie")}</span>
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
      <nav className="wh-nav" aria-label={t("Main", "Hauptmenü")}>
        {MAIN_NAV.map((m) => (
          <button key={m} className={current === m ? "on" : ""} onClick={() => onNav?.(m)}
            data-tour={m === "Personal area" ? "nav-home" : m === "Informer" ? "nav-finder" : undefined}>{t(m)}</button>
        ))}
      </nav>
      <nav className="wh-sub" aria-label={t("Personal area")}>
        {SUB_NAV.map((s) => (
          <button key={s} className={sub === s ? "on" : ""} onClick={() => onNav?.("Personal area", s)}
            data-tour={s === "Portfolio" ? "nav-depot" : s === "Account & card" ? "nav-umsaetze" : undefined}>
            {t(s === "Account & card" ? "Transactions" : s)}
          </button>
        ))}
      </nav>
    </header>
  );
}

export function SearchIcon() {
  return <svg className="wh-search-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M15 15l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}
