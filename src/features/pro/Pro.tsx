"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { companyOf, ETF_SYM } from "@/features/market/companies";
import { cls, dateDE, eur, num, pct, qtyFmt, shortDay, signed } from "@/shared/lib/format";
import { KIND_LABEL, type News } from "@/features/market/news";
import { chapterById, worldOpen, type Chapter } from "@/features/tour/chapters";
import { PERSONAS } from "@/features/game/personas";
import { actions, getSave, proTraderOffered, useGame } from "@/features/game/store";
import { setUi } from "@/features/game/ui";
import { addPlan, advance, deposit, ask, bid, cancelOrder, companiesOf, costBasis, dateOf, depotValue, fee, placeOrder, pricesOf, priceAt, round2, universeOf, type OrderInput, type OrderType, type Sim, type SimEvent, type Validity, newSim } from "@/features/market/engine";
import { REPLAYS, SIM_LESSONS, type BotMove, type Replay } from "@/features/market/scenarios";
import Icon from "@/shared/ui/Icon";
import SandboxBar from "@/features/shell/SandboxBar";
import ConceptCard from "@/features/learn/ConceptCard";
import TourRunner from "@/features/tour/TourRunner";
import { Wordmark } from "@/shared/ui/Wordmark";
import ProChart, { type ChartMark } from "@/features/pro/ProChart";
import Widget from "@/features/pro/Widget";
import { BotBubble, DecisionCard, RevealModal, Rivals, SpotCard, BossIntro } from "@/features/pro/ReplayParts";
import SimpleDesk from "@/features/pro/Simple";
import { BOTS } from "@/features/market/bots";

export type Mode =
  | { kind: "main" }
  | { kind: "lesson"; id: string }
  | { kind: "replay"; replay: Replay };

const BUDGET = 1000; // replays and simulated lessons: the same round budget for you and the bots (scores are in %)
const TIME = "17:35:00";

export default function Pro() {
  const save = useGame();
  const ch = save.active ? chapterById(save.active) : undefined;
  const pro = ch?.surface === "pro" ? ch : undefined;
  if (!save.persona) return <Gate text="Answer three quick questions first." href="/start" cta="Start" />;
  if (!save.proUnlocked && !save.allUnlocked) return <Gate text="The trading area unlocks after the World 1 mission: your first stock." href="/" cta="Learning map" />;
  const mode: Mode = pro?.replay ? { kind: "replay", replay: REPLAYS[pro.replay] } : pro?.lesson ? { kind: "lesson", id: SIM_LESSONS[pro.lesson as keyof typeof SIM_LESSONS].id } : { kind: "main" };
  // The learner starts on the simple trading area. World 2 always runs there; ProTrader takes over
  // from World 3 (and in free play) only after the learner has confirmed the switch.
  const layout: Layout = pro?.world === 2 || !save.proTrader ? "simple" : "pro";
  const offerSwitch = proTraderOffered(save) && !save.proTrader && pro?.world !== 2;
  return <Desk key={`${save.active ?? "free"}:${layout}`} mode={mode} chapter={pro} layout={layout} offerSwitch={offerSwitch} />;
}

type Layout = "simple" | "pro";

/** The move from the simple trading area to ProTrader is a moment: the learner sees what changes and confirms it. */
function ProTraderSwitch({ chapter, onLater }: { chapter?: Chapter; onLater: () => void }) {
  return (
    <div className="overlay overlay-dark" role="dialog" aria-modal="true" aria-labelledby="switch-title">
      <div className="unlock">
        <p className="unlock-kicker">World 2 complete · ProTrader unlocked</p>
        <h1 id="switch-title">Ready for the full trading desk?</h1>
        <p className="unlock-sub">{chapter ? `${chapter.n} ${chapter.title} runs in ProTrader, the workspace experienced comdirect traders use.` : "From World 3 on you trade in ProTrader, the workspace experienced comdirect traders use."} Your depot, cash and orders come with you.</p>
        <ul className="switch-list">
          <li><strong>Widgets</strong>Watchlist, depot, chart, order book and news side by side.</li>
          <li><strong>Order window</strong>The yellow Order button opens a floating ticket with exchange and validity.</li>
          <li><strong>Time machine</strong>Jump a day, a week or a month, or straight to the next event.</li>
          <li><strong>More detail</strong>Volume, indicators, and the type of each headline once prices reacted.</li>
        </ul>
        <div className="row" style={{ justifyContent: "center" }}>
          {chapter
            ? <Link className="btn btn-outline-light" href="/" onClick={() => actions.start(null)}>Not yet, back to the map</Link>
            : <button className="btn btn-outline-light" onClick={onLater}>Not yet, keep the simple view</button>}
          <button className="btn btn-primary btn-lg" onClick={() => { actions.switchToProTrader(); setUi({}); }}>Switch to ProTrader →</button>
        </div>
      </div>
    </div>
  );
}

function Gate({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="pt-gate">
      <span className="pt-logo"><Wordmark width={110} /></span>
      <p>{text}</p>
      <Link className="btn btn-primary" href={href}>{cta} ›</Link>
    </div>
  );
}

type Toast = { id: number; text: string };

function Desk({ mode, chapter, layout, offerSwitch }: { mode: Mode; chapter?: Chapter; layout: Layout; offerSwitch: boolean }) {
  const save = useGame();
  const replay = mode.kind === "replay" ? mode.replay : undefined;
  const universeId = mode.kind === "main" ? "main" : mode.kind === "lesson" ? mode.id : mode.replay.universe.id;
  const u = universeOf(universeId);
  const [local, setLocal] = useState<Sim>(() => newSim(universeId, mode.kind === "lesson" && mode.id === "w4-plan" ? 0 : BUDGET));
  const sim = mode.kind === "main" ? save.sim : local;
  const simRef = useRef(sim);
  useEffect(() => { simRef.current = sim; });
  const [startDay] = useState(sim.day);

  const comps = companiesOf(u);
  const cover = (sym: string) => (replay && sym === replay.hero && !ended(sim) ? replay.cover : companyOf(sym).short);
  const coverWkn = (sym: string) => (replay && sym === replay.hero && !ended(sim) ? replay.coverWkn : companyOf(sym).wkn);
  const [sym, setSym] = useState<string>(replay ? replay.hero : mode.kind === "lesson" && mode.id === "w4-plan" ? ETF_SYM : mode.kind === "lesson" ? ETF_SYM : "DTE");
  const [speed, setSpeed] = useState(0);
  const [orderOpen, setOrderOpen] = useState(false);
  const [breaking, setBreaking] = useState<News | null>(null);
  const [selNews, setSelNews] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expired, setExpired] = useState<SimEvent[]>([]);
  const [spot, setSpot] = useState<BotMove | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [decided, setDecided] = useState<Record<string, boolean>>({});
  const [decision, setDecision] = useState<News | null>(null);
  const [intro, setIntro] = useState(chapter?.kind === "boss");
  const [revealOpen, setRevealOpen] = useState(false);
  const [planSet, setPlanSet] = useState(sim.acct.plans.length > 0);
  const w2 = useRef({ a: 0, r: 0 }); // World 2 mission: answered / right
  const [workspace, setWorkspace] = useState<"depot" | "focus">("depot");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [later, setLater] = useState(false); // "Not yet" on the ProTrader switch (free play)
  const isEnded = ended(sim);
  const years = save.allUnlocked || worldOpen(save, 4) || (mode.kind === "lesson" && mode.id === "w4-plan");

  useEffect(() => {
    setUi({ surface: "pro", day: sim.day, dayDelta: sim.day - startDay, sym, orderOpen, speed, ended: isEnded, planSet });
  }, [sim.day, startDay, sym, orderOpen, speed, isEnded, planSet]);
  useEffect(() => () => setUi({ orderOpen: false, ended: false, planSet: false, day: 0, dayDelta: 0, w2Answered: 0, w2Right: 0 }), []);

  // ── time ──
  const toast = (text: string) => setToasts((t) => [...t.slice(-2), { id: Date.now() + Math.random(), text }]);
  function stepTime(days: number, stopAtMajor: boolean): boolean {
    const cur = simRef.current;
    let n = Math.min(days, u.days - cur.day);
    if (n <= 0) { setSpeed(0); return false; }
    // replays: stop on a bot's move with a "Spot the habit" question
    const nextMove = replay?.moves.find((m) => m.spot && m.day > cur.day && !(m.bot + m.day in answers));
    if (nextMove && (replay && mode.kind === "replay")) n = Math.min(n, nextMove.day - cur.day);
    const res = mode.kind === "main" ? { sim: null as Sim | null, events: actions.jump(n, stopAtMajor) } : advance(cur, n, { stopAtMajor });
    if (res.sim) { setLocal(res.sim); simRef.current = res.sim; } else simRef.current = getSave().sim;
    const events = res.events;
    let paused = false;
    for (const e of events) {
      if (e.kind === "fill") toast(`Your ${e.order.type} order was executed: ${e.trade.side === "buy" ? "bought" : "sold"} ${qtyFmt(e.trade.qty)} × ${cover(e.trade.sym)} at ${num(e.trade.price)} €`);
      if (e.kind === "expired") { setExpired((x) => [...x, e]); toast(`Your order for ${cover(e.order.sym)} expired without execution.`); }
      if (e.kind === "news" && stopAtMajor) {
        setBreaking(e.news); setSelNews(e.news.id); setSpeed(0); paused = true;
        if (mode.kind === "lesson" && mode.id === "w2-mission" && !decided[e.news.id]) setDecision(e.news);
      }
    }
    const day = simRef.current.day;
    const mv = replay?.moves.find((m) => m.spot && m.day === day && !(m.bot + m.day in answers));
    if (mv) { setSpot(mv); setSpeed(0); paused = true; }
    if (day >= u.days) { setSpeed(0); if (chapter?.kind === "boss" || (replay && !chapter)) setRevealOpen(true); }
    return !paused;
  }
  const stepRef = useRef(stepTime);
  useEffect(() => { stepRef.current = stepTime; });
  useEffect(() => {
    if (!speed) return;
    const id = window.setInterval(() => { if (!stepRef.current(1, true)) setSpeed(0); }, 1200 / speed);
    return () => window.clearInterval(id);
  }, [speed]);
  // Bot moves on day 0 (before any time passes) are shown right away, after the boss intro.
  const firstSpot = !intro && replay?.moves.find((m) => m.spot && m.day === 0 && !(m.bot + m.day in answers));

  // ── orders ──
  function order(o: OrderInput) {
    if (mode.kind === "main") return actions.order(o)!;
    const res = placeOrder(local, o);
    if (!res.error) { setLocal(res.sim); simRef.current = res.sim; }
    return res;
  }
  function setPlan(symbol: string, amount: number) {
    if (mode.kind === "main") actions.setSim(addPlan(save.sim, { sym: symbol, amount }));
    else { const s = addPlan(local, { sym: symbol, amount }); setLocal(s); simRef.current = s; }
    setPlanSet(true);
  }
  function addMoney(a: number) {
    if (mode.kind === "main") { actions.addPlayMoney(a); actions.transfer(a, true); }
    else { const s = deposit(local, a); setLocal(s); simRef.current = s; }
    toast(`${eur(a)} play money added to your trading account.`);
  }
  function cancel(id: number) {
    if (mode.kind === "main") actions.setSim(cancelOrder(save.sim, id));
    else setLocal(cancelOrder(local, id));
  }

  // ── derived ──
  const prices = pricesOf(u);
  const priceOf = (s: string, d = sim.day) => priceAt(u, s, d);
  const dv = depotValue(sim), total = round2(sim.acct.cash + dv);
  const label = (d: number) => (u.hideDate ? (d >= 0 ? `Day ${d + 1}` : `−${-d} d`) : (() => { const x = dateOf(u, d); return `${String(x.getUTCDate()).padStart(2, "0")} ${x.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}${x.getUTCMonth() === 0 && x.getUTCDate() <= 7 ? ` ${x.getUTCFullYear()}` : ""}`; })());
  const clock = u.hideDate ? `Day ${sim.day + 1} · ${shortDay(dateOf(u, sim.day))} · date hidden` : `${dateDE(dateOf(u, sim.day))} · ${TIME}`;
  const firstDay = mode.kind === "main" ? Math.max(-u.history, sim.day - (layout === "simple" ? 60 : 400)) : -Math.min(u.history, replay ? 40 : 120);
  const closes = prices[sym].slice(u.history + firstDay, u.history + sim.day + 1);
  const visibleNews = u.news.filter((n) => n.day <= sim.day && n.day > sim.day - 120).slice().reverse();
  const marks: ChartMark[] = (() => {
    const m: ChartMark[] = sim.acct.trades.filter((t) => t.sym === sym).map((t) => ({ day: t.day, kind: t.side === "buy" ? "you-buy" : "you-sell", text: `You ${t.side === "buy" ? "B" : "S"} ${qtyFmt(t.qty)}` }));
    for (const mv of replay?.moves ?? []) if (mv.day <= sim.day && (mv.buys?.some(([s]) => s === sym) || mv.sells?.includes(sym))) m.push({ day: mv.day, kind: "bot", text: BOTS[mv.bot].name.split(" ")[1] ?? BOTS[mv.bot].name });
    for (const n of u.news) if (n.major && n.day <= sim.day && n.day >= firstDay && (!n.sym || n.sym === sym)) m.push({ day: n.day, kind: "news", text: "N" });
    return m;
  })();
  const lastMove = replay?.moves.filter((m) => m.day <= sim.day && m.day >= sim.day - 2).at(-1);
  const show = (w: string) => !hidden[w];
  const simulated = mode.kind !== "replay";

  const overlays = (
    <>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast" role="status"><span>{t.text}</span><button className="link" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">✕</button></div>)}
      </div>

      {intro && replay && chapter && <BossIntro replay={replay} chapter={chapter} onStart={() => setIntro(false)} />}
      {(spot || firstSpot) && replay && (
        <SpotCard move={(spot || firstSpot) as BotMove} name={cover} picked={answers[((spot || firstSpot) as BotMove).bot + ((spot || firstSpot) as BotMove).day]}
          onPick={(k) => {
            const mv = (spot || firstSpot) as BotMove;
            setSpot(mv); // keep the card open for the explanation
            setAnswers((a) => ({ ...a, [mv.bot + mv.day]: k }));
            if (k === mv.spot!.answer) actions.understood(`spot:${replay.id}:${mv.bot}:${mv.day}`, 15);
          }}
          onClose={() => setSpot(null)} />
      )}
      {decision && (
        <DecisionCard news={decision} onDecide={(act) => {
          const right = act === ["signal", "sector", "macro"].includes(decision.kind);
          setDecided((d) => ({ ...d, [decision.id]: true }));
          const next = { a: w2.current.a + 1, r: w2.current.r + (right ? 1 : 0) };
          w2.current = next;
          setUi({ w2Answered: next.a, w2Right: next.r });
          if (right) actions.understood(`w2:${decision.id}`, 15);
          return right;
        }} onClose={() => setDecision(null)} />
      )}
      {revealOpen && replay && <RevealModal replay={replay} chapter={chapter} sim={sim} answers={answers} name={cover} onClose={() => setRevealOpen(false)} />}
      {chapter?.kind === "chapter" && !intro && <TourRunner surface="pro" />}
      {chapter?.kind === "mission" && <TourRunner surface="pro" />}
      {offerSwitch && !later && <ProTraderSwitch chapter={chapter} onLater={() => setLater(true)} />}
    </>
  );

  if (layout === "simple") {
    return (
      <>
        <SimpleDesk sim={sim} u={u} comps={comps} sym={sym} setSym={setSym} cover={cover} coverWkn={coverWkn}
          speed={speed} setSpeed={setSpeed} ended={isEnded} closes={closes} firstDay={firstDay} label={label} news={visibleNews}
          breaking={breaking} clearBreaking={() => setBreaking(null)} freePlay={mode.kind === "main" && !chapter}
          order={order} cancel={cancel} addMoney={addMoney} replay={replay} answers={answers} />
        {overlays}
      </>
    );
  }

  return (
    <div className="pt">
      <SandboxBar dark />
      <header className="pt-head" data-tour="pt-header">
        <span className="pt-logo"><Wordmark width={96} /></span>
        <span className="pt-icon" aria-hidden>☰</span>
        <span className="pt-icon" aria-hidden>🔔︎</span>
        <label className="pt-field"><span>Workspaces</span>
          <select value={workspace} onChange={(e) => setWorkspace(e.target.value as "depot" | "focus")}>
            <option value="depot">My depot</option><option value="focus">Single stock focus</option>
          </select>
        </label>
        <div className="pt-field"><span>Order</span><button className="pt-yellow" data-tour="pt-order" onClick={() => setOrderOpen(true)} aria-label="Open order window">⇄</button></div>
        <div className="pt-field pt-widgets"><span>Widgets</span><button className="pt-yellow" onClick={() => setWidgetsOpen(!widgetsOpen)} aria-label="Show or hide widgets" aria-expanded={widgetsOpen}>+</button>
          {widgetsOpen && (
            <div className="pt-menu" role="menu">
              {["Watchlist", "Depot", "Chart", "Orderbook", "News", ...(replay ? ["Rivals"] : [])].map((w) => (
                <label key={w} className="xs"><input type="checkbox" checked={show(w)} onChange={() => setHidden({ ...hidden, [w]: !hidden[w] })} /> {w}</label>
              ))}
            </div>
          )}
        </div>
        <div className="pt-figs num">
          <span><small>Depot value (EUR)</small>{num(dv)}</span>
          <span><small>Available (EUR)</small>{num(round2(sim.acct.cash - sim.acct.orders.filter((o) => o.side === "buy").reduce((v, o) => v + o.qty * o.limit + fee(o.qty * o.limit), 0)))}</span>
          <span className="hide-sm"><small>Intraday credit (EUR)</small>0,00</span>
          <span className="hide-sm"><small>Total (EUR)</small>{num(total)}</span>
        </div>
        <div className="pt-field pt-widgets"><span>Sandbox</span><button className="pt-play" onClick={() => setMoneyOpen(!moneyOpen)} aria-expanded={moneyOpen}>+ Play money</button>
          {moneyOpen && (
            <div className="pt-menu" role="menu">
              <span className="xs muted">Straight to your trading account. Never counts as profit.</span>
              {[100, 500, 1000].map((a) => <button key={a} className="btn btn-outline btn-sm" onClick={() => { addMoney(a); setMoneyOpen(false); }}>+{num(a, 0)} €</button>)}
            </div>
          )}
        </div>
        <div className="pt-right">
          <span className="pt-figs num"><span><small>Depot number</small>{mode.kind === "main" ? "1234567" : replay ? "Replay" : "Practice"}</span></span>
          <Link className="pt-logout" href="/">Exit</Link>
        </div>
      </header>

      <TimeBar clock={clock} speed={speed} setSpeed={(s) => { setBreaking(null); setSpeed(s); }} ended={isEnded} years={years}
        jump={(n) => { setBreaking(null); stepTime(n, mode.kind === "replay"); }}
        next={() => { setBreaking(null); const nx = u.news.find((n) => n.major && n.day > simRef.current.day); const mv = replay?.moves.find((m) => m.day > simRef.current.day); const to = Math.min(nx?.day ?? u.days, mv?.day ?? u.days); stepTime(Math.max(1, to - simRef.current.day), true); }}
        progress={mode.kind === "main" ? undefined : `${sim.day} / ${u.days} days`}
        label={replay ? "Historical replay · headlines retold, prices shaped like the real curve" : "Simulated market"}
        breaking={breaking}
        reveal={isEnded && replay ? replay.reveal : undefined}
        onReveal={replay && chapter?.kind !== "chapter" ? () => setRevealOpen(true) : undefined} />

      <main className={`pt-grid ${workspace} ${replay ? "with-rivals" : ""}`}>
        {show("Watchlist") && (
          <Widget id="w-watchlist" title="Watchlist" sub="Practice list" className="g-watch">
            <table className="pt-table">
              <thead><tr><th>Name</th><th>Exch.</th><th className="r">Last</th><th className="r">Diff. prev.</th></tr></thead>
              <tbody>
                {comps.map((c) => {
                  const p = priceOf(c.sym), pp = priceOf(c.sym, sim.day - 1), ch = (p / pp - 1) * 100;
                  return (
                    <tr key={c.sym} className={`clickable ${sym === c.sym ? "sel" : ""}`} onClick={() => setSym(c.sym)}>
                      <td><button className="pt-link" onClick={() => setSym(c.sym)}>{cover(c.sym)}</button></td>
                      <td className="muted">{c.type === "ETF" ? "Xetra" : "Tradegate"}</td>
                      <td className="r num cell-y">{num(p)}</td>
                      <td className={`r num ${ch >= 0 ? "cell-g" : "cell-r"}`}>{pct(ch)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="pt-foot xs">{comps.length} instruments</div>
          </Widget>
        )}

        {show("Depot") && (
          <Widget id="w-depot" title="Depot" className="g-depot">
            <div className="pt-depot-sum num">
              <span>Depot value (EUR) <strong>{num(dv)}</strong></span>
              <span>Purchase value (EUR) <strong>{num(costBasis(sim))}</strong></span>
              <span>Diff. since purchase <strong className={cls(dv - costBasis(sim))}>{signed(dv - costBasis(sim))}</strong></span>
            </div>
            {Object.keys(sim.acct.holdings).length === 0 ? (
              <div className="pt-empty"><Icon name="chart" size={36} round /><strong>No positions</strong><span className="xs muted">Open the yellow Order button to buy.</span></div>
            ) : (
              <table className="pt-table">
                <thead><tr><th>WKN</th><th>Name</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Value</th><th className="r">Weight</th><th className="r">Diff.</th></tr></thead>
                <tbody>
                  {Object.entries(sim.acct.holdings).map(([s, h]) => {
                    const v = h.qty * priceOf(s);
                    return (
                      <tr key={s} className="clickable" onClick={() => setSym(s)}>
                        <td className="num">{coverWkn(s)}</td><td>{cover(s)}</td><td className="r num">{qtyFmt(h.qty)}</td><td className="r num">{num(priceOf(s))}</td>
                        <td className="r num">{num(v)}</td><td className="r num">{num(total ? (v / total) * 100 : 0, 1)} %</td>
                        <td className={`r num ${cls(v - h.cost)}`}>{pct(((v - h.cost) / h.cost) * 100)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {sim.acct.plans.length > 0 && <div className="pt-foot xs">Savings plan: {sim.acct.plans.map((p) => `${eur(p.amount)}/month on ${cover(p.sym)}`).join(", ")} · {sim.acct.trades.filter((t) => t.exchange === "Sparplan").length} executions</div>}
            <div className="pt-foot xs">{Object.keys(sim.acct.holdings).length} positions · cash {eur(sim.acct.cash)}</div>
          </Widget>
        )}

        {show("Chart") && (
          <ChartWidget sym={sym} name={cover(sym)} wkn={coverWkn(sym)} closes={closes} firstDay={firstDay} label={label} marks={marks} span={replay ? Math.min(60, 40 + sim.day + 2) : 90}
            bubble={lastMove ? <BotBubble move={lastMove} name={cover} /> : null} />
        )}

        {show("Orderbook") && (
          <OrderBook sim={sim} expired={expired} cover={cover} coverWkn={coverWkn} label={label} cancel={cancel} />
        )}

        {show("News") && (
          <NewsWidget news={visibleNews} day={sim.day} sel={selNews} setSel={setSelNews} label={label} simulated={simulated} cover={cover} breaking={breaking?.id} />
        )}

        {replay && show("Rivals") && (
          <Rivals replay={replay} sim={sim} answers={answers} cover={cover} />
        )}
      </main>

      {orderOpen && (
        <OrderWindow sim={sim} comps={comps} sym={sym} setSym={setSym} cover={cover} coverWkn={coverWkn} order={order} onClose={() => setOrderOpen(false)}
          planAllowed={years} planAmount={PERSONAS[save.persona ?? "starter"].plan} setPlan={setPlan} disabled={isEnded} />
      )}

      {overlays}
    </div>
  );
}

const ended = (s: Sim) => s.day >= universeOf(s.universe).days;

function TimeBar({ clock, speed, setSpeed, jump, next, ended, years, progress, label, breaking, reveal, onReveal }: {
  clock: string; speed: number; setSpeed: (s: number) => void; jump: (n: number) => void; next: () => void; ended: boolean; years: boolean;
  progress?: string; label: string; breaking: News | null; reveal?: string; onReveal?: () => void;
}) {
  return (
    <div className="tm" data-tour="time-machine" aria-label="Time machine">
      <span className="tm-tag">Time machine</span>
      <span className="tm-clock num">{clock}</span>
      <div className="tm-btns" role="group" aria-label="Speed">
        <button aria-pressed={speed === 0} onClick={() => setSpeed(0)} title="Pause">⏸</button>
        <button aria-pressed={speed === 1} onClick={() => setSpeed(1)} disabled={ended} title="Play 1×">▶ 1×</button>
        <button aria-pressed={speed === 5} onClick={() => setSpeed(5)} disabled={ended} title="Play 5×">⏩ 5×</button>
        <button onClick={next} disabled={ended} title="Jump to the next event">⏭ Next event</button>
      </div>
      <div className="tm-btns" role="group" aria-label="Jump ahead">
        <button onClick={() => jump(1)} disabled={ended}>+1 day</button>
        <button onClick={() => jump(5)} disabled={ended}>+1 week</button>
        <button onClick={() => jump(21)} disabled={ended}>+1 month</button>
        <button onClick={() => jump(252)} disabled={ended || !years} title={years ? "" : "Unlocks in World 4"}>{years ? "" : "🔒 "}+1 year</button>
        <button onClick={() => jump(2520)} disabled={ended || !years} title={years ? "" : "Unlocks in World 4"}>{years ? "" : "🔒 "}+10 years</button>
      </div>
      {progress && <span className="xs tm-prog num">{progress}</span>}
      <span className="tm-label xs">{label}</span>
      {breaking && !reveal && <span className="tm-break" role="status">⏸ Paused on news: <strong>{breaking.headline}</strong></span>}
      {reveal && <span className="tm-break reveal" data-tour="reveal-banner" role="status"><strong>{reveal}</strong>{onReveal && <button className="btn btn-primary btn-sm" onClick={onReveal}>Results ›</button>}</span>}
    </div>
  );
}

function ChartWidget({ sym, name, wkn, closes, firstDay, label, marks, span, bubble }: {
  sym: string; name: string; wkn: string; closes: number[]; firstDay: number; label: (d: number) => string; marks: ChartMark[]; span: number; bubble: React.ReactNode;
}) {
  const [type, setType] = useState<"candles" | "line">("candles");
  const [bb, setBb] = useState(false);
  return (
    <Widget id="w-chart" title="Chart" className="g-chart" actionsSlot={<><span className="pt-chip-sel">Since start</span><span className="pt-chip-sel">1 day</span></>}>
      <div className="pt-chart-top">
        <span className="pt-instr"><span className="ok-dot" aria-hidden /> <span className="num">{wkn}</span> · Xetra · <strong>{name}</strong></span>
      </div>
      <div className="pt-tools">
        <label><span>Chart type</span><select value={type} onChange={(e) => setType(e.target.value as "candles" | "line")}><option value="candles">Candles</option><option value="line">Line</option></select></label>
        <label><span>Indicator</span><select value={bb ? "bb" : ""} onChange={(e) => setBb(e.target.value === "bb")}><option value="">Add…</option><option value="bb">Bollinger (20, 2)</option></select></label>
        <label><span>Drawing</span><select disabled><option>Add…</option></select></label>
        <span className="pt-legend xs"><span className="lg-you" /> You <span className="lg-bot" /> Bots <span className="lg-news" /> News</span>
      </div>
      <div className="pt-chart-body">
        <ProChart sym={sym} closes={closes} firstDay={firstDay} label={label} marks={marks} type={type} bollinger={bb} span={span} />
        {bubble}
      </div>
    </Widget>
  );
}

function OrderBook({ sim, expired, cover, coverWkn, label, cancel }: { sim: Sim; expired: SimEvent[]; cover: (s: string) => string; coverWkn: (s: string) => string; label: (d: number) => string; cancel: (id: number) => void }) {
  const [tab, setTab] = useState<"all" | "open" | "done">("all");
  type Row = { key: string; day: number; sym: string; side: string; qty: number; type: string; limit?: number; status: "open" | "executed" | "expired"; id?: number };
  const rows: Row[] = [
    ...sim.acct.orders.map((o) => ({ key: `o${o.id}`, day: o.placed, sym: o.sym, side: o.side, qty: o.qty, type: o.type, limit: o.limit, status: "open" as const, id: o.id })),
    ...sim.acct.trades.map((t, i) => ({ key: `t${i}`, day: t.day, sym: t.sym, side: t.side, qty: t.qty, type: t.exchange === "Sparplan" ? "savings plan" : t.type, limit: t.price, status: "executed" as const })),
    ...expired.flatMap((e) => (e.kind === "expired" ? [{ key: `e${e.order.id}`, day: e.day, sym: e.order.sym, side: e.order.side, qty: e.order.qty, type: e.order.type, limit: e.order.limit, status: "expired" as const }] : [])),
  ].sort((a, b) => b.day - a.day).filter((r) => tab === "all" || (tab === "open" ? r.status === "open" : r.status !== "open"));
  return (
    <Widget id="w-orderbook" title="Orderbook" className="g-book">
      <div className="pt-tabs" role="tablist">
        {(["all", "open", "done"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "all" ? "All" : t === "open" ? "Open" : "Completed"}</button>)}
      </div>
      {rows.length === 0 ? <div className="pt-empty"><Icon name="hourglass" size={36} round /><strong>No orders yet</strong><span className="xs muted">Orders and their status show up here.</span></div> : (
        <table className="pt-table">
          <thead><tr><th>Date</th><th>WKN</th><th>Name</th><th>Type</th><th className="r">Qty</th><th>Order type</th><th className="r">Limit/price</th><th>Status</th></tr></thead>
          <tbody>
            {rows.slice(0, 60).map((r) => (
              <tr key={r.key}>
                <td className="num">{label(r.day)}</td><td className="num">{coverWkn(r.sym)}</td><td>{cover(r.sym)}</td><td>{r.side === "buy" ? "Buy" : "Sell"}</td><td className="r num">{qtyFmt(r.qty)}</td>
                <td>{r.type === "market" ? "best price" : r.type}</td><td className="r num">{r.limit ? num(r.limit) : ""}</td>
                <td><span className={`status ${r.status}`}>● {r.status}</span>{r.status === "open" && r.id && <button className="pt-link xs" onClick={() => cancel(r.id!)}> cancel</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pt-foot xs">{rows.length} orders</div>
    </Widget>
  );
}

function NewsWidget({ news, day, sel, setSel, label, simulated, cover, breaking }: {
  news: News[]; day: number; sel: string | null; setSel: (id: string) => void; label: (d: number) => string; simulated: boolean; cover: (s: string) => string; breaking?: string;
}) {
  const [q, setQ] = useState("");
  const [card, setCard] = useState<string | null>(null);
  const list = news.filter((n) => !q || n.headline.toLowerCase().includes(q.toLowerCase()));
  const item = news.find((n) => n.id === sel) ?? null;
  const revealed = (n: News) => day >= n.day + 2 || day >= 1e9;
  return (
    <Widget id="w-news" title="News" className="g-news" actionsSlot={<span className="sim-label">{simulated ? "Simulated" : "Retold history"}</span>}>
      <div className="pt-search"><input placeholder="WKN, ISIN, name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search news" /></div>
      <div className="pt-news-list">
        <table className="pt-table">
          <thead><tr><th>Date, time</th><th>Headline</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={2} className="muted">No news yet. Press play.</td></tr>}
            {list.map((n) => (
              <tr key={n.id} className={`clickable ${sel === n.id ? "sel" : ""} ${n.major ? "major" : ""} ${breaking === n.id ? "breaking" : ""}`} onClick={() => setSel(n.id)}>
                <td className="num nowrap">{label(n.day)} {n.time.slice(0, 5)}</td>
                <td>{n.sym ? <span className="muted">{cover(n.sym)}: </span> : null}{n.headline}{n.major && revealed(n) && <span className={`kind k-${n.kind}`}>{KIND_LABEL[n.kind]}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {item && (
        <div className="pt-news-detail">
          <strong>{item.sym ? `${cover(item.sym)}: ` : ""}{item.headline}</strong>
          <span className="xs muted">From {item.source} | {label(item.day)} {item.time}</span>
          {item.body && <p className="small">{item.body}</p>}
          {item.major ? (revealed(item) ? (
            <p className="small reveal-why"><span className={`kind k-${item.kind}`}>{KIND_LABEL[item.kind]}</span> {item.explain} <button className="pt-link" onClick={() => setCard(item.concept)}>Concept card ›</button></p>
          ) : <p className="xs muted">What kind of news is this? The type is revealed after the price reaction.</p>) : null}
        </div>
      )}
      {card && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Concept card" onClick={() => setCard(null)}>
          <div className="modal modal-mid" onClick={(e) => e.stopPropagation()}>
            <div className="card-row"><ConceptCard id={card} /></div>
            <button className="btn btn-outline" style={{ alignSelf: "center" }} onClick={() => setCard(null)}>Close</button>
          </div>
        </div>
      )}
    </Widget>
  );
}

function OrderWindow({ sim, comps, sym: initial, setSym, cover, coverWkn, order, onClose, planAllowed, planAmount, setPlan, disabled }: {
  sim: Sim; comps: ReturnType<typeof companiesOf>; sym: string; setSym: (s: string) => void; cover: (s: string) => string; coverWkn: (s: string) => string;
  order: (o: OrderInput) => { error: string | null; filled: unknown }; onClose: () => void; planAllowed: boolean; planAmount: number; setPlan: (sym: string, amount: number) => void; disabled: boolean;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [sym, setLocalSym] = useState(initial);
  const [qty, setQty] = useState("");
  const [tab, setTab] = useState<"std" | "plan">("std");
  const [type, setType] = useState<OrderType>("limit");
  const [limit, setLimit] = useState("");
  const [validity, setValidity] = useState<Validity>("day");
  const [costs, setCosts] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [amount, setAmount] = useState(String(planAmount));
  const u = universeOf(sim.universe);
  const mid = priceAt(u, sym, sim.day);
  const n = parseInt(qty, 10) || 0;
  const lim = Number(limit.replace(",", ".")) || 0;
  const px = side === "buy" ? ask(mid) : bid(mid);
  const est = type === "limit" && lim ? (side === "buy" ? Math.min(lim, px) : Math.max(lim, px)) : px;
  const vol = round2(est * n), f = n ? fee(vol) : 0;
  const pick = (s: string) => { setLocalSym(s); setSym(s); setMsg(null); };
  function submit() {
    const res = order({ sym, side, qty: n, type, limit: lim, validity, exchange: "Xetra" });
    setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: res.filled ? `Executed: ${side === "buy" ? "bought" : "sold"} ${n} × ${cover(sym)}.` : `Order placed in the orderbook (${type} ${num(lim)} €).` });
  }
  return (
    <div className="ow" role="dialog" aria-label="Order" data-tour="w-order">
      <div className="pt-w-head"><strong>⇄ Order</strong><span className="pt-w-tools"><button className="pt-close" onClick={onClose} aria-label="Close order window">✕</button></span></div>
      <div className="ow-body">
        <div className="ow-side" role="group" aria-label="Buy or sell">
          <button className="buy" aria-pressed={side === "buy"} onClick={() => setSide("buy")}>✓ Buy</button>
          <button className="sell" aria-pressed={side === "sell"} onClick={() => setSide("sell")}>✕ Sell</button>
        </div>
        <div className="ow-row">
          <label><span>Instrument</span><select value={sym} onChange={(e) => pick(e.target.value)}>{comps.map((c) => <option key={c.sym} value={c.sym}>{coverWkn(c.sym)} · {cover(c.sym)}</option>)}</select></label>
          <label><span>Exchange</span><select defaultValue="Xetra"><option>Xetra</option></select></label>
        </div>
        <strong className="ow-name"><span className="ok-dot" aria-hidden /> {cover(sym)}</strong>
        <div className="ow-quote num">
          <div><span className="xs muted">Ask (EUR)</span><strong>{num(ask(mid))}</strong><button className="ow-as" onClick={() => { setType("limit"); setLimit(num(ask(mid))); }}>As limit</button></div>
          <div className="r"><span className="xs muted">Bid (EUR)</span><strong>{num(bid(mid))}</strong><button className="ow-as" onClick={() => { setType("limit"); setLimit(num(bid(mid))); }}>As limit</button></div>
        </div>
        <div className="pt-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "std"} onClick={() => setTab("std")}>Standard order</button>
          <button role="tab" aria-selected={tab === "plan"} onClick={() => setTab("plan")} data-tour="w-order-plan" disabled={!planAllowed} title={planAllowed ? "" : "Unlocks in World 4"}>{planAllowed ? "" : "🔒 "}Savings plan</button>
        </div>
        {tab === "std" ? (
          <>
            <div className="ow-row">
              <label><span>Qty</span><input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
              <span className="xs muted ow-avail num">Available: {eur(sim.acct.cash)}<br />Est. amount: {eur(side === "buy" ? vol + f : vol - f)}</span>
            </div>
            <div className="ow-grid">
              <span>Order type</span><select value={type} onChange={(e) => setType(e.target.value as OrderType)}><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option></select>
              {type !== "market" && <><span>{type === "limit" ? "Limit (EUR)" : "Stop (EUR)"}</span><input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={num(px)} /></>}
              <span>Validity</span><select value={validity} onChange={(e) => setValidity(e.target.value as Validity)}><option value="day">Good for day</option><option value="ultimo">Until end of month</option><option value="max">Maximum</option></select>
            </div>
            <button className="pt-link xs ow-costs" onClick={() => setCosts(!costs)}>{costs ? "Hide" : "Show"} order costs ›</button>
            {costs && <div className="ow-costs-box xs num">Price value {eur(vol)} · Fee {eur(f)} {vol ? `(${num((f / vol) * 100)} %)` : ""}</div>}
            {msg && <p className={`xs ${msg.ok ? "up" : "error"}`} role="status">{msg.text}</p>}
            <button className={`ow-go ${side}`} onClick={submit} disabled={disabled}>{side === "buy" ? "Buy (with costs)" : "Sell"}</button>
          </>
        ) : (
          <>
            <p className="xs muted">Invests the same amount every month, automatically. No fixed fee, 1,5 % per execution; fractional shares allowed.</p>
            <div className="ow-grid">
              <span>Amount per month (EUR)</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
              <span>Start</span><select defaultValue="next"><option value="next">Next trading day</option></select>
            </div>
            {msg && <p className={`xs ${msg.ok ? "up" : "error"}`} role="status">{msg.text}</p>}
            <button className="ow-go buy" disabled={disabled || !(Number(amount) >= 1)} onClick={() => { setPlan(sym, Number(amount)); setMsg({ ok: true, text: `Savings plan set up: ${eur(Number(amount))} every month on ${cover(sym)}.` }); }}>Set up savings plan</button>
          </>
        )}
      </div>
    </div>
  );
}
