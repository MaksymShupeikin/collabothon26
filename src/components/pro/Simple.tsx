"use client";
import { useEffect, useMemo, useState } from "react";
import { companyOf, type Company } from "@/lib/data/companies";
import { cls, eur, pct, qtyFmt } from "@/lib/format";
import { setUi } from "@/lib/game/ui";
import type { News } from "@/lib/news";
import { ask, bid, dateOf, depotValue, fee, priceAt, round2, type OrderInput, type OrderType, type Side, type Sim, type Universe } from "@/lib/sim/engine";
import type { Replay } from "@/lib/sim/scenarios";
import CandleChart, { type TradeMark } from "../CandleChart";
import Header from "../Header";
import Icon from "../Icon";
import { MistakeCam, useBoard } from "./ReplayParts";

/**
 * The simple trading area (the trading screen from main): one screen, three columns.
 * World 2 runs here; ProTrader takes over from World 3, once the learner confirms the switch.
 * Same market, same depot, same replays as ProTrader: only the layout is simpler.
 */
const PACES = [{ speed: 1, label: "1 day/s" }, { speed: 5, label: "1 week/s" }];
const TOPUP_MAX = 100_000; // keeps play money in a realistic range for a beginner depot

export type SimpleProps = {
  sim: Sim; u: Universe; comps: Company[]; sym: string; setSym: (s: string) => void;
  cover: (s: string) => string; coverWkn: (s: string) => string;
  speed: number; setSpeed: (s: number) => void; ended: boolean;
  closes: number[]; firstDay: number; label: (d: number) => string; news: News[];
  breaking: News | null; clearBreaking: () => void; freePlay: boolean;
  order: (o: OrderInput) => { error: string | null }; cancel: (id: number) => void; addMoney: (a: number) => void;
  replay?: Replay; answers: Record<string, number>;
};

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

export default function SimpleDesk(p: SimpleProps) {
  const { sim, u, comps, sym, setSym, cover, coverWkn, speed, setSpeed, ended, closes, firstDay, label, news, breaking, replay } = p;
  const [pace, setPace] = useState(1); // speed to resume with
  const [side, setSide] = useState<Side>("buy");
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<OrderType>("market");
  const [limit, setLimit] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"news" | "rivals">("news");
  const [bookTab, setBookTab] = useState<"positions" | "orders">("positions");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmt, setTopUpAmt] = useState(5000);
  const [topUpCustom, setTopUpCustom] = useState("");

  // The guided tour reads what the learner does on the ticket.
  useEffect(() => { setUi({ orderSide: side, qty }); }, [side, qty]);
  useEffect(() => () => setUi({ orderSide: undefined, qty: undefined }), []);

  const day = sim.day;
  const priceOf = (s: string, d = day) => priceAt(u, s, d);
  const masked = (s: string) => cover(s) !== companyOf(s).short; // replay hero before the reveal
  const price = priceOf(sym), prevPrice = priceOf(sym, day - 1);
  const company = companyOf(sym);
  const holding = sim.acct.holdings[sym];
  const total = round2(sim.acct.cash + depotValue(sim));
  const paidIn = sim.acct.deposits.slice(0, day + 1).filter((x) => x !== undefined && x !== null).at(-1) ?? 0;
  const pl = round2(total - paidIn);
  const execPrice = side === "buy" ? ask(price) : bid(price);
  const volume = round2(execPrice * (qty || 0));
  const orderFee = qty ? fee(volume) : 0;
  const positions = Object.entries(sim.acct.holdings);
  const orders = sim.acct.orders;
  const q = query.trim().toLowerCase();
  const results = q ? comps.filter((c) => [cover(c.sym), masked(c.sym) ? "" : c.sym, coverWkn(c.sym)].some((f) => f.toLowerCase().includes(q))) : comps;
  const pick = (s: string) => { setSym(s); setErr(null); setQuery(""); setSearchOpen(false); (document.activeElement as HTMLElement | null)?.blur(); };

  // Chart: one candle per trading day; replays label the axis "Day n" instead of a date.
  const times = useMemo(() => closes.map((_, i) => dateOf(u, firstDay + i).toISOString().slice(0, 10)), [closes, u, firstDay]);
  const format = useMemo(() => {
    if (!u.hideDate) return undefined;
    const byIso = new Map(times.map((t, i) => [t, label(firstDay + i)]));
    return (t: string) => byIso.get(t) ?? "";
  }, [u.hideDate, times, label, firstDay]);
  const myTrades: TradeMark[] = useMemo(() => sim.acct.trades.filter((t) => t.sym === sym).map((t) => ({ i: t.day - firstDay, side: t.side, label: `${t.side === "buy" ? "B" : "S"} ${qtyFmt(t.qty)}` })), [sim.acct.trades, sym, firstDay]);

  const today = dateOf(u, day);
  const play = () => { p.clearBreaking(); setSpeed(speed ? 0 : pace); };

  function submit() {
    const res = p.order({ sym, side, qty, type, limit: Number(limit), validity: "max", exchange: "Xetra" });
    setErr(res.error);
  }

  return (
    <>
      <Header />
      <div className="trade">
        <div className="trade-grid">
          {/* Left: time controls, then news + rivals */}
          <div className="trade-col">
            <div className="clock" data-tour="time-machine">
              <button className="play-btn" onClick={play} disabled={ended} aria-label={speed ? "Pause" : "Play"}>
                <Icon name={speed ? "pause" : "play"} size={16} />
              </button>
              <div className="clock-date">
                <strong>{u.hideDate ? `Day ${day + 1}` : today.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</strong>
                <span className="xs muted num">Week {Math.floor(day / 5) + 1} of {Math.ceil(u.days / 5)}</span>
              </div>
              <div className="seg" role="group" aria-label="Speed">
                {PACES.map((x) => (
                  <button key={x.speed} aria-pressed={pace === x.speed} onClick={() => { setPace(x.speed); if (speed) setSpeed(x.speed); }}>{x.label}</button>
                ))}
              </div>
            </div>
            <section className="panel p-feed" aria-label="News and rivals" data-tour="w-news">
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === "news"} onClick={() => setTab("news")}>News</button>
                <button role="tab" aria-selected={tab === "rivals"} onClick={() => setTab("rivals")}>Rivals {replay && <span className="count hot">{replay.bots.length}</span>}</button>
              </div>
              <div className="panel-body">
                {tab === "news" && (
                  <div className="news" aria-live="polite">
                    {news.length === 0 && <EmptyState icon="hanna" title="No news yet" hint="Press play — headlines arrive day by day." />}
                    {news.map((n) => (
                      <div key={n.id} className={`news-item ${n.major ? "major" : ""} ${n.day === day ? "fresh" : ""}`}>
                        <div className="xs muted">{label(n.day)}{n.sym ? ` · ${cover(n.sym)}` : ""}</div>
                        {n.headline}
                      </div>
                    ))}
                  </div>
                )}
                {tab === "rivals" && (replay
                  ? <ReplayRivals replay={replay} sim={sim} answers={p.answers} cover={cover} />
                  : <EmptyState icon="max" title="No rivals in this market" hint="Rival bots trade with you in the historical replays." />)}
              </div>
            </section>
          </div>

          {/* Center: stock search + chart of the selected stock */}
          <div className="trade-col">
            <section className="panel p-search" aria-label="Search stocks" data-tour="w-search">
              <div className="search">
                <input type="search" placeholder="Search stocks — name, ticker or WKN" value={query} aria-label="Search stocks"
                  onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onBlur={() => setSearchOpen(false)}
                  onKeyDown={(e) => { if (e.key === "Enter" && results[0]) pick(results[0].sym); if (e.key === "Escape") e.currentTarget.blur(); }} />
                {searchOpen && (
                  <ul className="search-results" role="listbox">
                    {results.length === 0 && <li><EmptyState icon="compass" title="No stock found" hint="Try a name, ticker or WKN." /></li>}
                    {results.map((c) => {
                      const pr = priceOf(c.sym), ch = (pr / priceOf(c.sym, day - 1) - 1) * 100;
                      return (
                        <li key={c.sym}>
                          <button className="watch-row" role="option" aria-selected={c.sym === sym} onMouseDown={(e) => { e.preventDefault(); pick(c.sym); }}>
                            <span className="watch-name"><strong>{cover(c.sym)}</strong><span className="xs muted">{masked(c.sym) ? "" : `${c.sym} · `}WKN {coverWkn(c.sym)}</span></span>
                            <span className="watch-price"><span className="num">{eur(pr)}</span><span className={`chg num ${cls(ch)}`}>{pct(ch)}</span></span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
            <section className="panel p-chart" data-tour="w-chart" aria-label="Chart">
              <div className="chart-head">
                <div>
                  <h2>{cover(sym)}</h2>
                  <div className="xs muted">{masked(sym) ? "" : `${sym} · `}WKN {coverWkn(sym)} · {company.sector}</div>
                </div>
                <div className="chart-price">
                  <strong className="num">{eur(price)}</strong>
                  <span className={`chg num ${cls(price - prevPrice)}`}>{pct((price / prevPrice - 1) * 100)}</span>
                </div>
              </div>
              <div className="chart-body">
                <CandleChart sym={sym} prices={closes} times={times} trades={myTrades} format={format} />
              </div>
            </section>
          </div>

          {/* Right: account, order ticket, positions/orders */}
          <div className="trade-col">
            <div className="acct" data-tour="w-account">
              <div className="acct-main"><span>Total value</span><strong className="num">{eur(total)}</strong></div>
              <div className="acct-sub xs num">
                <span>Cash <b>{eur(sim.acct.cash)}</b></span>
                <span>P/L <b className={cls(pl)}>{eur(pl)} ({pct(paidIn ? (pl / paidIn) * 100 : 0)})</b></span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setTopUpOpen(true)}>Top up +</button>
            </div>
            <section className="panel p-order" data-tour="w-ticket" aria-label="Order">
              <div className="ticket">
                <div className="side-toggle" role="group" aria-label="Buy or sell">
                  <button className="buy" aria-pressed={side === "buy"} onClick={() => setSide("buy")}>Buy</button>
                  <button className="sell" aria-pressed={side === "sell"} onClick={() => setSide("sell")}>Sell</button>
                </div>
                <div className="order-grid">
                  <label className="field">Quantity
                    <input type="number" min={1} step={1} value={qty || ""} onChange={(e) => setQty(Math.floor(Number(e.target.value)))} />
                  </label>
                  <label className="field">Order type
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
                <div>
                  <div className="kv"><span className="muted">Price ({side === "buy" ? "ask" : "bid"})</span><span className="num">{eur(execPrice)}</span></div>
                  <div className="kv"><span className="muted">Fee</span><span className="num">{eur(orderFee)}</span></div>
                  <div className="kv total"><strong>{side === "buy" ? "Total" : "You receive"}</strong><strong className="num">{eur(side === "buy" ? volume + orderFee : volume - orderFee)}</strong></div>
                  {side === "sell" && <div className="kv xs muted"><span>You own</span><span className="num">{qtyFmt(holding?.qty ?? 0)}</span></div>}
                </div>
                {err && <p className="error" role="alert">{err}</p>}
                <button className={`btn btn-lg ${side === "buy" ? "btn-primary" : "btn-dark"}`} onClick={submit} disabled={ended}>
                  {side === "buy" ? "Buy" : "Sell"} {qty || 0} × {cover(sym)}
                </button>
              </div>
            </section>

            <section className="panel p-book" aria-label="Positions and orders" data-tour="w-depot">
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={bookTab === "positions"} onClick={() => setBookTab("positions")}>Positions <span className="count">{positions.length}</span></button>
                <button role="tab" aria-selected={bookTab === "orders"} onClick={() => setBookTab("orders")}>Orders <span className="count">{orders.length}</span></button>
              </div>
              <div className="panel-body">
                {bookTab === "positions" && (positions.length === 0 ? <EmptyState icon="chart" title="No positions yet" hint="Buy a stock above and it shows up here." /> : positions.map(([s, h]) => {
                  const v = h.qty * priceOf(s);
                  return (
                    <button key={s} className="watch-row" aria-pressed={s === sym} onClick={() => setSym(s)}>
                      <span className="watch-name"><strong>{cover(s)}</strong><span className="xs muted num">{qtyFmt(h.qty)} × {eur(h.cost / h.qty)}</span></span>
                      <span className="watch-price"><span className="num">{eur(v)}</span><span className={`chg num ${cls(v - h.cost)}`}>{eur(v - h.cost)}</span></span>
                    </button>
                  );
                }))}
                {bookTab === "orders" && (orders.length === 0 ? <EmptyState icon="hourglass" title="No open orders" hint="Limit and stop orders wait here until their price is hit." /> : orders.map((o) => (
                  <div key={o.id} className="watch-row">
                    <span className="watch-name"><strong>{o.side === "buy" ? "Buy" : "Sell"} {qtyFmt(o.qty)}× {cover(o.sym)}</strong><span className="xs muted">{o.type} @ {eur(o.limit)}</span></span>
                    <button className="btn btn-ghost btn-sm" onClick={() => p.cancel(o.id)}>Cancel</button>
                  </div>
                )))}
              </div>
            </section>
          </div>
        </div>

        {/* Free play only: chapters and missions bring their own questions on big news. */}
        {breaking && p.freePlay && (
          <div className="overlay" role="dialog" aria-modal="true" aria-label="Breaking news">
            <div className="modal">
              <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>Breaking</span>
              <h2>{breaking.headline}</h2>
              <div className="row">
                {breaking.sym && (
                  <>
                    <button className="btn btn-primary" onClick={() => { setSym(breaking.sym!); setSide("buy"); p.clearBreaking(); }}>Buy {cover(breaking.sym)}</button>
                    <button className="btn btn-outline" onClick={() => { setSym(breaking.sym!); setSide("sell"); p.clearBreaking(); }}>Sell {cover(breaking.sym)}</button>
                  </>
                )}
                <button className="btn btn-dark" onClick={() => { p.clearBreaking(); setSpeed(pace); }}>Hold</button>
              </div>
            </div>
          </div>
        )}

        {topUpOpen && (() => {
          const amount = topUpCustom ? Number(topUpCustom) : topUpAmt;
          const valid = Number.isInteger(amount) && amount >= 1 && amount <= TOPUP_MAX;
          const close = () => { setTopUpOpen(false); setTopUpCustom(""); };
          return (
            <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="topup-title" onClick={close}>
              <div className="modal topup" onClick={(e) => e.stopPropagation()}>
                <h2 id="topup-title">Add play money</h2>
                <p className="small muted">Practice money only. It doesn&apos;t count as profit.</p>
                <div className="topup-amounts" role="radiogroup" aria-label="Amount">
                  {[1000, 5000, 10000].map((a) => (
                    <button key={a} role="radio" aria-checked={!topUpCustom && topUpAmt === a} className="topup-amount num" onClick={() => { setTopUpAmt(a); setTopUpCustom(""); }}>+{eur(a)}</button>
                  ))}
                </div>
                <label className="field">
                  <span className="xs muted">Or enter an amount (max {eur(TOPUP_MAX)})</span>
                  <span className="input-prefix">
                    <span aria-hidden>€</span>
                    <input type="number" inputMode="numeric" min={1} max={TOPUP_MAX} step={1} placeholder="e.g. 2500" value={topUpCustom}
                      aria-invalid={!!topUpCustom && !valid} onChange={(e) => setTopUpCustom(e.target.value)} />
                  </span>
                </label>
                {topUpCustom && !valid && <p className="error" role="alert">Enter a whole amount from 1 to {eur(TOPUP_MAX)}.</p>}
                <div className="topup-sum">
                  <div className="kv"><span className="muted">Cash now</span><span className="num">{eur(sim.acct.cash)}</span></div>
                  <div className="kv total"><strong>Cash after</strong><strong className="num">{valid ? eur(sim.acct.cash + amount) : "—"}</strong></div>
                </div>
                <div className="row topup-actions">
                  <button className="btn btn-ghost" onClick={close}>Cancel</button>
                  <button className="btn btn-primary" disabled={!valid} onClick={() => { p.addMoney(amount); close(); }}>{valid ? `Add ${eur(amount)}` : "Add"}</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}

/** Rivals tab in a replay: the same scores and Mistake Cam as ProTrader, in the simple screen's table. */
function ReplayRivals({ replay, sim, answers, cover }: { replay: Replay; sim: Sim; answers: Record<string, number>; cover: (s: string) => string }) {
  const board = useBoard(replay, sim);
  return (
    <div className="rivals">
      <table className="table">
        <tbody>
          {board.map((r, i) => (
            <tr key={r.id} aria-selected={r.id === "you"}>
              <td className="num xs">{i + 1}</td>
              <td className="small"><Icon name={r.id} size={28} round /> {r.name}</td>
              <td className={`r num small ${cls(r.ret)}`}>{pct(r.ret)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <h3>Mistake Cam</h3>
        <MistakeCam replay={replay} sim={sim} answers={answers} name={cover} compact />
      </div>
    </div>
  );
}
