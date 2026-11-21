"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COMPANIES, companyOf } from "@/features/market/companies";
import { cls, dateDE, eur, EUR, num, pct, qtyFmt, signed } from "@/shared/lib/format";
import { chapterById } from "@/features/tour/chapters";
import { USER } from "@/shared/lib/user";
import { actions, txText, useGame, type Save } from "@/features/game/store";
import { dict, useT } from "@/shared/lib/i18n";
import { bump, setUi, useUi } from "@/features/game/ui";
import { ask, bid, cancelOrder, costBasis, dateOf, depotValue, fee, priceAt, round2, type OrderType, type Side, type Validity } from "@/features/market/engine";
import { MAIN } from "@/features/market/scenarios";
import { rng } from "@/shared/lib/rng";
import PriceLine from "@/shared/charts/PriceLine";
import SandboxBar from "@/features/shell/SandboxBar";
import TourRunner from "@/features/tour/TourRunner";
import WebHeader, { Highlight, SearchIcon, searchCompanies } from "@/features/cabinet/WebHeader";

type View = "home" | "transfer" | "finder" | "stock" | "order" | "depot" | "umsaetze";
const U = MAIN;
const TIME = "10:15:06";
const IBAN = { giro: "DE12 2004 1111 0123 4567 00", verrechnung: "DE65 2004 1111 0123 4567 40" };
const DEPOT_NO = "1234567";
const EXCHANGES = [["Xetra", 0], ["Tradegate", 0.0002], ["LS Exchange", 0.0003], ["gettex", -0.0001], ["Frankfurt", 0.0004]] as const;

// Regions stay English as filter values (sectors: companies.ts); this is what the customer reads.
dict({
  Germany: "Deutschland", USA: "USA",
  "1D": "1T", "1W": "1W", "1M": "1M", "6M": "6M", "1Y": "1J", "5Y": "5J",
  Cards: "Kacheln", Table: "Tabelle", Notes: "Notizen", "Tax simulation": "Steuersimulation",
});

const today = (s: Save) => dateOf(U, s.sim.day);
const price = (s: Save, sym: string, d = s.sim.day) => priceAt(U, sym, d);
const reserved = (s: Save) => round2(s.sim.acct.orders.filter((o) => o.side === "buy").reduce((v, o) => v + o.qty * o.limit + fee(o.qty * o.limit), 0));

/** Each chapter starts on its own screen: remount the cabinet when the active chapter changes. */
export default function Cabinet() {
  const save = useGame();
  const ch = save.active ? chapterById(save.active) : undefined;
  const start = ch?.surface === "cabinet" ? ch.start : undefined;
  return <CabinetInner key={save.active ?? "free"} initial={start as { view: View; sym?: string } | undefined} />;
}

function CabinetInner({ initial }: { initial?: { view: View; sym?: string } }) {
  const t = useT();
  const save = useGame();
  const [view, setView] = useState<View>(initial?.view ?? "home");
  const [sym, setSym] = useState(initial?.sym ?? "DTE");

  useEffect(() => { setUi({ surface: "cabinet", view, sym }); }, [view, sym]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  const go = (v: View, s?: string) => { if (s) setSym(s); setView(v); };
  const nav = (main: string, sub?: string) => {
    if (sub === "Portfolio" || (main === "Portfolio" && !sub)) return go("depot");
    if (sub === "Order" || main === "Trading") return go("order");
    if (sub === "Account & card" || main === "Current account") return go("umsaetze");
    if (main === "Informer") return go("finder");
    go("home");
  };
  const current = view === "finder" ? "Informer" : view === "depot" ? "Portfolio" : view === "order" ? "Trading" : view === "umsaetze" ? "Current account" : "Personal area";
  const sub = view === "depot" ? "Portfolio" : view === "order" ? "Order" : view === "umsaetze" ? "Account & card" : undefined;

  return (
    <div className="web">
      <SandboxBar clock={`${dateDE(today(save))} · ${TIME}`} />
      <WebHeader current={current} sub={sub} onNav={nav} onSearch={(s) => go("stock", s)}
        logout={<Link className="btn btn-primary btn-sm" href="/">{t("Exit ›", "Beenden ›")}</Link>} />
      <main className="web-main">
        {view === "home" && <Home save={save} go={go} />}
        {view === "transfer" && <Transfer save={save} go={go} />}
        {view === "finder" && <Finder save={save} go={go} />}
        {view === "stock" && <Stock save={save} sym={sym} go={go} />}
        {view === "order" && <OrderForm key={sym} save={save} sym={sym} go={go} setSym={setSym} />}
        {view === "depot" && <Depot save={save} go={go} />}
        {view === "umsaetze" && <Transactions save={save} />}
      </main>
      <TourRunner surface="cabinet" />
    </div>
  );
}

function PageHead({ title, owner }: { title: string; owner?: boolean }) {
  const t = useT();
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <div className="page-owner">
        <span className="page-icons" aria-hidden>ⓘ ⎙ ✉</span>
        {owner && <span className="small">{t("Holder", "Inhaber")}: <strong>{USER.name}</strong></span>}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────

function Home({ save, go }: { save: Save; go: (v: View, s?: string) => void }) {
  const t = useT();
  const a = save.sim.acct;
  const dep = depotValue(save.sim);
  const avail = round2(a.cash - reserved(save));
  const total = round2(save.giro + a.cash + dep);
  const [addOpen, setAddOpen] = useState(false);
  const lastTransfer = save.tx.find((t) => t.account === "giro" && t.text.startsWith("Transfer"));
  return (
    <div className="web-page">
      <PageHead title={`${t("Good morning", "Guten Morgen")}, ${t(USER.salutation)}.`} owner />
      <section className="acc">
        <div className="acc-title">comdirect</div>
        <table className="acc-table">
          <thead><tr><th>{t("Account", "Konto")}</th><th>{t("Actions", "Aktionen")}</th><th>{t("IBAN / number", "IBAN / Nummer")}</th><th className="r">{t("Available", "Verfügbar")}</th><th className="r">{t("Balance", "Saldo")}</th></tr></thead>
          <tbody>
            <tr data-tour="acc-giro">
              <td><button className="link" onClick={() => go("umsaetze")}>{t("Current account", "Girokonto")}</button></td>
              <td><button className="pill" data-tour="btn-transfer" onClick={() => go("transfer")}>{t("Transfer ›", "Überweisung ›")}</button></td>
              <td className="num muted">{IBAN.giro}</td>
              <td className="r num">{eur(save.giro)}</td>
              <td className="r num bal">{eur(save.giro)}</td>
            </tr>
            <tr data-tour="acc-depot">
              <td><button className="link" onClick={() => go("depot")}>{t("Portfolio", "Depot")}</button> <span className="info" title={t("Your securities", "Ihre Wertpapiere")}>ⓘ</span></td>
              <td><button className="pill" onClick={() => go("order")}>{t("Buy/Sell ›", "Kauf/Verkauf ›")}</button></td>
              <td className="num muted">{DEPOT_NO}</td>
              <td className="r num" />
              <td className="r num bal">{eur(dep)}</td>
            </tr>
            <tr data-tour="acc-verrechnung">
              <td><button className="link" onClick={() => go("umsaetze")}>{t("Trading account", "Verrechnungskonto")}</button> <span className="info" title={t("Settlement account: your cash for trading", "Verrechnungskonto: Ihr Guthaben zum Handeln")}>ⓘ</span></td>
              <td />
              <td className="num muted">{IBAN.verrechnung}</td>
              <td className="r num">{eur(avail)}</td>
              <td className="r num bal">{eur(a.cash)}</td>
            </tr>
            <tr className="acc-total" data-tour="acc-total">
              <td><strong>{t("Total", "Gesamt")}</strong></td><td /><td />
              <td className="r num">{eur(save.giro + avail)}</td>
              <td className="r num bal"><strong>{eur(total)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div className="row acc-actions">
          <button className="pill pill-lg" onClick={() => go("umsaetze")}>{t("All transactions ›", "Alle Umsätze ›")}</button>
          {save.proUnlocked
            ? <Link className="pill pill-lg pill-yellow" href="/pro">ProTrader ›</Link>
            : <span className="pill pill-lg pill-yellow" aria-disabled="true" title={t("Unlocks after the Module 1 mission", "Wird nach der Mission von Modul 1 freigeschaltet")}>🔒 ProTrader</span>}
          <button className="sandbox-btn" data-tour="add-play-money" onClick={() => setAddOpen(true)}><span className="sandbox-tag">Sandbox</span> {t("Add play money", "Spielgeld einzahlen")}</button>
        </div>
      </section>
      <section className="recent">
        <div className="acc-title">{t("Recent activity", "Letzte Aktivitäten")}</div>
        <dl>
          <dt>{t("Login", "Anmeldung")}</dt><dd>{dateDE(today(save))} {t("at", "um")} {TIME.slice(0, 5)}{t("", " Uhr")}</dd>
          <dt>{t("Transfer", "Überweisung")}</dt><dd>{lastTransfer ? `${dateDE(dateOf(U, lastTransfer.day))} · ${eur(Math.abs(lastTransfer.amount))} ${t("to trading account", "auf Verrechnungskonto")}` : t("None yet", "Noch keine")}</dd>
          <dt>{t("Orders", "Orders")}</dt><dd>{save.sim.acct.trades.length ? `${save.sim.acct.trades.length} ${t("executed", "ausgeführt")}` : t("None yet", "Noch keine")}{save.sim.acct.orders.length ? ` · ${save.sim.acct.orders.length} ${t("open", "offen")}` : ""}</dd>
        </dl>
      </section>
      {addOpen && <AddPlayMoney onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddPlayMoney({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [v, setV] = useState("100");
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("Add play money", "Spielgeld einzahlen")} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <span className="sandbox-tag" style={{ alignSelf: "flex-start" }}>{t("Sandbox control · not a comdirect function", "Sandbox-Funktion · keine comdirect Funktion")}</span>
        <h2>{t("Add play money", "Spielgeld einzahlen")}</h2>
        <p className="small muted">{t("Goes to your current account. It’s play money and never counts as profit.", "Geht auf dein Girokonto. Es ist Spielgeld und zählt nie als Gewinn.")}</p>
        <div className="row">{[50, 100, 500, 1000].map((x) => <button key={x} className="btn btn-outline btn-sm" onClick={() => setV(String(x))}>+{num(x, 0)} €</button>)}</div>
        <label className="field">{t("Amount (EUR)", "Betrag (EUR)")}<input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} /></label>
        <div className="row">
          <button className="btn btn-primary" onClick={() => { actions.addPlayMoney(parseDE(v)); onClose(); }}>{t("Add", "Einzahlen")}</button>
          <button className="btn btn-ghost" onClick={onClose}>{t("Cancel", "Abbrechen")}</button>
        </div>
      </div>
    </div>
  );
}

export const parseDE = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;

// ── Transfer + photoTAN ───────────────────────────────────────────────────

function Transfer({ save, go }: { save: Save; go: (v: View) => void }) {
  const t = useT();
  const [toTrading, setToTrading] = useState(true);
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState(() => t("Top-up", "Aufladung"));
  const [err, setErr] = useState<string | null>(null);
  const [tan, setTan] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const val = parseDE(amount);
  useEffect(() => { setUi({ trAmount: val, tanOpen: tan }); }, [val, tan]);
  useEffect(() => () => setUi({ tanOpen: false, trAmount: 0 }), []);
  const fromBal = toTrading ? save.giro : save.sim.acct.cash;

  function next() {
    if (!(val > 0)) return setErr(t("Enter an amount above 0,00 €."));
    if (val > fromBal + 1e-9) return setErr(t(`Not enough money: ${eur(fromBal)} available.`, `Nicht genug Geld: ${eur(fromBal)} verfügbar.`));
    setErr(null); setTan(true);
  }

  if (done !== null) return (
    <div className="web-page">
      <PageHead title={t("Transfer", "Überweisung")} />
      <div className="success-box" role="status">
        <strong>{t("✓ Transfer completed", "✓ Überweisung ausgeführt")}</strong>
        <p className="small">{eur(done)} {toTrading ? t("moved to your trading account.", "wurden auf Ihr Verrechnungskonto übertragen.") : t("moved back to your current account.", "wurden zurück auf Ihr Girokonto übertragen.")}</p>
        <div className="row">
          <button className="pill pill-lg" onClick={() => go("umsaetze")}>{t("Show transactions ›", "Umsätze anzeigen ›")}</button>
          <button className="pill pill-lg" onClick={() => go("home")}>{t("Overview ›", "Übersicht ›")}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="web-page">
      <PageHead title={t("Transfer", "Überweisung")} />
      <p className="small muted legend">{t("Between your own accounts", "Zwischen Ihren eigenen Konten")}</p>
      <div className="form-card">
        <div className="form-row" data-tour="tr-to">
          <span className="form-label">{t("From", "Von")}</span>
          <div className="acct-box"><strong>{toTrading ? t("Current account", "Girokonto") : t("Trading account", "Verrechnungskonto")}</strong><span className="xs muted num">{toTrading ? IBAN.giro : IBAN.verrechnung}</span><span className="xs num">{t("Balance", "Saldo")} {eur(fromBal)}</span></div>
          <span className="form-label">{t("To", "An")}</span>
          <div className="select-like">
            <select value={toTrading ? "v" : "g"} onChange={(e) => setToTrading(e.target.value === "v")} aria-label={t("To account", "Empfängerkonto")}>
              <option value="v">{t("Trading account", "Verrechnungskonto")}</option>
              <option value="g">{t("Current account", "Girokonto")}</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <label className="field float" data-tour="tr-amount"><span>{t("Amount", "Betrag")}</span>
            <span className="addon-wrap"><input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /><span className="addon">EUR</span></span>
          </label>
          <label className="field float"><span>{t("Reference", "Verwendungszweck")}</span><input value={ref} onChange={(e) => setRef(e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label className="field float"><span>{t("Execution", "Ausführung")}</span><input value={`${t("Today", "Heute")}, ${dateDE(today(save))}`} readOnly /></label>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="row form-actions">
          <button className="pill pill-lg" onClick={() => go("home")}>{t("Cancel", "Abbrechen")}</button>
          <button className="pill pill-lg pill-yellow" data-tour="tr-submit" onClick={next}>{t("Next ›", "Weiter ›")}</button>
        </div>
      </div>
      {tan && <PhotoTan amount={val} toTrading={toTrading} onCancel={() => setTan(false)}
        onOk={() => { const e = actions.transfer(val, toTrading); if (e) { setErr(t(e)); setTan(false); return; } bump("transferDone"); setTan(false); setDone(val); }} />}
    </div>
  );
}

function PhotoTan({ amount, toTrading, onOk, onCancel }: { amount: number; toTrading: boolean; onOk: () => void; onCancel: () => void }) {
  const code = useMemo(() => String(100000 + Math.floor(rng(Math.round(amount * 100) + 7)() * 899999)), [amount]);
  const cells = useMemo(() => { const r = rng(Number(code)); return Array.from({ length: 144 }, () => Math.floor(r() * 4)); }, [code]);
  const t = useT();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const fills = ["var(--color-ink)", "var(--color-accent)", "var(--color-bg-dark)", "var(--color-white)"];
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("Confirm with photoTAN", "Mit photoTAN bestätigen")}>
      <div className="modal modal-mid" data-tour="tan-box">
        <h2>{t("Confirm with photoTAN", "Mit photoTAN bestätigen")}</h2>
        <p className="small muted">{t("Transfer of", "Überweisung von")} <strong>{eur(amount)}</strong> {t("to your", "auf Ihr")} {toTrading ? t("Trading account", "Verrechnungskonto") : t("Current account", "Girokonto")}.</p>
        <div className="tan">
          <div className="tan-mosaic" aria-label={t("photoTAN graphic", "photoTAN-Grafik")}>
            <svg viewBox="0 0 12 12" width="168" height="168" shapeRendering="crispEdges">
              {cells.map((c, i) => <rect key={i} x={i % 12} y={Math.floor(i / 12)} width="1" height="1" fill={fills[c]} />)}
            </svg>
            <span className="xs muted">{t("Scan with the photoTAN app", "Mit der photoTAN-App scannen")}</span>
          </div>
          <div className="phone" aria-label={t("Simulated photoTAN app", "Simulierte photoTAN-App")}>
            <div className="phone-notch" />
            <span className="xs">{t("photoTAN · simulated", "photoTAN · simuliert")}</span>
            <span className="xs muted">{t("Transfer", "Überweisung")} {eur(amount)}</span>
            <span className="phone-tan num">{code.slice(0, 3)} {code.slice(3)}</span>
            <span className="xs muted">{t("Your TAN", "Ihre TAN")}</span>
          </div>
        </div>
        <label className="field float"><span>TAN</span>
          <input inputMode="numeric" autoFocus value={v} onChange={(e) => { setV(e.target.value); setErr(false); }} placeholder={t("6 digits", "6 Ziffern")}
            onKeyDown={(e) => { if (e.key === "Enter") { if (v.replace(/\s/g, "") === code) onOk(); else setErr(true); } }} />
        </label>
        {err && <p className="error" role="alert">{t("That TAN doesn’t match. Copy the 6 digits from the phone.", "Die TAN stimmt nicht. Übernehmen Sie die 6 Ziffern vom Handy.")}</p>}
        <div className="row">
          <button className="pill pill-lg" onClick={onCancel}>{t("Cancel", "Abbrechen")}</button>
          <button className="pill pill-lg pill-yellow" onClick={() => (v.replace(/\s/g, "") === code ? onOk() : setErr(true))}>{t("Confirm transfer ›", "Überweisung bestätigen ›")}</button>
        </div>
      </div>
    </div>
  );
}

// ── Aktien-Finder ─────────────────────────────────────────────────────────

const REGION: Record<string, string> = { DTE: "Germany", SAP: "Germany", ADS: "Germany", SIE: "Germany", ALV: "Germany", MBG: "Germany", VOW3: "Germany", AAPL: "USA", MSFT: "USA", NVDA: "USA", TSLA: "USA" };

function Finder({ save, go }: { save: Save; go: (v: View, s?: string) => void }) {
  const t = useT();
  const [region, setRegion] = useState("");
  const [sector, setSector] = useState("");
  const [pre, setPre] = useState("de");
  const stocks = COMPANIES.filter((c) => c.type === "Aktie");
  const sectors = [...new Set(stocks.map((c) => c.sector))].sort();
  const hits = stocks.filter((c) => (!region || REGION[c.sym] === region) && (!sector || c.sector === sector));
  useEffect(() => { setUi({ finderSector: sector }); }, [sector]);
  return (
    <div className="web-page">
      <PageHead title={t("The Aktien-Finder: find stocks by criteria", "Der Aktien-Finder: Aktien nach Kriterien finden")} />
      <p className="lead">{t("The Aktien-Finder helps you discover stocks that fit your strategy and your portfolio.", "Mit dem Aktien-Finder entdecken Sie Aktien, die zu Ihrer Strategie und Ihrem Depot passen.")}</p>
      <div className="finder">
        <div className="finder-count"><span>{t("Number of hits", "Anzahl Treffer")}: <strong>{hits.length}</strong></span><a className="pill pill-yellow" href="#finder-results">{t("Show", "Anzeigen")}</a></div>
        <div className="finder-grid">
          <span className="form-label">{t("Preselection", "Vorauswahl")}</span>
          <div className="radios" role="radiogroup" aria-label={t("Preselection", "Vorauswahl")}>
            {[["de", t("Tradable on German exchanges", "An deutschen Börsen handelbar")], ["plan", t("Savings plan", "Sparplan")], ["live", t("Tradable in LiveTrading", "Im LiveTrading handelbar")], ["none", t("No preselection", "Keine Vorauswahl")]].map(([k, l]) => (
              <label key={k} className="radio"><input type="radio" name="pre" checked={pre === k} onChange={() => setPre(k)} /> {l}</label>
            ))}
          </div>
          <span className="form-label">{t("Country or index", "Land oder Index")}</span>
          <div className="select-like"><select value={region} onChange={(e) => setRegion(e.target.value)} aria-label={t("Country or index", "Land oder Index")}><option value="">{t("No selection", "Keine Auswahl")}</option><option value="Germany">{t("Germany")}</option><option value="USA">{t("USA")}</option></select></div>
          <span className="form-label">{t("Sector", "Branche")}</span>
          <div className="select-like" data-tour="finder-sector"><select value={sector} onChange={(e) => setSector(e.target.value)} aria-label={t("Sector", "Branche")}><option value="">--</option>{sectors.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select></div>
        </div>
      </div>
      <table className="wtable" id="finder-results" data-tour="finder-results">
        <thead><tr><th>{t("Name", "Name")}</th><th>WKN</th><th>{t("Sector", "Branche")}</th><th className="r">{t("Price", "Kurs")}</th><th className="r">{t("Diff. prev. day", "Diff. Vortag")}</th></tr></thead>
        <tbody>
          {hits.map((c) => {
            const p = price(save, c.sym), ch = (p / price(save, c.sym, save.sim.day - 1) - 1) * 100;
            return (
              <tr key={c.sym} className="clickable" onClick={() => go("stock", c.sym)}>
                <td><button className="link" onClick={() => go("stock", c.sym)}>{c.name}</button></td>
                <td className="num">{c.wkn}</td><td>{t(c.sector)}</td><td className="r num">{EUR(p)}</td><td className={`r num ${cls(ch)}`}>{pct(ch)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Stock page ────────────────────────────────────────────────────────────

const RANGES = [["1D", 1], ["1W", 5], ["1M", 21], ["6M", 126], ["1Y", 252], ["5Y", 1260]] as const;

function intraday(sym: string, day: number, open: number, close: number) {
  const r = rng(day * 131 + sym.charCodeAt(0) * 7);
  const base = Date.UTC(2026, 0, 1) / 1000 + day * 86400;
  const pts: { time: number; value: number }[] = [];
  let noise = 0;
  for (let i = 0; i <= 27; i++) { // 08:00 → 10:15, every 5 minutes
    noise = 0.6 * noise + (r() - 0.5) * 0.004;
    const f = i / 27;
    pts.push({ time: base + 8 * 3600 + i * 300, value: round2((open + (close - open) * f) * (1 + noise * Math.sin(Math.PI * f))) });
  }
  return pts;
}

function Stock({ save, sym, go }: { save: Save; sym: string; go: (v: View, s?: string) => void }) {
  const t = useT();
  const c = companyOf(sym);
  const [range, setRange] = useState<string>("1M");
  useEffect(() => { setUi({ chartRange: range }); }, [range]);
  useEffect(() => () => setUi({ chartRange: undefined }), []);
  const d = save.sim.day;
  const p = price(save, sym), prev = price(save, sym, d - 1);
  const chg = p - prev;
  const n = RANGES.find(([k]) => k === range)![1];
  const open = round2(prev * (1 + (rng(d * 17 + 3)() - 0.5) * 0.004));
  const points = useMemo(() => {
    if (n === 1) return intraday(sym, d, open, p);
    return Array.from({ length: n + 1 }, (_, i) => d - n + i).map((x) => ({ time: dateOf(U, x).toISOString().slice(0, 10), value: price(save, sym, x) }));
  }, [n, sym, d, open, p, save]);
  const year = Array.from({ length: 253 }, (_, i) => price(save, sym, d - 252 + i));
  const dayHi = Math.max(open, p) * 1.003, dayLo = Math.min(open, p) * 0.997;
  const vol = Math.round(800000 + rng(d * 7 + sym.length)() * 2400000);
  const news = U.news.filter((x) => x.day <= d && x.day > d - 40).slice(-5).reverse();
  const own = save.sim.acct.holdings[sym];
  return (
    <div className="web-page">
      <button className="link back" onClick={() => go("home")}>{t("‹ Overview", "‹ Übersicht")}</button>
      <div className="stock-head">
        <div>
          <h1 className="stock-name">{c.name.toUpperCase()}</h1>
          <div className="tags" data-tour="stock-ids"><span className="tag">{c.type === "ETF" ? "ETF" : t("Stock", "Aktie")}</span><span className="tag">WKN: {c.wkn}</span><span className="tag">ISIN: {c.isin}</span></div>
        </div>
        <div className="stock-actions">
          <button className="pill pill-lg pill-yellow" data-tour="stock-buy" onClick={() => go("order", sym)}>{t("Buy", "Kaufen")}</button>
          <button className="pill pill-lg" onClick={() => go("order", sym)} disabled={!own}>{t("Sell", "Verkaufen")}</button>
        </div>
      </div>
      <div className="stock-grid">
        <section className="stock-main">
          <div className="quote" data-tour="stock-price">
            <span className="quote-price num">{num(p, p < 10 ? 3 : 2)} <small>EUR</small></span>
            <span className="xs muted num">{dateDE(today(save))} · {TIME} · <u>Xetra</u></span>
          </div>
          <div className={`quote-chg ${cls(chg)}`} data-tour="stock-change">
            <Arrow up={chg >= 0} /> <span className="num">{pct((p / prev - 1) * 100)} | {signed(chg)} EUR</span> <span className="xs muted">{t("vs. previous day", "zum Vortag")}</span>
          </div>
          <div className="chart-box">
            <PriceLine points={points} intraday={n === 1} />
          </div>
          <div className="range-tabs" role="tablist" aria-label={t("Chart period", "Chart-Zeitraum")} data-tour="stock-chart-tabs">
            {RANGES.map(([k]) => <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)}>{t(k)}</button>)}
          </div>
        </section>
        <aside className="stock-side">
          <section className="keys" data-tour="stock-keys">
            <h3>{t("Key numbers", "Kennzahlen")}</h3>
            <dl>
              <dt>{t("Previous close", "Vortagesschluss")}</dt><dd className="num">{EUR(prev)}</dd>
              <dt>{t("Open", "Eröffnung")}</dt><dd className="num">{EUR(open)}</dd>
              <dt>{t("Day high / low", "Tageshoch / -tief")}</dt><dd className="num">{num(dayHi)} / {num(dayLo)}</dd>
              <dt>{t("52-week high", "52-Wochen-Hoch")}</dt><dd className="num">{EUR(Math.max(...year))}</dd>
              <dt>{t("52-week low", "52-Wochen-Tief")}</dt><dd className="num">{EUR(Math.min(...year))}</dd>
              <dt>{t("Volume (pcs.)", "Volumen (Stk.)")}</dt><dd className="num">{vol.toLocaleString("de-DE")}</dd>
              <dt>{t("Bid / ask", "Geld / Brief")}</dt><dd className="num">{num(bid(p))} / {num(ask(p))}</dd>
            </dl>
          </section>
          {own && <p className="small own">{t("You own", "Im Bestand")} <strong>{qtyFmt(own.qty)}</strong> · {t("bought for", "gekauft für")} {eur(own.cost)}</p>}
        </aside>
      </div>
      <section className="news-block" data-tour="stock-news">
        <div className="acc-title">{t("News", "News")} <span className="sim-label">{t("Simulated", "Simuliert")}</span></div>
        {news.length === 0 && <p className="small muted pad">{t("No news in the last weeks.", "Keine News in den letzten Wochen.")}</p>}
        {news.map((x) => (
          <div key={x.id} className="news-row"><span className="num xs muted">{dateDE(dateOf(U, x.day))} {x.time.slice(0, 5)}</span><span className="small">{t(x.headline)}</span></div>
        ))}
      </section>
    </div>
  );
}

const Arrow = ({ up }: { up: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d={up ? "M12 17V7M7.5 11.5L12 7l4.5 4.5" : "M12 7v10M7.5 12.5L12 17l4.5-4.5"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// ── Order form ────────────────────────────────────────────────────────────

function OrderForm({ save, sym: initial, go, setSym }: { save: Save; sym: string; go: (v: View, s?: string) => void; setSym: (s: string) => void }) {
  const t = useT();
  const ui = useUi();
  const [sym, setLocal] = useState<string | null>(initial);
  const [q, setQ] = useState("");
  const [side, setSide] = useState<Side>("buy");
  const [qty, setQty] = useState("");
  const [exchange, setExchange] = useState("Xetra");
  const [type, setType] = useState<OrderType>("market");
  const [validity, setValidity] = useState<Validity>("day");
  const [limit, setLimit] = useState("");
  const [costs, setCosts] = useState(false);
  const [stage, setStage] = useState<"form" | "review" | "result">("form");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");
  const [executed, setExecuted] = useState(false);
  const n = parseInt(qty, 10) || 0;
  const lim = parseDE(limit);
  useEffect(() => { setUi({ qty: n, orderType: type, limit: lim, costsOpen: costs, orderSide: side }); }, [n, type, lim, costs, side]);
  useEffect(() => () => setUi({ qty: 0, orderType: undefined, limit: 0, costsOpen: false }), []);

  const a = save.sim.acct;
  const avail = round2(a.cash - reserved(save));
  const results = searchCompanies(q);
  if (!sym) return (
    <div className="web-page">
      <OrderTop save={save} avail={avail} />
      <h3 className="order-q">{t("Which security do you want to trade?", "Welches Wertpapier möchten Sie handeln?")}</h3>
      <div className="order-search">
        <SearchIcon />
        <input autoFocus placeholder={t("WKN, ISIN or name", "WKN, ISIN oder Name")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search security", "Wertpapier suchen")} />
        {q && <button className="link" onClick={() => setQ("")} aria-label={t("Clear", "Leeren")}>✕</button>}
      </div>
      {q && (
        <ul className="order-results">
          {results.map((c) => (
            <li key={c.sym}><button onClick={() => { setLocal(c.sym); setSym(c.sym); }}>
              <span><Highlight text={c.name.toUpperCase()} q={q.toUpperCase()} /></span>
              <span className={`type-tag ${c.type === "ETF" ? "etf" : ""}`}>{c.type === "ETF" ? "ETF" : t("Stock", "Aktie")}</span>
              <span className="num xs">{c.wkn}</span><span aria-hidden>›</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );

  const c = companyOf(sym);
  const exOff = EXCHANGES.find(([e]) => e === exchange)![1];
  const mid = round2(price(save, sym) * (1 + exOff));
  const px = side === "buy" ? ask(mid) : bid(mid);
  const estPx = type === "limit" && lim > 0 ? (side === "buy" ? Math.min(px, lim) : Math.max(px, lim)) : px;
  const volume = round2(estPx * n);
  const f = n ? fee(volume) : 0;
  const totalCost = side === "buy" ? volume + f : volume - f;
  const own = a.holdings[sym]?.qty ?? 0;

  function review() {
    if (!(n > 0)) return setErr(t("Enter a whole number of shares."));
    if (type !== "market" && !(lim > 0)) return setErr(type === "limit" ? t("Enter a limit.", "Bitte ein Limit eingeben.") : t("Enter a stop price."));
    if (side === "sell" && n > own) return setErr(t(`You own ${qtyFmt(own)} shares.`, `Sie haben ${qtyFmt(own)} Stück im Bestand.`));
    if (side === "buy" && totalCost > avail + 1e-9) return setErr(t(`Not enough money on your trading account: ${eur(avail)} available. Move money from your current account first.`, `Nicht genug Geld auf dem Verrechnungskonto: ${eur(avail)} verfügbar. Überweisen Sie zuerst Geld vom Girokonto.`));
    setErr(null); setStage("review");
  }
  function confirm() {
    const res = actions.order({ sym: sym!, side, qty: n, type, limit: lim, validity, exchange });
    if (res.error) { setErr(t(res.error)); setStage("form"); return; }
    bump("orderPlaced");
    setExecuted(!!res.filled);
    setResult(res.filled
      ? t(`Executed: ${side === "buy" ? "bought" : "sold"} ${n} × ${c.short} at ${EUR(res.filled.price)} on ${exchange}. Costs: ${eur(res.filled.fee)}.`, `Ausgeführt: ${n} × ${c.short} zu ${EUR(res.filled.price)} an ${exchange} ${side === "buy" ? "gekauft" : "verkauft"}. Kosten: ${eur(res.filled.fee)}.`)
      : t(`Your ${type} order is in the order book. It will execute when the price reaches ${EUR(lim)}. Validity: ${validity === "day" ? "good for day" : validity === "ultimo" ? "until end of month" : "maximum"}.`, `Ihre ${type === "limit" ? "Limit" : "Stop"}-Order liegt im Orderbuch. Sie wird ausgeführt, wenn der Kurs ${EUR(lim)} erreicht. Gültigkeit: ${validity === "day" ? "tagesgültig" : validity === "ultimo" ? "Ultimo (bis Monatsende)" : "maximal"}.`));
    setStage("result");
  }

  if (stage === "result") return (
    <div className="web-page">
      <PageHead title="Order" />
      <div className="success-box" role="status">
        <strong>✓ {executed ? t("Order executed", "Order ausgeführt") : t("Order placed", "Order erteilt")}</strong>
        <p className="small">{result}</p>
        <div className="row">
          <button className="pill pill-lg pill-yellow" onClick={() => go("depot")}>{t("Go to depot ›", "Zum Depot ›")}</button>
          <button className="pill pill-lg" onClick={() => go("umsaetze")}>{t("Transactions ›", "Umsätze ›")}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="web-page">
      <OrderTop save={save} avail={avail} />
      <div className="order-instr">
        <span className="chip-instr"><strong>{c.name.toUpperCase()}</strong> <span className={`type-tag ${c.type === "ETF" ? "etf" : ""}`}>{c.type === "ETF" ? "ETF" : t("Stock", "Aktie")}</span> <span className="xs num">{c.wkn}</span>
          <button className="link" onClick={() => setLocal(null)} aria-label={t("Change security", "Wertpapier ändern")}>✕</button></span>
        <span className="small num">{t("Bid", "Geld")} <strong>{num(bid(mid))}</strong> · {t("Ask", "Brief")} <strong>{num(ask(mid))}</strong> EUR · {TIME}</span>
      </div>
      {stage === "review" ? (
        <div className="form-card">
          <h3>{t("Check your order", "Order prüfen")}</h3>
          <dl className="review">
            <dt>Order</dt><dd>{side === "buy" ? t("Buy", "Kauf") : t("Sell", "Verkauf")} {n} × {c.short}</dd>
            <dt>{t("Exchange", "Handelsplatz")}</dt><dd>{exchange}</dd>
            <dt>{t("Execution", "Ausführung")}</dt><dd>{type === "market" ? t("Market (best price)", "Market (bestens)") : type === "limit" ? `Limit ${EUR(lim)}` : `Stop ${EUR(lim)}`}</dd>
            <dt>{t("Validity", "Gültigkeit")}</dt><dd>{validity === "day" ? t("Good for day", "Tagesgültig") : validity === "ultimo" ? t("Until end of month", "Ultimo (Monatsende)") : t("Maximum", "Maximal")}</dd>
            <dt>{t("Est. price value", "Vorauss. Kurswert")}</dt><dd className="num">{EUR(volume)}</dd>
            <dt>{t("Order fee", "Ordergebühr")}</dt><dd className="num">{EUR(f)}</dd>
            <dt>{side === "buy" ? t("Est. total", "Vorauss. Gesamtbetrag") : t("Est. you receive", "Vorauss. Erlös")}</dt><dd className="num"><strong>{EUR(totalCost)}</strong></dd>
          </dl>
          {err && <p className="error" role="alert">{err}</p>}
          <div className="row form-actions">
            <button className="pill pill-lg" onClick={() => setStage("form")}>{t("‹ Change", "‹ Ändern")}</button>
            <button className="btn-buy" onClick={confirm}>{side === "buy" ? t("Buy now (with costs)", "Jetzt kostenpflichtig kaufen") : t("Sell now", "Jetzt verkaufen")}</button>
          </div>
        </div>
      ) : (
        <div className="form-card">
          <div className="side-toggle wide" role="group" aria-label={t("Buy or sell", "Kauf oder Verkauf")} data-tour="of-side">
            <button className="buy" aria-pressed={side === "buy"} onClick={() => setSide("buy")}>{t("Buy", "Kauf")}</button>
            <button className="sell" aria-pressed={side === "sell"} onClick={() => setSide("sell")}>{t("Sell", "Verkauf")}</button>
          </div>
          <div className="of-grid">
            <label className="field float" data-tour="of-qty"><span>{t("Quantity", "Stück")}</span><input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
            <label className="field float" data-tour="of-exchange"><span>{t("Exchange", "Handelsplatz")}</span>
              <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
                {EXCHANGES.map(([e, off]) => <option key={e} value={e}>{e} · {num(price(save, sym) * (1 + off))} EUR</option>)}
              </select>
            </label>
          </div>
          <h3 className="of-sub">{t("Order details", "Orderdetails")} <span className="info" title={t("How and how long your order runs", "Wie und wie lange Ihre Order läuft")}>ⓘ</span></h3>
          <div className="of-grid">
            <label className="field float" data-tour="of-type"><span>{t("Execution", "Ausführung")}</span>
              <select value={type} onChange={(e) => setType(e.target.value as OrderType)}>
                <option value="market">{t("Market (best price)", "Market (bestens)")}</option><option value="limit">Limit</option><option value="stop">Stop</option>
              </select>
            </label>
            <label className="field float" data-tour="of-validity"><span>{t("Validity", "Gültigkeit")}</span>
              <select value={validity} onChange={(e) => setValidity(e.target.value as Validity)}>
                <option value="day">{t("Good for day", "Tagesgültig")}</option><option value="ultimo">{t("Until end of month", "Ultimo (Monatsende)")}</option><option value="max">{t("Maximum", "Maximal")}</option>
              </select>
            </label>
            {type !== "market" && (
              <label className="field float" data-tour="of-limit"><span>{type === "limit" ? "Limit" : "Stop"}</span>
                <span className="addon-wrap"><input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={num(px)} /><span className="addon">EUR</span></span>
              </label>
            )}
          </div>
          <div className="of-foot">
            <span className="small">{side === "buy" ? <>{t("Available", "Verfügbar")}: <strong className="num">{eur(avail)}</strong></> : <>{t("You own", "Im Bestand")}: <strong className="num">{qtyFmt(own)}</strong></>}</span>
            <button className="link small" data-tour="of-costs-link" onClick={() => setCosts(!costs)} aria-expanded={costs}>{costs ? t("Hide order costs", "Orderkosten ausblenden") : t("Show order costs", "Orderkosten anzeigen")} ›</button>
          </div>
          {costs && (
            <dl className="review costs" data-tour="of-costs">
              <dt>{t("Est. price value", "Vorauss. Kurswert")} ({n || 0} × {num(estPx)})</dt><dd className="num">{EUR(volume)}</dd>
              <dt>{t("Order fee", "Ordergebühr")} (4,90 € + 0,25 %)</dt><dd className="num">{EUR(f)}</dd>
              <dt>{t("Spread (difference bid/ask, in the price)", "Spread (Differenz Geld/Brief, im Kurs enthalten)")}</dt><dd className="num">{EUR(round2((ask(mid) - bid(mid)) * n))}</dd>
              <dt>{t("Fee as share of the order", "Gebühr als Anteil der Order")}</dt><dd className="num">{volume ? `${num((f / volume) * 100)} %` : "–"}</dd>
              <dt><strong>{side === "buy" ? t("Est. total", "Vorauss. Gesamtbetrag") : t("Est. you receive", "Vorauss. Erlös")}</strong></dt><dd className="num"><strong>{EUR(totalCost)}</strong></dd>
            </dl>
          )}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn-buy" data-tour="of-submit" onClick={review}>{side === "buy" ? t("Buy (with costs)", "Kostenpflichtig kaufen") : t("Sell", "Verkaufen")}</button>
          {ui.view === "order" && type === "market" && <p className="xs muted">{t("Market orders execute right away at the best available price.", "Market-Orders werden sofort zum besten verfügbaren Kurs ausgeführt.")}</p>}
        </div>
      )}
    </div>
  );
}

function OrderTop({ avail }: { save: Save; avail: number }) {
  const t = useT();
  return (
    <>
      <PageHead title="Order" />
      <div className="order-top">
        <div><span className="small">{t("Standard portfolio", "Standarddepot")}</span><span className="xs muted">{USER.name} · {DEPOT_NO}</span></div>
        <div><span className="small">{t("Trading account", "Verrechnungskonto")}</span><span className="xs muted num">{IBAN.verrechnung}</span></div>
        <div className="r"><span className="small num">{eur(avail)}</span><span className="xs muted">{t("Available amount", "Verfügbarer Betrag")}</span></div>
      </div>
    </>
  );
}

// ── Depot ─────────────────────────────────────────────────────────────────

function Depot({ save, go }: { save: Save; go: (v: View, s?: string) => void }) {
  const t = useT();
  const [tab, setTab] = useState("Table");
  const d = save.sim.day;
  const value = depotValue(save.sim), prevValue = depotValue(save.sim, d - 1);
  const cost = costBasis(save.sim);
  const pos = Object.entries(save.sim.acct.holdings);
  const dPrev = value - prevValue, dBuy = value - cost;
  return (
    <div className="web-page">
      <PageHead title={t("Portfolio", "Depot")} owner />
      <div className="dcards">
        <div className="dcard">
          <div className="dcard-h"><strong>{t("Your portfolio value", "Ihr Depotwert")}</strong><span className="info">ⓘ</span></div>
          <span className="xs muted">{t("Difference to previous day", "Differenz zum Vortag")}</span>
          <div className="dcard-v"><span className={`small ${cls(dPrev)}`}><Arrow up={dPrev >= 0} /> {pct(prevValue ? (dPrev / prevValue) * 100 : 0)} | {signed(dPrev)} EUR</span><span className="dcard-num num">{EUR(value)}</span></div>
        </div>
        <div className="dcard" data-tour="depot-pnl">
          <div className="dcard-h"><strong>{t("Your purchase value", "Ihr Kaufwert")}</strong></div>
          <span className="xs muted">{t("Difference since purchase", "Differenz seit Kauf")}</span>
          <div className="dcard-v"><span className={`small ${cls(dBuy)}`}><Arrow up={dBuy >= 0} /> {pct(cost ? (dBuy / cost) * 100 : 0)} | {signed(dBuy)} EUR</span><span className="dcard-num num">{EUR(cost)}</span></div>
        </div>
      </div>
      <div className="tabs-line" role="tablist">
        {["Cards", "Table", "Notes", "Tax simulation"].map((tb) => <button key={tb} role="tab" aria-selected={tab === tb} onClick={() => setTab(tb)}>{t(tb)}</button>)}
      </div>
      {pos.length === 0 ? (
        <div className="empty" data-tour="depot-empty">
          <strong>{t("Your portfolio is empty", "Ihr Depot ist leer")}</strong>
          <span className="small muted">{t("Buy your first stock and it shows up here, with its profit or loss.", "Kaufen Sie Ihre erste Aktie, dann erscheint sie hier, mit Gewinn oder Verlust.")}</span>
          <button className="pill pill-lg pill-yellow" onClick={() => go("order")}>{t("Buy/Sell ›", "Kauf/Verkauf ›")}</button>
        </div>
      ) : tab === "Cards" ? (
        <div className="tiles">
          {pos.map(([sym, h]) => {
            const v = h.qty * price(save, sym), diff = v - h.cost;
            return <button key={sym} className={`tile ${diff >= 0 ? "gain" : "loss"}`} style={{ flexGrow: v }} onClick={() => go("stock", sym)}>
              <span className="small">{companyOf(sym).name.toUpperCase()}</span><strong className="num">{EUR(v)} | {signed(diff)} EUR</strong><span className="xs num">{pct((diff / h.cost) * 100)} {t("since purchase", "seit Kauf")}</span>
            </button>;
          })}
        </div>
      ) : (
        <div className="scroll-x">
          <table className="wtable depot-table">
            <thead><tr><th>{t("Qty/", "Stück/")}<br />{t("Nom.", "Nom.")}</th><th>{t("Name", "Name")}</th><th className="r">WKN<br />{t("Type", "Art")}<br />{t("Currency", "Währung")}</th><th className="r">{t("Current price", "Akt. Kurs")}<br />{t("Diff. abs", "Diff. abs.")}<br />{t("Diff. %", "Diff. %")}</th><th className="r">{t("Value in EUR", "Wert in EUR")}<br />{t("Diff. abs", "Diff. abs.")}<br />{t("Diff. %", "Diff. %")}</th><th className="r">{t("Date", "Datum")}<br />{t("Time", "Zeit")}<br />{t("Exchange", "Börse")}</th><th className="r">{t("Purchase", "Kauf-")}<br />{t("price", "kurs")}</th><th className="r">{t("Purchase", "Kauf-")}<br />{t("value", "wert")}</th><th>{t("Action", "Aktion")}</th></tr></thead>
            <tbody>
              {pos.map(([sym, h], i) => {
                const c = companyOf(sym), p = price(save, sym), pp = price(save, sym, d - 1), v = h.qty * p, diff = v - h.cost;
                return (
                  <tr key={sym} data-tour={i === 0 ? "depot-pos" : undefined}>
                    <td className="num">{qtyFmt(h.qty)}</td>
                    <td><button className="link" onClick={() => go("stock", sym)}>{c.name.toUpperCase()}</button></td>
                    <td className="r num">{c.wkn}<br />{c.type === "ETF" ? "ETF" : t("Stock", "Aktie")}<br />EUR</td>
                    <td className="r num">{num(p)}<br /><span className={cls(p - pp)}>{signed(p - pp, 3)}</span><br /><span className={cls(p - pp)}>{pct((p / pp - 1) * 100)}</span></td>
                    <td className="r num">{num(v)}<br /><span className={cls(diff)}>{signed(diff)}</span><br /><span className={cls(diff)}>{pct((diff / h.cost) * 100)}</span></td>
                    <td className="r num">{dateDE(today(save))}<br />{TIME}<br />Xetra</td>
                    <td className="r num">{num(h.cost / h.qty)}</td>
                    <td className="r num">{num(h.cost)}</td>
                    <td><span className="kv-btns"><button onClick={() => go("order", sym)} aria-label={t("Buy more", "Nachkaufen")}>K</button><button onClick={() => go("order", sym)} aria-label={t("Sell", "Verkaufen")}>V</button></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {save.sim.acct.orders.length > 0 && (
        <section className="open-orders">
          <h3>{t("Open orders", "Offene Orders")}</h3>
          <table className="wtable">
            <thead><tr><th>Order</th><th>{t("Type", "Art")}</th><th className="r">Limit</th><th>{t("Validity", "Gültigkeit")}</th><th /></tr></thead>
            <tbody>
              {save.sim.acct.orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.side === "buy" ? t("Buy", "Kauf") : t("Sell", "Verkauf")} {o.qty} × {companyOf(o.sym).short}</td><td>{t(o.type, o.type === "limit" ? "Limit" : o.type === "stop" ? "Stop" : "Market")}</td><td className="r num">{EUR(o.limit)}</td>
                  <td>{o.validity === "day" ? t("Good for day", "Tagesgültig") : o.validity === "ultimo" ? t("End of month", "Ultimo") : t("Maximum", "Maximal")}</td>
                  <td><button className="pill" onClick={() => actions.setSim(cancelOrder(save.sim, o.id))}>{t("Cancel", "Streichen")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// ── Transactions (Umsätze) ────────────────────────────────────────────────

function Transactions({ save }: { save: Save }) {
  const t = useT();
  const [acc, setAcc] = useState<"all" | "giro" | "verrechnung" | "depot">("all");
  const list = save.tx.filter((x) => acc === "all" || x.account === acc);
  const groups = (["giro", "verrechnung", "depot"] as const).filter((g) => acc === "all" || g === acc);
  const label = { giro: t("Current account", "Girokonto"), verrechnung: t("Trading account", "Verrechnungskonto"), depot: t("Portfolio", "Depot") };
  return (
    <div className="web-page">
      <PageHead title={t("Transactions", "Umsätze")} owner />
      <section className="acc">
        <div className="acc-title">{t("Select transactions", "Umsätze auswählen")}</div>
        <div className="finder-grid pad">
          <span className="form-label">{t("Show transactions for", "Umsätze anzeigen für")}</span>
          <div className="select-like"><select value={acc} onChange={(e) => setAcc(e.target.value as typeof acc)} aria-label={t("Account", "Konto")}>
            <option value="all">{t("All accounts", "Alle Konten")}</option><option value="giro">{label.giro}</option><option value="verrechnung">{label.verrechnung}</option><option value="depot">{label.depot}</option>
          </select></div>
          <span className="form-label">{t("Period", "Zeitraum")}</span>
          <div className="select-like"><select aria-label={t("Period", "Zeitraum")} defaultValue="30"><option value="30">{t("30 days", "30 Tage")}</option><option value="90">{t("90 days", "90 Tage")}</option></select></div>
        </div>
      </section>
      <p className="small"><strong>{t(`${list.length} transactions found`, `${list.length} Umsätze gefunden`)}</strong></p>
      <div data-tour="umsatz-list" className="stack">
        {groups.map((g) => {
          const rows = list.filter((x) => x.account === g);
          if (!rows.length) return null;
          return (
            <section key={g} className="acc">
              <div className="acc-title">{label[g]}</div>
              <table className="wtable">
                <thead><tr><th>{t("Booking day", "Buchungstag")}</th>{g === "depot" && <th className="r">{t("Qty", "Stück")}</th>}<th className={g === "depot" ? "r" : ""}>{t("Description", "Buchungstext")}</th>{g === "depot" && <><th className="r">WKN</th><th className="r">{t("Exec. price", "Ausf.-Kurs")}</th></>}<th className="r">{t("Amount", "Betrag")}</th></tr></thead>
                <tbody>
                  {rows.map((tx) => (
                    <tr key={tx.id}>
                      <td className="num">{dateDE(dateOf(U, tx.day))}</td>
                      {g === "depot" && <td className="r num">{tx.qty ? qtyFmt(tx.qty) : ""}</td>}
                      <td className={g === "depot" ? "r" : ""}>{txText(t, tx.text)}</td>
                      {g === "depot" && <><td className="r num">{tx.sym ? companyOf(tx.sym).wkn : ""}</td><td className="r num">{tx.price ? eur(tx.price) : ""}</td></>}
                      <td className={`r num ${cls(tx.amount)}`}>{eur(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
        {list.length === 0 && <div className="empty"><strong>{t("No transactions yet", "Noch keine Umsätze")}</strong><span className="small muted">{t("Transfers and orders show up here.", "Überweisungen und Orders erscheinen hier.")}</span></div>}
      </div>
    </div>
  );
}

