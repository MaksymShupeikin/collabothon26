"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COMPANIES, companyOf } from "@/features/market/companies";
import { cls, dateDE, eur, EUR, num, pct, qtyFmt, signed } from "@/shared/lib/format";
import { chapterById } from "@/features/tour/chapters";
import { USER } from "@/shared/lib/user";
import { actions, useGame, type Save } from "@/features/game/store";
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
        logout={<Link className="btn btn-primary btn-sm" href="/">Exit ›</Link>} />
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
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <div className="page-owner">
        <span className="page-icons" aria-hidden>ⓘ ⎙ ✉</span>
        {owner && <span className="small">Holder: <strong>{USER.name}</strong></span>}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────

function Home({ save, go }: { save: Save; go: (v: View, s?: string) => void }) {
  const a = save.sim.acct;
  const dep = depotValue(save.sim);
  const avail = round2(a.cash - reserved(save));
  const total = round2(save.giro + a.cash + dep);
  const [addOpen, setAddOpen] = useState(false);
  const lastTransfer = save.tx.find((t) => t.account === "giro" && t.text.startsWith("Transfer"));
  return (
    <div className="web-page">
      <PageHead title={`Good morning, ${USER.salutation}.`} owner />
      <section className="acc">
        <div className="acc-title">comdirect</div>
        <table className="acc-table">
          <thead><tr><th>Account</th><th>Actions</th><th>IBAN / number</th><th className="r">Available</th><th className="r">Balance</th></tr></thead>
          <tbody>
            <tr data-tour="acc-giro">
              <td><button className="link" onClick={() => go("umsaetze")}>Current account</button></td>
              <td><button className="pill" data-tour="btn-transfer" onClick={() => go("transfer")}>Transfer ›</button></td>
              <td className="num muted">{IBAN.giro}</td>
              <td className="r num">{eur(save.giro)}</td>
              <td className="r num bal">{eur(save.giro)}</td>
            </tr>
            <tr data-tour="acc-depot">
              <td><button className="link" onClick={() => go("depot")}>Portfolio</button> <span className="info" title="Your securities">ⓘ</span></td>
              <td><button className="pill" onClick={() => go("order")}>Buy/Sell ›</button></td>
              <td className="num muted">{DEPOT_NO}</td>
              <td className="r num" />
              <td className="r num bal">{eur(dep)}</td>
            </tr>
            <tr data-tour="acc-verrechnung">
              <td><button className="link" onClick={() => go("umsaetze")}>Trading account</button> <span className="info" title="Settlement account: your cash for trading">ⓘ</span></td>
              <td />
              <td className="num muted">{IBAN.verrechnung}</td>
              <td className="r num">{eur(avail)}</td>
              <td className="r num bal">{eur(a.cash)}</td>
            </tr>
            <tr className="acc-total" data-tour="acc-total">
              <td><strong>Total</strong></td><td /><td />
              <td className="r num">{eur(save.giro + avail)}</td>
              <td className="r num bal"><strong>{eur(total)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div className="row acc-actions">
          <button className="pill pill-lg" onClick={() => go("umsaetze")}>All transactions ›</button>
          {save.proUnlocked
            ? <Link className="pill pill-lg pill-yellow" href="/pro">ProTrader ›</Link>
            : <span className="pill pill-lg pill-yellow" aria-disabled="true" title="Unlocks after the Module 1 mission">🔒 ProTrader</span>}
          <button className="sandbox-btn" data-tour="add-play-money" onClick={() => setAddOpen(true)}><span className="sandbox-tag">Sandbox</span> Add play money</button>
        </div>
      </section>
      <section className="recent">
        <div className="acc-title">Recent activity</div>
        <dl>
          <dt>Login</dt><dd>{dateDE(today(save))} at {TIME.slice(0, 5)}</dd>
          <dt>Transfer</dt><dd>{lastTransfer ? `${dateDE(dateOf(U, lastTransfer.day))} · ${eur(Math.abs(lastTransfer.amount))} to trading account` : "None yet"}</dd>
          <dt>Orders</dt><dd>{save.sim.acct.trades.length ? `${save.sim.acct.trades.length} executed` : "None yet"}{save.sim.acct.orders.length ? ` · ${save.sim.acct.orders.length} open` : ""}</dd>
        </dl>
      </section>
      {addOpen && <AddPlayMoney onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddPlayMoney({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState("100");
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Add play money" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <span className="sandbox-tag" style={{ alignSelf: "flex-start" }}>Sandbox control · not a comdirect function</span>
        <h2>Add play money</h2>
        <p className="small muted">Goes to your current account. It’s play money and never counts as profit.</p>
        <div className="row">{[50, 100, 500, 1000].map((x) => <button key={x} className="btn btn-outline btn-sm" onClick={() => setV(String(x))}>+{num(x, 0)} €</button>)}</div>
        <label className="field">Amount (EUR)<input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} /></label>
        <div className="row">
          <button className="btn btn-primary" onClick={() => { actions.addPlayMoney(parseDE(v)); onClose(); }}>Add</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export const parseDE = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;

// ── Transfer + photoTAN ───────────────────────────────────────────────────

function Transfer({ save, go }: { save: Save; go: (v: View) => void }) {
  const [toTrading, setToTrading] = useState(true);
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("Top-up");
  const [err, setErr] = useState<string | null>(null);
  const [tan, setTan] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const val = parseDE(amount);
  useEffect(() => { setUi({ trAmount: val, tanOpen: tan }); }, [val, tan]);
  useEffect(() => () => setUi({ tanOpen: false, trAmount: 0 }), []);
  const fromBal = toTrading ? save.giro : save.sim.acct.cash;

  function next() {
    if (!(val > 0)) return setErr("Enter an amount above 0,00 €.");
    if (val > fromBal + 1e-9) return setErr(`Not enough money: ${eur(fromBal)} available.`);
    setErr(null); setTan(true);
  }

  if (done !== null) return (
    <div className="web-page">
      <PageHead title="Transfer" />
      <div className="success-box" role="status">
        <strong>✓ Transfer completed</strong>
        <p className="small">{eur(done)} {toTrading ? "moved to your trading account." : "moved back to your current account."}</p>
        <div className="row">
          <button className="pill pill-lg" onClick={() => go("umsaetze")}>Show transactions ›</button>
          <button className="pill pill-lg" onClick={() => go("home")}>Overview ›</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="web-page">
      <PageHead title="Transfer" />
      <p className="small muted legend">Between your own accounts</p>
      <div className="form-card">
        <div className="form-row" data-tour="tr-to">
          <span className="form-label">From</span>
          <div className="acct-box"><strong>{toTrading ? "Current account" : "Trading account"}</strong><span className="xs muted num">{toTrading ? IBAN.giro : IBAN.verrechnung}</span><span className="xs num">Balance {eur(fromBal)}</span></div>
          <span className="form-label">To</span>
          <div className="select-like">
            <select value={toTrading ? "v" : "g"} onChange={(e) => setToTrading(e.target.value === "v")} aria-label="To account">
              <option value="v">Trading account</option>
              <option value="g">Current account</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <label className="field float" data-tour="tr-amount"><span>Amount</span>
            <span className="addon-wrap"><input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /><span className="addon">EUR</span></span>
          </label>
          <label className="field float"><span>Reference</span><input value={ref} onChange={(e) => setRef(e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label className="field float"><span>Execution</span><input value={`Today, ${dateDE(today(save))}`} readOnly /></label>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="row form-actions">
          <button className="pill pill-lg" onClick={() => go("home")}>Cancel</button>
          <button className="pill pill-lg pill-yellow" data-tour="tr-submit" onClick={next}>Next ›</button>
        </div>
      </div>
      {tan && <PhotoTan amount={val} toTrading={toTrading} onCancel={() => setTan(false)}
        onOk={() => { const e = actions.transfer(val, toTrading); if (e) { setErr(e); setTan(false); return; } bump("transferDone"); setTan(false); setDone(val); }} />}
    </div>
  );
}

function PhotoTan({ amount, toTrading, onOk, onCancel }: { amount: number; toTrading: boolean; onOk: () => void; onCancel: () => void }) {
  const code = useMemo(() => String(100000 + Math.floor(rng(Math.round(amount * 100) + 7)() * 899999)), [amount]);
  const cells = useMemo(() => { const r = rng(Number(code)); return Array.from({ length: 144 }, () => Math.floor(r() * 4)); }, [code]);
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const fills = ["var(--color-ink)", "var(--color-accent)", "var(--color-bg-dark)", "var(--color-white)"];
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Confirm with photoTAN">
      <div className="modal modal-mid" data-tour="tan-box">
        <h2>Confirm with photoTAN</h2>
        <p className="small muted">Transfer of <strong>{eur(amount)}</strong> to your {toTrading ? "Trading account" : "Current account"}.</p>
        <div className="tan">
          <div className="tan-mosaic" aria-label="photoTAN graphic">
            <svg viewBox="0 0 12 12" width="168" height="168" shapeRendering="crispEdges">
              {cells.map((c, i) => <rect key={i} x={i % 12} y={Math.floor(i / 12)} width="1" height="1" fill={fills[c]} />)}
            </svg>
            <span className="xs muted">Scan with the photoTAN app</span>
          </div>
          <div className="phone" aria-label="Simulated photoTAN app">
            <div className="phone-notch" />
            <span className="xs">photoTAN · simulated</span>
            <span className="xs muted">Transfer {eur(amount)}</span>
            <span className="phone-tan num">{code.slice(0, 3)} {code.slice(3)}</span>
            <span className="xs muted">Your TAN</span>
          </div>
        </div>
        <label className="field float"><span>TAN</span>
          <input inputMode="numeric" autoFocus value={v} onChange={(e) => { setV(e.target.value); setErr(false); }} placeholder="6 digits"
            onKeyDown={(e) => { if (e.key === "Enter") { if (v.replace(/\s/g, "") === code) onOk(); else setErr(true); } }} />
        </label>
        {err && <p className="error" role="alert">That TAN doesn’t match. Copy the 6 digits from the phone.</p>}
        <div className="row">
          <button className="pill pill-lg" onClick={onCancel}>Cancel</button>
          <button className="pill pill-lg pill-yellow" onClick={() => (v.replace(/\s/g, "") === code ? onOk() : setErr(true))}>Confirm transfer ›</button>
        </div>
      </div>
    </div>
  );
}

// ── Aktien-Finder ─────────────────────────────────────────────────────────

const REGION: Record<string, string> = { DTE: "Germany", SAP: "Germany", ADS: "Germany", SIE: "Germany", ALV: "Germany", MBG: "Germany", VOW3: "Germany", AAPL: "USA", MSFT: "USA", NVDA: "USA", TSLA: "USA" };

function Finder({ save, go }: { save: Save; go: (v: View, s?: string) => void }) {
  const [region, setRegion] = useState("");
  const [sector, setSector] = useState("");
  const [pre, setPre] = useState("de");
  const stocks = COMPANIES.filter((c) => c.type === "Aktie");
  const sectors = [...new Set(stocks.map((c) => c.sector))].sort();
  const hits = stocks.filter((c) => (!region || REGION[c.sym] === region) && (!sector || c.sector === sector));
  useEffect(() => { setUi({ finderSector: sector }); }, [sector]);
  return (
    <div className="web-page">
      <PageHead title="The Aktien-Finder: find stocks by criteria" />
      <p className="lead">The Aktien-Finder helps you discover stocks that fit your strategy and your portfolio.</p>
      <div className="finder">
        <div className="finder-count"><span>Number of hits: <strong>{hits.length}</strong></span><a className="pill pill-yellow" href="#finder-results">Show</a></div>
        <div className="finder-grid">
          <span className="form-label">Preselection</span>
          <div className="radios" role="radiogroup" aria-label="Preselection">
            {[["de", "Tradable on German exchanges"], ["plan", "Savings plan"], ["live", "Tradable in LiveTrading"], ["none", "No preselection"]].map(([k, l]) => (
              <label key={k} className="radio"><input type="radio" name="pre" checked={pre === k} onChange={() => setPre(k)} /> {l}</label>
            ))}
          </div>
          <span className="form-label">Country or index</span>
          <div className="select-like"><select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Country or index"><option value="">No selection</option><option>Germany</option><option>USA</option></select></div>
          <span className="form-label">Sector</span>
          <div className="select-like" data-tour="finder-sector"><select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector"><option value="">--</option>{sectors.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
      </div>
      <table className="wtable" id="finder-results" data-tour="finder-results">
        <thead><tr><th>Name</th><th>WKN</th><th>Sector</th><th className="r">Price</th><th className="r">Diff. prev. day</th></tr></thead>
        <tbody>
          {hits.map((c) => {
            const p = price(save, c.sym), ch = (p / price(save, c.sym, save.sim.day - 1) - 1) * 100;
            return (
              <tr key={c.sym} className="clickable" onClick={() => go("stock", c.sym)}>
                <td><button className="link" onClick={() => go("stock", c.sym)}>{c.name}</button></td>
                <td className="num">{c.wkn}</td><td>{c.sector}</td><td className="r num">{EUR(p)}</td><td className={`r num ${cls(ch)}`}>{pct(ch)}</td>
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
      <button className="link back" onClick={() => go("home")}>‹ Overview</button>
      <div className="stock-head">
        <div>
          <h1 className="stock-name">{c.name.toUpperCase()}</h1>
          <div className="tags" data-tour="stock-ids"><span className="tag">{c.type === "ETF" ? "ETF" : "Stock"}</span><span className="tag">WKN: {c.wkn}</span><span className="tag">ISIN: {c.isin}</span></div>
        </div>
        <div className="stock-actions">
          <button className="pill pill-lg pill-yellow" data-tour="stock-buy" onClick={() => go("order", sym)}>Buy</button>
          <button className="pill pill-lg" onClick={() => go("order", sym)} disabled={!own}>Sell</button>
        </div>
      </div>
      <div className="stock-grid">
        <section className="stock-main">
          <div className="quote" data-tour="stock-price">
            <span className="quote-price num">{num(p, p < 10 ? 3 : 2)} <small>EUR</small></span>
            <span className="xs muted num">{dateDE(today(save))} · {TIME} · <u>Xetra</u></span>
          </div>
          <div className={`quote-chg ${cls(chg)}`} data-tour="stock-change">
            <Arrow up={chg >= 0} /> <span className="num">{pct((p / prev - 1) * 100)} | {signed(chg)} EUR</span> <span className="xs muted">vs. previous day</span>
          </div>
          <div className="chart-box">
            <PriceLine points={points} intraday={n === 1} />
          </div>
          <div className="range-tabs" role="tablist" aria-label="Chart period" data-tour="stock-chart-tabs">
            {RANGES.map(([k]) => <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)}>{k}</button>)}
          </div>
        </section>
        <aside className="stock-side">
          <section className="keys" data-tour="stock-keys">
            <h3>Key numbers</h3>
            <dl>
              <dt>Previous close</dt><dd className="num">{EUR(prev)}</dd>
              <dt>Open</dt><dd className="num">{EUR(open)}</dd>
              <dt>Day high / low</dt><dd className="num">{num(dayHi)} / {num(dayLo)}</dd>
              <dt>52-week high</dt><dd className="num">{EUR(Math.max(...year))}</dd>
              <dt>52-week low</dt><dd className="num">{EUR(Math.min(...year))}</dd>
              <dt>Volume (pcs.)</dt><dd className="num">{vol.toLocaleString("de-DE")}</dd>
              <dt>Bid / ask</dt><dd className="num">{num(bid(p))} / {num(ask(p))}</dd>
            </dl>
          </section>
          {own && <p className="small own">You own <strong>{qtyFmt(own.qty)}</strong> · bought for {eur(own.cost)}</p>}
        </aside>
      </div>
      <section className="news-block" data-tour="stock-news">
        <div className="acc-title">News <span className="sim-label">Simulated</span></div>
        {news.length === 0 && <p className="small muted pad">No news in the last weeks.</p>}
        {news.map((x) => (
          <div key={x.id} className="news-row"><span className="num xs muted">{dateDE(dateOf(U, x.day))} {x.time.slice(0, 5)}</span><span className="small">{x.headline}</span></div>
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
      <h3 className="order-q">Which security do you want to trade?</h3>
      <div className="order-search">
        <SearchIcon />
        <input autoFocus placeholder="WKN, ISIN or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search security" />
        {q && <button className="link" onClick={() => setQ("")} aria-label="Clear">✕</button>}
      </div>
      {q && (
        <ul className="order-results">
          {results.map((c) => (
            <li key={c.sym}><button onClick={() => { setLocal(c.sym); setSym(c.sym); }}>
              <span><Highlight text={c.name.toUpperCase()} q={q.toUpperCase()} /></span>
              <span className={`type-tag ${c.type === "ETF" ? "etf" : ""}`}>{c.type === "ETF" ? "ETF" : "Stock"}</span>
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
    if (!(n > 0)) return setErr("Enter a whole number of shares.");
    if (type !== "market" && !(lim > 0)) return setErr(type === "limit" ? "Enter a limit." : "Enter a stop price.");
    if (side === "sell" && n > own) return setErr(`You own ${qtyFmt(own)} shares.`);
    if (side === "buy" && totalCost > avail + 1e-9) return setErr(`Not enough money on your trading account: ${eur(avail)} available. Move money from your current account first.`);
    setErr(null); setStage("review");
  }
  function confirm() {
    const res = actions.order({ sym: sym!, side, qty: n, type, limit: lim, validity, exchange });
    if (res.error) { setErr(res.error); setStage("form"); return; }
    bump("orderPlaced");
    setResult(res.filled
      ? `Executed: ${side === "buy" ? "bought" : "sold"} ${n} × ${c.short} at ${EUR(res.filled.price)} on ${exchange}. Costs: ${eur(res.filled.fee)}.`
      : `Your ${type} order is in the order book. It will execute when the price reaches ${EUR(lim)}. Validity: ${validity === "day" ? "good for day" : validity === "ultimo" ? "until end of month" : "maximum"}.`);
    setStage("result");
  }

  if (stage === "result") return (
    <div className="web-page">
      <PageHead title="Order" />
      <div className="success-box" role="status">
        <strong>✓ Order {result.startsWith("Executed") ? "executed" : "placed"}</strong>
        <p className="small">{result}</p>
        <div className="row">
          <button className="pill pill-lg pill-yellow" onClick={() => go("depot")}>Go to depot ›</button>
          <button className="pill pill-lg" onClick={() => go("umsaetze")}>Transactions ›</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="web-page">
      <OrderTop save={save} avail={avail} />
      <div className="order-instr">
        <span className="chip-instr"><strong>{c.name.toUpperCase()}</strong> <span className={`type-tag ${c.type === "ETF" ? "etf" : ""}`}>{c.type === "ETF" ? "ETF" : "Stock"}</span> <span className="xs num">{c.wkn}</span>
          <button className="link" onClick={() => setLocal(null)} aria-label="Change security">✕</button></span>
        <span className="small num">Bid <strong>{num(bid(mid))}</strong> · Ask <strong>{num(ask(mid))}</strong> EUR · {TIME}</span>
      </div>
      {stage === "review" ? (
        <div className="form-card">
          <h3>Check your order</h3>
          <dl className="review">
            <dt>Order</dt><dd>{side === "buy" ? "Buy" : "Sell"} {n} × {c.short}</dd>
            <dt>Exchange</dt><dd>{exchange}</dd>
            <dt>Execution</dt><dd>{type === "market" ? "Market (best price)" : type === "limit" ? `Limit ${EUR(lim)}` : `Stop ${EUR(lim)}`}</dd>
            <dt>Validity</dt><dd>{validity === "day" ? "Good for day" : validity === "ultimo" ? "Until end of month" : "Maximum"}</dd>
            <dt>Est. price value</dt><dd className="num">{EUR(volume)}</dd>
            <dt>Order fee</dt><dd className="num">{EUR(f)}</dd>
            <dt>Est. {side === "buy" ? "total" : "you receive"}</dt><dd className="num"><strong>{EUR(totalCost)}</strong></dd>
          </dl>
          {err && <p className="error" role="alert">{err}</p>}
          <div className="row form-actions">
            <button className="pill pill-lg" onClick={() => setStage("form")}>‹ Change</button>
            <button className="btn-buy" onClick={confirm}>{side === "buy" ? "Buy now (with costs)" : "Sell now"}</button>
          </div>
        </div>
      ) : (
        <div className="form-card">
          <div className="side-toggle wide" role="group" aria-label="Buy or sell" data-tour="of-side">
            <button className="buy" aria-pressed={side === "buy"} onClick={() => setSide("buy")}>Buy</button>
            <button className="sell" aria-pressed={side === "sell"} onClick={() => setSide("sell")}>Sell</button>
          </div>
          <div className="of-grid">
            <label className="field float" data-tour="of-qty"><span>Quantity</span><input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
            <label className="field float" data-tour="of-exchange"><span>Exchange</span>
              <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
                {EXCHANGES.map(([e, off]) => <option key={e} value={e}>{e} · {num(price(save, sym) * (1 + off))} EUR</option>)}
              </select>
            </label>
          </div>
          <h3 className="of-sub">Order details <span className="info" title="How and how long your order runs">ⓘ</span></h3>
          <div className="of-grid">
            <label className="field float" data-tour="of-type"><span>Execution</span>
              <select value={type} onChange={(e) => setType(e.target.value as OrderType)}>
                <option value="market">Market (best price)</option><option value="limit">Limit</option><option value="stop">Stop</option>
              </select>
            </label>
            <label className="field float" data-tour="of-validity"><span>Validity</span>
              <select value={validity} onChange={(e) => setValidity(e.target.value as Validity)}>
                <option value="day">Good for day</option><option value="ultimo">Until end of month</option><option value="max">Maximum</option>
              </select>
            </label>
            {type !== "market" && (
              <label className="field float" data-tour="of-limit"><span>{type === "limit" ? "Limit" : "Stop"}</span>
                <span className="addon-wrap"><input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={num(px)} /><span className="addon">EUR</span></span>
              </label>
            )}
          </div>
          <div className="of-foot">
            <span className="small">{side === "buy" ? <>Available: <strong className="num">{eur(avail)}</strong></> : <>You own: <strong className="num">{qtyFmt(own)}</strong></>}</span>
            <button className="link small" data-tour="of-costs-link" onClick={() => setCosts(!costs)} aria-expanded={costs}>{costs ? "Hide order costs" : "Show order costs"} ›</button>
          </div>
          {costs && (
            <dl className="review costs" data-tour="of-costs">
              <dt>Est. price value ({n || 0} × {num(estPx)})</dt><dd className="num">{EUR(volume)}</dd>
              <dt>Order fee (4,90 € + 0,25 %)</dt><dd className="num">{EUR(f)}</dd>
              <dt>Spread (difference bid/ask, in the price)</dt><dd className="num">{EUR(round2((ask(mid) - bid(mid)) * n))}</dd>
              <dt>Fee as share of the order</dt><dd className="num">{volume ? `${num((f / volume) * 100)} %` : "–"}</dd>
              <dt><strong>Est. {side === "buy" ? "total" : "you receive"}</strong></dt><dd className="num"><strong>{EUR(totalCost)}</strong></dd>
            </dl>
          )}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn-buy" data-tour="of-submit" onClick={review}>{side === "buy" ? "Buy (with costs)" : "Sell"}</button>
          {ui.view === "order" && type === "market" && <p className="xs muted">Market orders execute right away at the best available price.</p>}
        </div>
      )}
    </div>
  );
}

function OrderTop({ avail }: { save: Save; avail: number }) {
  return (
    <>
      <PageHead title="Order" />
      <div className="order-top">
        <div><span className="small">Standard portfolio</span><span className="xs muted">{USER.name} · {DEPOT_NO}</span></div>
        <div><span className="small">Trading account</span><span className="xs muted num">{IBAN.verrechnung}</span></div>
        <div className="r"><span className="small num">{eur(avail)}</span><span className="xs muted">Available amount</span></div>
      </div>
    </>
  );
}

// ── Depot ─────────────────────────────────────────────────────────────────

function Depot({ save, go }: { save: Save; go: (v: View, s?: string) => void }) {
  const [tab, setTab] = useState("Table");
  const d = save.sim.day;
  const value = depotValue(save.sim), prevValue = depotValue(save.sim, d - 1);
  const cost = costBasis(save.sim);
  const pos = Object.entries(save.sim.acct.holdings);
  const dPrev = value - prevValue, dBuy = value - cost;
  return (
    <div className="web-page">
      <PageHead title="Portfolio" owner />
      <div className="dcards">
        <div className="dcard">
          <div className="dcard-h"><strong>Your portfolio value</strong><span className="info">ⓘ</span></div>
          <span className="xs muted">Difference to previous day</span>
          <div className="dcard-v"><span className={`small ${cls(dPrev)}`}><Arrow up={dPrev >= 0} /> {pct(prevValue ? (dPrev / prevValue) * 100 : 0)} | {signed(dPrev)} EUR</span><span className="dcard-num num">{EUR(value)}</span></div>
        </div>
        <div className="dcard" data-tour="depot-pnl">
          <div className="dcard-h"><strong>Your purchase value</strong></div>
          <span className="xs muted">Difference since purchase</span>
          <div className="dcard-v"><span className={`small ${cls(dBuy)}`}><Arrow up={dBuy >= 0} /> {pct(cost ? (dBuy / cost) * 100 : 0)} | {signed(dBuy)} EUR</span><span className="dcard-num num">{EUR(cost)}</span></div>
        </div>
      </div>
      <div className="tabs-line" role="tablist">
        {["Cards", "Table", "Notes", "Tax simulation"].map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {pos.length === 0 ? (
        <div className="empty" data-tour="depot-empty">
          <strong>Your portfolio is empty</strong>
          <span className="small muted">Buy your first stock and it shows up here, with its profit or loss.</span>
          <button className="pill pill-lg pill-yellow" onClick={() => go("order")}>Buy/Sell ›</button>
        </div>
      ) : tab === "Cards" ? (
        <div className="tiles">
          {pos.map(([sym, h]) => {
            const v = h.qty * price(save, sym), diff = v - h.cost;
            return <button key={sym} className={`tile ${diff >= 0 ? "gain" : "loss"}`} style={{ flexGrow: v }} onClick={() => go("stock", sym)}>
              <span className="small">{companyOf(sym).name.toUpperCase()}</span><strong className="num">{EUR(v)} | {signed(diff)} EUR</strong><span className="xs num">{pct((diff / h.cost) * 100)} since purchase</span>
            </button>;
          })}
        </div>
      ) : (
        <div className="scroll-x">
          <table className="wtable depot-table">
            <thead><tr><th>Qty/<br />Nom.</th><th>Name</th><th className="r">WKN<br />Type<br />Currency</th><th className="r">Current price<br />Diff. abs<br />Diff. %</th><th className="r">Value in EUR<br />Diff. abs<br />Diff. %</th><th className="r">Date<br />Time<br />Exchange</th><th className="r">Purchase<br />price</th><th className="r">Purchase<br />value</th><th>Action</th></tr></thead>
            <tbody>
              {pos.map(([sym, h], i) => {
                const c = companyOf(sym), p = price(save, sym), pp = price(save, sym, d - 1), v = h.qty * p, diff = v - h.cost;
                return (
                  <tr key={sym} data-tour={i === 0 ? "depot-pos" : undefined}>
                    <td className="num">{qtyFmt(h.qty)}</td>
                    <td><button className="link" onClick={() => go("stock", sym)}>{c.name.toUpperCase()}</button></td>
                    <td className="r num">{c.wkn}<br />{c.type === "ETF" ? "ETF" : "Stock"}<br />EUR</td>
                    <td className="r num">{num(p)}<br /><span className={cls(p - pp)}>{signed(p - pp, 3)}</span><br /><span className={cls(p - pp)}>{pct((p / pp - 1) * 100)}</span></td>
                    <td className="r num">{num(v)}<br /><span className={cls(diff)}>{signed(diff)}</span><br /><span className={cls(diff)}>{pct((diff / h.cost) * 100)}</span></td>
                    <td className="r num">{dateDE(today(save))}<br />{TIME}<br />Xetra</td>
                    <td className="r num">{num(h.cost / h.qty)}</td>
                    <td className="r num">{num(h.cost)}</td>
                    <td><span className="kv-btns"><button onClick={() => go("order", sym)} aria-label="Buy more">K</button><button onClick={() => go("order", sym)} aria-label="Sell">V</button></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {save.sim.acct.orders.length > 0 && (
        <section className="open-orders">
          <h3>Open orders</h3>
          <table className="wtable">
            <thead><tr><th>Order</th><th>Type</th><th className="r">Limit</th><th>Validity</th><th /></tr></thead>
            <tbody>
              {save.sim.acct.orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.side === "buy" ? "Buy" : "Sell"} {o.qty} × {companyOf(o.sym).short}</td><td>{o.type}</td><td className="r num">{EUR(o.limit)}</td>
                  <td>{o.validity === "day" ? "Good for day" : o.validity === "ultimo" ? "End of month" : "Maximum"}</td>
                  <td><button className="pill" onClick={() => actions.setSim(cancelOrder(save.sim, o.id))}>Cancel</button></td>
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
  const [acc, setAcc] = useState<"all" | "giro" | "verrechnung" | "depot">("all");
  const list = save.tx.filter((t) => acc === "all" || t.account === acc);
  const groups = (["giro", "verrechnung", "depot"] as const).filter((g) => acc === "all" || g === acc);
  const label = { giro: "Current account", verrechnung: "Trading account", depot: "Portfolio" };
  return (
    <div className="web-page">
      <PageHead title="Transactions" owner />
      <section className="acc">
        <div className="acc-title">Select transactions</div>
        <div className="finder-grid pad">
          <span className="form-label">Show transactions for</span>
          <div className="select-like"><select value={acc} onChange={(e) => setAcc(e.target.value as typeof acc)} aria-label="Account">
            <option value="all">All accounts</option><option value="giro">Current account</option><option value="verrechnung">Trading account</option><option value="depot">Portfolio</option>
          </select></div>
          <span className="form-label">Period</span>
          <div className="select-like"><select aria-label="Period" defaultValue="30"><option value="30">30 days</option><option>90 days</option></select></div>
        </div>
      </section>
      <p className="small"><strong>{list.length} transactions found</strong></p>
      <div data-tour="umsatz-list" className="stack">
        {groups.map((g) => {
          const rows = list.filter((t) => t.account === g);
          if (!rows.length) return null;
          return (
            <section key={g} className="acc">
              <div className="acc-title">{label[g]}</div>
              <table className="wtable">
                <thead><tr><th>Booking day</th>{g === "depot" && <th className="r">Qty</th>}<th className={g === "depot" ? "r" : ""}>Description</th>{g === "depot" && <><th className="r">WKN</th><th className="r">Exec. price</th></>}<th className="r">Amount</th></tr></thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td className="num">{dateDE(dateOf(U, t.day))}</td>
                      {g === "depot" && <td className="r num">{t.qty ? qtyFmt(t.qty) : ""}</td>}
                      <td className={g === "depot" ? "r" : ""}>{t.text}</td>
                      {g === "depot" && <><td className="r num">{t.sym ? companyOf(t.sym).wkn : ""}</td><td className="r num">{t.price ? eur(t.price) : ""}</td></>}
                      <td className={`r num ${cls(t.amount)}`}>{eur(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
        {list.length === 0 && <div className="empty"><strong>No transactions yet</strong><span className="small muted">Transfers and orders show up here.</span></div>}
      </div>
    </div>
  );
}

