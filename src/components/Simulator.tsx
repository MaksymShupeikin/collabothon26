"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { COMPANIES } from "@/lib/data/companies";
import { conceptById } from "@/lib/data/concepts";
import {
  BOTS, cancelOrder, createMarket, topUp, fee, guessCall, placeOrder, priceOf, riskScore, round2, SPREAD, tick, valueOf,
  type Market, type News, type OrderType, type Side,
} from "@/lib/market";
import { tourDone, useProgress } from "@/lib/progress";
import CoachMark, { type CoachStep } from "./CoachMark";
import Icon from "./Icon";
import CandleChart from "./CandleChart";
import LineChart from "./LineChart";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toLocaleString("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} %`;
const cls = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "");
const nameOf = (sym: string) => COMPANIES.find((c) => c.sym === sym)?.name ?? sym;
const botMeta = (id: string) => BOTS.find((b) => b.id === id)!;
const SPEEDS = [{ label: "Pause", ms: 0 }, { label: "1 day/s", ms: 1000 }, { label: "1 week/s", ms: 200 }];
const START = Date.UTC(2025, 0, 2); // simulated calendar; the year is never shown
/** Trading day n → calendar date, skipping weekends. */
function tradingDate(n: number) {
  const d = new Date(START);
  while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() % 6) n--; }
  return d;
}
const fmtDate = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });
const CHART_COLORS = ["var(--color-ink)", "var(--color-ink-2)", "var(--color-border)", "var(--color-bg-dark)", "var(--color-gain)", "var(--color-loss)"]; // accent is reserved for "You"
const lineColor = (id: string, i: number) => (id === "you" ? "var(--color-accent)" : CHART_COLORS[i % CHART_COLORS.length]);

type Ctx = { selected: string; qty: number; holdings: number; speed: number; side: Side; type: OrderType };
const TOUR: (CoachStep & { done?: (c: Ctx) => boolean })[] = [
  { title: "Your practice depot", text: "The real comdirect trading screen, with 10,000 € play money." },
  { target: "depot", title: "Your account", text: "Total value, cash and profit or loss — always on top." },
  { target: "pricelist", title: "Find a stock", text: "Search by name, ticker or WKN.", task: "Find and pick SAP.", done: (c) => c.selected === "SAP" },
  { target: "detail", title: "Chart", text: "The price over time. Your trades appear as dots." },
  { target: "side", title: "Buy or sell", text: "You can only sell what you own.", task: "Select Buy.", done: (c) => c.side === "buy" },
  { target: "qty", title: "Quantity", text: "Number of shares.", task: "Enter 5.", done: (c) => c.qty === 5 },
  { target: "ordertype", title: "Order type", text: "Market: now. Limit: only at your price. Stop: when the price hits a level." },
  { target: "costs", title: "Costs", text: `Spread (${SPREAD * 100}%) plus a fee of 4.90 € + 0.25% on every trade.` },
  { target: "submit", title: "First trade", text: "It's play money.", task: "Place the order.", done: (c) => c.holdings > 0 },
  { target: "news", title: "News", text: "Most headlines are noise. Some are already priced in." },
  { target: "rivals", title: "Rivals", text: "Bots trade the same market. Open this tab and guess if their trades work." },
  { target: "time", title: "Time", text: "Big news pauses the game.", task: "Press Play.", done: (c) => c.speed > 0 },
];

/** One empty-state style for every list and panel in the trading screen. */
function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={44} round />
      <strong>{title}</strong>
      <span>{hint}</span>
    </div>
  );
}

export default function Simulator({ tour = false }: { tour?: boolean }) {
  const { addXP, finishTour } = useProgress();
  const [m, setM] = useState<Market>(() => createMarket(42, COMPANIES));
  const [selected, setSelected] = useState("AAPL");
  const [side, setSide] = useState<Side>("buy");
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<OrderType>("market");
  const [limit, setLimit] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [speed, setSpeed] = useState(0);
  const [pace, setPace] = useState(1); // speed to resume with
  const [breaking, setBreaking] = useState<News | null>(null);
  const [step, setStep] = useState(tour ? 0 : -1);
  const [claimed, setClaimed] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [tab, setTab] = useState<"news" | "rivals">("news");
  const [bookTab, setBookTab] = useState<"positions" | "orders">("positions");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const rewarded = useRef(new Set<number>());

  // First visit to the platform: run the tour on this screen.
  useEffect(() => { if (!tour && !tourDone()) setStep(0); }, [tour]);

  // "New market +" lives in the platform nav and signals via a window event.
  useEffect(() => {
    const onNew = () => restart();
    window.addEventListener("cd-new-market", onNew);
    return () => window.removeEventListener("cd-new-market", onNew);
  });

  // Clock
  useEffect(() => {
    if (!SPEEDS[speed].ms) return;
    const id = window.setInterval(() => setM((prev) => tick(prev)), SPEEDS[speed].ms);
    return () => window.clearInterval(id);
  }, [speed]);

  // Auto-pause on big news; stop at the end. Not during the tour.
  useEffect(() => {
    if (m.day >= m.days) { setSpeed(0); return; }
    const big = m.news.find((n) => n.day === m.day && n.major);
    if (big && step < 0 && m.day > 0) { setSpeed(0); setBreaking(big); }
  }, [m.day, m.days, m.news, step]);

  // XP for correct guesses on bot trades
  useEffect(() => {
    for (const c of m.calls) {
      if (c.result && c.guess !== undefined && !rewarded.current.has(c.id)) {
        rewarded.current.add(c.id);
        if (c.guess === c.result.right) addXP(10);
      }
    }
  }, [m.calls, addXP]);

  const price = priceOf(m, selected);
  const prevPrice = priceOf(m, selected, Math.max(0, m.day - 1));
  const holding = m.player.holdings[selected];
  const total = valueOf(m, m.player);
  const execPrice = round2(side === "buy" ? price * (1 + SPREAD) : price * (1 - SPREAD));
  const volume = round2(execPrice * (qty || 0));
  const orderFee = fee(volume);
  const ctx: Ctx = { selected, qty, holdings: Object.keys(m.player.holdings).length, speed, side, type };
  const visibleNews = useMemo(() => m.news.filter((n) => n.day <= m.day).slice(-40).reverse(), [m.news, m.day]);
  const board = useMemo(() => [m.player, ...m.bots].map((t) => ({ t, value: valueOf(m, t), ret: (valueOf(m, t) / t.values[0] - 1) * 100 })).sort((a, b) => b.ret - a.ret) /* by return, so top-ups don't buy first place */, [m]);
  const calls = m.calls.slice(-5).reverse();
  const ended = m.day >= m.days;
  const today = tradingDate(m.day);

  function submit() {
    const res = placeOrder(m, { sym: selected, side, qty, type, limit: Number(limit) });
    setErr(res.error);
    if (!res.error) setM(res.m);
  }

  function nextTourStep() {
    if (!tourDone()) addXP(10); // replaying the tour earns nothing
    if (step + 1 >= TOUR.length) { setStep(-1); finishTour(); }
    else setStep(step + 1);
  }

  function restart() {
    setM(createMarket(Math.floor(Math.random() * 1e6), COMPANIES));
    setClaimed(false); setSpeed(0); rewarded.current.clear();
  }

  const pl = total - m.player.values[0];
  const openCalls = m.calls.filter((c) => !c.result && c.guess === undefined).length;
  const positions = Object.entries(m.player.holdings);
  const company = COMPANIES.find((c) => c.sym === selected)!;
  const q = query.trim().toLowerCase();
  const results = q ? COMPANIES.filter((c) => [c.name, c.sym, c.wkn].some((f) => f.toLowerCase().includes(q))) : COMPANIES;
  const pick = (sym: string) => { setSelected(sym); setErr(null); setQuery(""); setSearchOpen(false); (document.activeElement as HTMLElement | null)?.blur(); };
  const times = useMemo(() => Array.from({ length: m.days + 1 }, (_, d) => tradingDate(d).toISOString().slice(0, 10)), [m.days]);
  const myTrades = useMemo(() => m.player.trades.filter((t) => t.sym === selected).map((t) => ({ i: t.day, side: t.side, label: `${t.side === "buy" ? "B" : "S"} ${t.qty}` })), [m.player.trades, selected]);

  return (
    <div className="trade">
      <div className="trade-grid">
        {/* Left: time controls, then news + rivals */}
        <div className="trade-col">
          <div className="clock" data-tour="time">
            <button className="play-btn" onClick={() => setSpeed(speed ? 0 : pace)} disabled={ended} aria-label={speed ? "Pause" : "Play"}>
              <Icon name={speed ? "pause" : "play"} size={16} />
            </button>
            <div className="clock-date">
              <strong>{fmtDate(today, { weekday: "short", day: "numeric", month: "short" })}</strong>
              <span className="xs muted num">Week {Math.floor(m.day / 5) + 1} of {Math.ceil(m.days / 5)}</span>
            </div>
            <div className="seg" role="group" aria-label="Speed">
              {[1, 2].map((i) => (
                <button key={i} aria-pressed={pace === i} onClick={() => { setPace(i); if (speed) setSpeed(i); }}>{SPEEDS[i].label}</button>
              ))}
            </div>
          </div>
          <section className="panel p-feed" aria-label="News and rivals">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === "news"} onClick={() => setTab("news")} data-tour="news">News</button>
              <button role="tab" aria-selected={tab === "rivals"} onClick={() => setTab("rivals")} data-tour="rivals">Rivals {openCalls > 0 && <span className="count hot">{openCalls}</span>}</button>
            </div>
            <div className="panel-body">
              {tab === "news" && (
                <div className="news" aria-live="polite">
                  {visibleNews.length === 0 && <EmptyState icon="hanna" title="No news yet" hint="Press play — headlines arrive day by day." />}
                  {visibleNews.map((n) => (
                    <div key={n.id} className={`news-item ${n.major ? "major" : ""} ${n.day === m.day ? "fresh" : ""}`}>
                      <div className="xs muted">Day {n.day}{n.sym ? ` · ${nameOf(n.sym)}` : ""}</div>
                      {n.headline}
                    </div>
                  ))}
                </div>
              )}
              {tab === "rivals" && (
                <div className="rivals">
                  <table className="table">
                    <tbody>
                      {board.map(({ t, value, ret }, i) => (
                        <tr key={t.id} aria-selected={t.id === "you"}>
                          <td className="num xs">{i + 1}</td>
                          <td className="small"><Icon name={t.id} size={28} round /> {t.name}</td>
                          <td className={`r num small ${cls(ret)}`} title={eur(value)}>{pct(ret)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="stack" style={{ gap: "var(--space-3)" }}>
                    <h3>Mistake Cam</h3>
                    {calls.length === 0 && <EmptyState icon="max" title="No rival trades yet" hint="When a bot trades on news, guess if it works." />}
                    {calls.map((c) => {
                      const b = botMeta(c.bot);
                      const news = m.news.find((n) => n.id === c.newsId);
                      const concept = conceptById(news?.concept ?? b.concept);
                      return (
                        <div key={c.id} className="call">
                          <div><Icon name={b.id} size={32} round /> <strong>{b.name}</strong> {c.side === "buy" ? "bought" : "sold"} {nameOf(c.sym)} @ {eur(c.price)} <span className="xs muted">· day {c.day}</span></div>
                          <div className="xs muted">{c.reason}</div>
                          {!c.result && c.guess === undefined && (
                            <div className="row">
                              <span className="xs">Will this work?</span>
                              <button className="btn btn-outline btn-sm" onClick={() => setM(guessCall(m, c.id, true))}>✓ Yes</button>
                              <button className="btn btn-outline btn-sm" onClick={() => setM(guessCall(m, c.id, false))}>✗ No</button>
                            </div>
                          )}
                          {!c.result && c.guess !== undefined && <div className="xs muted">Result in {c.day + 10 - m.day} days</div>}
                          {c.result && (
                            <div className="small">
                              <strong className={c.result.right ? "up" : "down"}>{c.result.right ? "✓ Worked" : "✗ Failed"}</strong> · {eur(c.result.price)}
                              {c.guess === c.result.right && <span className="badge" style={{ marginLeft: "var(--space-3)" }}>+10 XP</span>}
                              {news && <p className="xs muted">{news.explain}</p>}
                              {concept && <Link className="xs" href={`/learn/${concept.id}`}>{concept.title} →</Link>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Center: stock search + chart of the selected stock */}
        <div className="trade-col">
          <section className="panel p-search" aria-label="Search stocks">
            <div className="search" data-tour="pricelist">
              <input type="search" placeholder="Search stocks — name, ticker or WKN" value={query} aria-label="Search stocks"
                onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onBlur={() => setSearchOpen(false)}
                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) pick(results[0].sym); if (e.key === "Escape") e.currentTarget.blur(); }} />
              {searchOpen && (
                <ul className="search-results" role="listbox">
                  {results.length === 0 && <li><EmptyState icon="compass" title="No stock found" hint="Try a name, ticker or WKN." /></li>}
                  {results.map((c) => {
                    const p = priceOf(m, c.sym), ch = (p / priceOf(m, c.sym, Math.max(0, m.day - 1)) - 1) * 100;
                    return (
                      <li key={c.sym}>
                        <button className="watch-row" role="option" aria-selected={c.sym === selected} onMouseDown={(e) => { e.preventDefault(); pick(c.sym); }}>
                          <span className="watch-name"><strong>{c.name}</strong><span className="xs muted">{c.sym} · WKN {c.wkn}</span></span>
                          <span className="watch-price"><span className="num">{eur(p)}</span><span className={`chg num ${cls(ch)}`}>{pct(ch)}</span></span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
          <section className="panel p-chart" data-tour="detail" aria-label="Chart">
            <div className="chart-head">
              <div>
                <h2>{company.name}</h2>
                <div className="xs muted">{company.sym} · WKN {company.wkn} · {company.sector}</div>
              </div>
              <div className="chart-price">
                <strong className="num">{eur(price)}</strong>
                <span className={`chg num ${cls(price - prevPrice)}`}>{pct((price / prevPrice - 1) * 100)}</span>
              </div>
            </div>
            <div className="chart-body">
              {m.day === 0 && <div className="chart-empty"><EmptyState icon="play" title="Market not started" hint="Press play — the chart draws itself day by day." /></div>}
              <CandleChart sym={selected} prices={m.prices[selected]} times={times} trades={myTrades} />
            </div>
          </section>
        </div>

        {/* Right: account, order ticket, positions/orders */}
        <div className="trade-col">
          <div className="acct" data-tour="depot">
            <div className="acct-main"><span>Total value</span><strong className="num">{eur(total)}</strong></div>
            <div className="acct-sub xs num">
              <span>Cash <b>{eur(m.player.cash)}</b></span>
              <span>P/L <b className={cls(pl)}>{eur(pl)} ({pct((total / m.player.values[0] - 1) * 100)})</b></span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setTopUpOpen(true)}>Top up +</button>
          </div>
          <section className="panel p-order" data-tour="order" aria-label="Order">
            <div className="ticket">
              <div className="side-toggle" role="group" aria-label="Buy or sell" data-tour="side">
                <button className="buy" aria-pressed={side === "buy"} onClick={() => setSide("buy")}>Buy</button>
                <button className="sell" aria-pressed={side === "sell"} onClick={() => setSide("sell")}>Sell</button>
              </div>
              <div className="order-grid">
                <label className="field" data-tour="qty">Quantity
                  <input type="number" min={1} step={1} value={qty || ""} onChange={(e) => setQty(Math.floor(Number(e.target.value)))} />
                </label>
                <label className="field" data-tour="ordertype">Order type
                  <select value={type} onChange={(e) => setType(e.target.value as OrderType)}>
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                    <option value="stop">Stop</option>
                  </select>
                </label>
                {type !== "market" && (
                  <label className="field" style={{ gridColumn: "1 / -1" }}>{type === "limit" ? "Limit price (€)" : "Stop price (€)"}
                    <input type="number" min={0} step={0.01} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={price.toFixed(2)} />
                  </label>
                )}
              </div>
              <div data-tour="costs">
                <div className="kv"><span className="muted">Price ({side === "buy" ? "ask" : "bid"})</span><span className="num">{eur(execPrice)}</span></div>
                <div className="kv"><span className="muted">Fee</span><span className="num">{eur(orderFee)}</span></div>
                <div className="kv total"><strong>{side === "buy" ? "Total" : "You receive"}</strong><strong className="num">{eur(side === "buy" ? volume + orderFee : volume - orderFee)}</strong></div>
                <div className="kv xs muted">{side === "buy" ? <><span>Available</span><span className="num">{eur(m.player.cash)}</span></> : <><span>You own</span><span className="num">{holding?.qty ?? 0}</span></>}</div>
              </div>
              {err && <p className="error" role="alert">{err}</p>}
              <button className={`btn btn-lg ${side === "buy" ? "btn-primary" : "btn-dark"}`} data-tour="submit" onClick={submit} disabled={ended}>
                {side === "buy" ? "Buy" : "Sell"} {qty || 0} × {company.name}
              </button>
            </div>
          </section>

          <section className="panel p-book" aria-label="Positions and orders">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={bookTab === "positions"} onClick={() => setBookTab("positions")}>Positions <span className="count">{positions.length}</span></button>
              <button role="tab" aria-selected={bookTab === "orders"} onClick={() => setBookTab("orders")}>Orders <span className="count">{m.orders.length}</span></button>
            </div>
            <div className="panel-body">
              {bookTab === "positions" && (positions.length === 0 ? <EmptyState icon="chart" title="No positions yet" hint="Buy a stock above and it shows up here." /> : positions.map(([sym, h]) => {
                const v = h.qty * priceOf(m, sym);
                return (
                  <button key={sym} className="watch-row" aria-pressed={sym === selected} onClick={() => setSelected(sym)}>
                    <span className="watch-name"><strong>{nameOf(sym)}</strong><span className="xs muted num">{h.qty} × {eur(h.cost / h.qty)}</span></span>
                    <span className="watch-price"><span className="num">{eur(v)}</span><span className={`chg num ${cls(v - h.cost)}`}>{eur(v - h.cost)}</span></span>
                  </button>
                );
              }))}
              {bookTab === "orders" && (m.orders.length === 0 ? <EmptyState icon="hourglass" title="No open orders" hint="Limit and stop orders wait here until their price is hit." /> : m.orders.map((o) => (
                <div key={o.id} className="watch-row">
                  <span className="watch-name"><strong>{o.side === "buy" ? "Buy" : "Sell"} {o.qty}× {nameOf(o.sym)}</strong><span className="xs muted">{o.type} @ {eur(o.limit)}</span></span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setM(cancelOrder(m, o.id))}>Cancel</button>
                </div>
              )))}
            </div>
          </section>
        </div>
      </div>

      {breaking && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Breaking news">
          <div className="modal">
            <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>Breaking</span>
            <h2>{breaking.headline}</h2>
            <div className="row">
              {breaking.sym && (
                <>
                  <button className="btn btn-primary" onClick={() => { setSelected(breaking.sym!); setSide("buy"); setBreaking(null); }}>Buy {nameOf(breaking.sym)}</button>
                  <button className="btn btn-outline" onClick={() => { setSelected(breaking.sym!); setSide("sell"); setBreaking(null); }}>Sell {nameOf(breaking.sym)}</button>
                </>
              )}
              <button className="btn btn-dark" onClick={() => { setBreaking(null); setSpeed(pace); }}>Hold</button>
            </div>
          </div>
        </div>
      )}

      {topUpOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Top up play money" onClick={() => setTopUpOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Top up play money</h2>
            <p className="small muted">Added to your cash. It doesn&apos;t count as profit.</p>
            <div className="row">
              {[1000, 5000, 10000].map((a) => (
                <button key={a} className="btn btn-outline" onClick={() => { setM(topUp(m, a)); setTopUpOpen(false); }}>+{eur(a)}</button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setTopUpOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {ended && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Round debrief">
          <div className="modal modal-wide">
            <h2>Debrief</h2>
            <p className="xs muted">Score = return − ½ worst drop</p>
            <LineChart series={m.bots.map((t, i) => ({ values: t.values, color: lineColor(t.id, i), label: t.name, width: 1.5 }))
              .concat({ values: m.player.values, color: lineColor("you", 0), label: "You", width: 4 })} />
            <div className="row xs">
              {[m.player, ...m.bots].map((t, i) => (
                <span key={t.id}><span aria-hidden style={{ display: "inline-block", width: 12, height: 4, background: lineColor(t.id, i - 1), marginRight: 4, verticalAlign: "middle" }} />{t.name}</span>
              ))}
            </div>
            <table className="table">
              <thead><tr><th>Trader</th><th className="r">Final value</th><th className="r">Trades</th><th className="r">Fees paid</th><th className="r">Score</th></tr></thead>
              <tbody>
                {[...board].sort((a, b) => riskScore(b.t.values) - riskScore(a.t.values)).map(({ t, value }) => (
                  <tr key={t.id} aria-selected={t.id === "you"}>
                    <td><Icon name={t.id} size={32} round /> {t.name}{t.id !== "you" && <div className="xs muted">{botMeta(t.id).habit}</div>}</td>
                    <td className="r num">{eur(value)}</td>
                    <td className="r num">{t.trades.length}</td>
                    <td className="r num">{eur(t.trades.reduce((s, x) => s + x.fee, 0))}</td>
                    <td className="r num"><strong>{riskScore(t.values)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>What the news meant</h3>
            <div className="stack" style={{ gap: "var(--space-3)" }}>
              {m.news.filter((n) => n.major).map((n) => (
                <div key={n.id} className="news-item major">
                  <div className="xs muted">Day {n.day} · {n.kind.replace("_", " ")}</div>
                  {n.headline}
                  <div className="xs muted" style={{ fontWeight: 400 }}>{n.explain}</div>
                </div>
              ))}
            </div>
            <div className="row">
              <button className="btn btn-primary" disabled={claimed} onClick={() => { addXP(50); setClaimed(true); }}>{claimed ? "+50 XP collected" : "Collect 50 XP"}</button>
              <button className="btn btn-outline" onClick={restart}>New market</button>
            </div>
          </div>
        </div>
      )}

      {step >= 0 && (
        <CoachMark step={TOUR[step]} index={step} total={TOUR.length}
          canNext={!TOUR[step].done || TOUR[step].done!(ctx)}
          onNext={nextTourStep} onSkip={() => { setStep(-1); finishTour(0); /* skipped = seen: no auto-start next time */ }} />
      )}
    </div>
  );
}
