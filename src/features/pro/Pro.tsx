"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { companyOf, ETF_SYM } from "@/features/market/companies";
import { cls, dateDE, dateLocale, eur, num, pct, qtyFmt, shortDay, signed } from "@/shared/lib/format";
import { dict, useT } from "@/shared/lib/i18n";
import { KIND_LABEL, type News } from "@/features/market/news";
import { chapterById, worldOpen, type Chapter } from "@/features/tour/chapters";
import { PERSONAS } from "@/features/game/personas";
import { actions, getSave, proTraderOffered, useGame } from "@/features/game/store";
import { setUi, useUi } from "@/features/game/ui";
import { addPlan, advance, deposit, ask, bid, cancelOrder, companiesOf, costBasis, dateOf, depotValue, fee, placeOrder, pricesOf, priceAt, replayBarsOf, round2, universeOf, type OrderInput, type OrderType, type Sim, type SimEvent, type Validity, newSim } from "@/features/market/engine";
import { registerRealMarket, type MarketFile } from "@/features/market/real-market";
import type { ReplayBar } from "@/features/market/replay-market";
import { REPLAYS, SIM_LESSONS, type BotMove, type Replay } from "@/features/market/scenarios";
import Icon from "@/shared/ui/Icon";
import SandboxBar from "@/features/shell/SandboxBar";
import ConceptCard from "@/features/learn/ConceptCard";
import TourRunner from "@/features/tour/TourRunner";
import { Wordmark } from "@/shared/ui/Wordmark";
import ProChart, { type ChartMark } from "@/features/pro/ProChart";
import Widget from "@/features/pro/Widget";
import { BotBubble, DecisionCard, RevealModal, Rivals, SpotCard, BossIntro } from "@/features/pro/ReplayParts";
import MarketChart from "@/features/pro/MarketChart";
import SimpleDesk from "@/features/pro/Simple";
import { BOTS } from "@/features/market/bots";

export type Mode =
  | { kind: "main" }
  | { kind: "real"; id: string }
  | { kind: "lesson"; id: string }
  | { kind: "replay"; replay: Replay };

// Widget names stay English as ids; this is what people read.
dict({ Watchlist: "Watchlist", Portfolio: "Depot", Chart: "Chart", Orderbook: "Orderbuch", News: "News", Rivals: "Rivalen" });

const BUDGET = 1000; // replays and simulated lessons: the same round budget for you and the bots (scores are in %)
const TIME = "17:35:00";

export default function Pro({ realMarket = false }: { realMarket?: boolean }) {
  const t = useT();
  const save = useGame();
  const ch = save.active ? chapterById(save.active) : undefined;
  const pro = ch?.surface === "pro" ? ch : undefined;
  if (!save.persona) return <Gate text={t("Answer three quick questions first.", "Beantworte zuerst drei kurze Fragen.")} href="/start" cta={t("Start", "Starten")} />;
  if (realMarket) return <RealMarketDesk layout={save.proTrader ? "pro" : "simple"} />;
  const mode: Mode = pro?.replay ? { kind: "replay", replay: REPLAYS[pro.replay] } : pro?.lesson ? { kind: "lesson", id: SIM_LESSONS[pro.lesson as keyof typeof SIM_LESSONS].id } : { kind: "main" };
  // The learner starts on the simple trading area. Module 2 always runs there; ProTrader takes over
  // from Module 3 (and in free play) only after the learner has confirmed the switch.
  // History mode (world 0) always plays on the simple trading area.
  const simpleOnly = pro?.world === 2 || pro?.world === 0;
  const layout: Layout = simpleOnly || !save.proTrader ? "simple" : "pro";
  const offerSwitch = proTraderOffered(save) && !save.proTrader && !save.simpleChosen && !simpleOnly;
  return <Desk key={`${save.active ?? "free"}:${layout}`} mode={mode} chapter={pro} layout={layout} offerSwitch={offerSwitch} />;
}

type Layout = "simple" | "pro";

/** Rewinding the market simulation (1 day/s · 1 week/s dialog): restart it from an earlier session, trading on. */
export type RealSim = { pace: number; cash: number; onRewind: (startIndex: number, pace: number) => void };

function RealMarketDesk({ layout }: { layout: Layout }) {
  const [market, setMarket] = useState<{ id: string; start: number } | { error: string }>();
  const file = useRef<MarketFile | null>(null);
  const [pace, setPace] = useState(1);
  // A new start session re-registers the market and remounts the desk with a fresh simulation at that date.
  const onRewind = (startIndex: number, nextPace: number) => {
    if (!file.current) return;
    const u = registerRealMarket(file.current, new Date(), startIndex);
    setPace(nextPace);
    setMarket({ id: u.id, start: u.history });
    // Show the new date: the time bar is the first thing to see after going back in time.
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  useEffect(() => {
    const controller = new AbortController();
    fetch("/market/yahoo-daily.json", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Missing quotes file");
        return await response.json() as MarketFile;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        file.current = data;
        const u = registerRealMarket(data);
        setMarket({ id: u.id, start: u.history });
      })
      .catch(() => { if (!controller.signal.aborted) setMarket({ error: "Could not load the local Yahoo Finance quotes." }); });
    return () => controller.abort();
  }, []);
  if (!market) return <div className="pt-gate" role="status">Loading local market data…</div>;
  if ("error" in market) return <Gate text={market.error} href="/" cta="Learning map" />;
  return <Desk key={`real:${market.start}`} mode={{ kind: "real", id: market.id }} layout={layout} offerSwitch={false} realSim={{ pace, cash: BUDGET, onRewind }} />;
}

/** The move from the simple trading area to ProTrader is a moment: the learner sees what changes and confirms it. */
function ProTraderSwitch({ chapter, onLater }: { chapter?: Chapter; onLater: () => void }) {
  const t = useT();
  return (
    <div className="overlay overlay-dark" role="dialog" aria-modal="true" aria-labelledby="switch-title">
      <div className="unlock">
        <p className="unlock-kicker">{t("Module 2 complete · ProTrader unlocked", "Modul 2 abgeschlossen · ProTrader freigeschaltet")}</p>
        <h1 id="switch-title">{t("Ready for the full trading desk?", "Bereit für den vollen Handelsplatz?")}</h1>
        <div className="row" style={{ justifyContent: "center" }}>
          {chapter
            ? <Link className="btn btn-outline-light" href="/" onClick={() => actions.start(null)}>{t("Not yet, back to the map", "Noch nicht, zurück zum Lernpfad")}</Link>
            : <button className="btn btn-outline-light" onClick={onLater}>{t("Not yet, keep the simple view", "Noch nicht, einfache Ansicht behalten")}</button>}
          <button className="btn btn-primary btn-lg" onClick={() => { actions.switchToProTrader(); setUi({}); }}>{t("Switch to ProTrader →", "Zum ProTrader wechseln →")}</button>
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

function Desk({ mode, chapter, layout, offerSwitch, realSim }: { mode: Mode; chapter?: Chapter; layout: Layout; offerSwitch: boolean; realSim?: RealSim }) {
  const t = useT();
  const save = useGame();
  const replay = mode.kind === "replay" ? mode.replay : undefined;
  const universeId = mode.kind === "main" ? "main" : mode.kind === "replay" ? mode.replay.universe.id : mode.id;
  const u = universeOf(universeId);
  const real = mode.kind === "real";
  const [local, setLocal] = useState<Sim>(() => newSim(universeId, mode.kind === "lesson" && mode.id === "w4-plan" ? 0 : BUDGET));
  const sim = mode.kind === "main" ? save.sim : local;
  const simRef = useRef(sim);
  useEffect(() => { simRef.current = sim; });
  const [startDay] = useState(sim.day);

  const comps = companiesOf(u);
  // replays: the company name appears when the guided tour's last pop-up is finished; without a tour, once the hero's last headline has played out (no headlines → at the end)
  const tourFinished = useUi().tourFinished === chapter?.id;
  const heroDays = replay ? u.news.filter((n) => n.sym === replay.hero).map((n) => n.day) : [];
  const storyEnd = heroDays.length ? Math.max(...heroDays) : u.days;
  const masked = (s: Sim) => !!replay && (chapter?.kind === "chapter" ? !tourFinished : s.day < storyEnd);
  const describe = (s: string) => u.companies?.find((c) => c.sym === s) ?? companyOf(s);
  const cover = (sym: string) => (replay && sym === replay.hero && masked(sim) ? t(replay.cover) : describe(sym).short);
  const coverWkn = (sym: string) => (replay && sym === replay.hero && masked(sim) ? replay.coverWkn : describe(sym).wkn || sym);
  const [sym, setSym] = useState<string>(replay ? replay.hero : mode.kind === "lesson" && mode.id === "w4-plan" ? ETF_SYM : mode.kind === "lesson" ? ETF_SYM : real ? "DTE.DE" : "DTE");
  const [watchQuery, setWatchQuery] = useState("");
  const watch = real ? comps.filter((c) => [c.name, c.sym, c.wkn].some((v) => v.toLowerCase().includes(watchQuery.trim().toLowerCase()))) : comps;
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
  const w2 = useRef({ a: 0, r: 0 }); // Module 2 mission: answered / right
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
  useEffect(() => () => setUi({ tourFinished: undefined, orderOpen: false, ended: false, planSet: false, day: 0, dayDelta: 0, w2Answered: 0, w2Right: 0 }), []);

  // ── time ──
  const toast = (text: string) => setToasts((t) => [...t.slice(-2), { id: Date.now() + Math.random(), text }]);
  // Guided chapters ask their own questions through the tour; "Spot the habit" cards there would sit under the tour's click gate.
  const spots = chapter?.kind !== "chapter";
  function stepTime(days: number, stopAtMajor: boolean): boolean {
    const cur = simRef.current;
    let n = Math.min(days, u.days - cur.day);
    if (n <= 0) { setSpeed(0); return false; }
    // replays: stop on a bot's move with a "Spot the habit" question
    const nextMove = spots && replay?.moves.find((m) => m.spot && m.day > cur.day && !(m.bot + m.day in answers));
    if (nextMove && (replay && mode.kind === "replay")) n = Math.min(n, nextMove.day - cur.day);
    const res = mode.kind === "main" ? { sim: null as Sim | null, events: actions.jump(n, stopAtMajor) } : advance(cur, n, { stopAtMajor });
    if (res.sim) { setLocal(res.sim); simRef.current = res.sim; } else simRef.current = getSave().sim;
    const events = res.events;
    let paused = false;
    for (const e of events) {
      if (e.kind === "fill") toast(t(`Your ${e.order.type} order was executed: ${e.trade.side === "buy" ? "bought" : "sold"} ${qtyFmt(e.trade.qty)} × ${cover(e.trade.sym)} at ${num(e.trade.price)} €`, `${e.order.type === "stop" ? "Stop" : "Limit"}-Order ausgeführt: ${qtyFmt(e.trade.qty)} × ${cover(e.trade.sym)} zu ${num(e.trade.price)} € ${e.trade.side === "buy" ? "gekauft" : "verkauft"}`));
      if (e.kind === "expired") { setExpired((x) => [...x, e]); toast(t(`Your order for ${cover(e.order.sym)} expired without execution.`, `Deine Order für ${cover(e.order.sym)} ist ohne Ausführung verfallen.`)); }
      if (e.kind === "news" && stopAtMajor) {
        setBreaking(e.news); setSelNews(e.news.id); setSpeed(0); paused = true;
        if (mode.kind === "lesson" && mode.id === "w2-mission" && !decided[e.news.id]) setDecision(e.news);
      }
    }
    const day = simRef.current.day;
    const mv = spots && replay?.moves.find((m) => m.spot && m.day === day && !(m.bot + m.day in answers));
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
  const firstSpot = spots && !intro && replay?.moves.find((m) => m.spot && m.day === 0 && !(m.bot + m.day in answers));

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
    toast(t(`${eur(a)} play money added to your trading account.`, `${eur(a)} Spielgeld auf dein Verrechnungskonto eingezahlt.`));
  }
  function cancel(id: number) {
    if (mode.kind === "main") actions.setSim(cancelOrder(save.sim, id));
    else setLocal(cancelOrder(local, id));
  }

  // ── derived ──
  const prices = pricesOf(u);
  const priceOf = (s: string, d = sim.day) => priceAt(u, s, d);
  const dv = depotValue(sim), total = round2(sim.acct.cash + dv);
  const label = (d: number) => (u.hideDate ? (d >= 0 ? t(`Day ${d + 1}`, `Tag ${d + 1}`) : t(`−${-d} d`, `−${-d} T`)) : (() => { const x = dateOf(u, d); return `${String(x.getUTCDate()).padStart(2, "0")} ${x.toLocaleDateString(dateLocale(t.lang), { month: "short", timeZone: "UTC" })}${x.getUTCMonth() === 0 && x.getUTCDate() <= 7 ? ` ${x.getUTCFullYear()}` : ""}`; })());
  const clock = u.hideDate ? `${t("Day", "Tag")} ${sim.day + 1} · ${shortDay(dateOf(u, sim.day), t.lang)} · ${t("date hidden", "Datum verdeckt")}` : `${dateDE(dateOf(u, sim.day))}${real ? "" : ` · ${TIME}`}`;
  const recentStart = Math.max(0, u.days - 14);
  const onJumpRecent = real && sim.day < recentStart
    ? () => { setSpeed(0); stepTime(recentStart - simRef.current.day, false); }
    : undefined;
  const firstDay = real ? -u.history : mode.kind === "main" ? Math.max(-u.history, sim.day - (layout === "simple" ? 60 : 400)) : -Math.min(u.history, replay ? 40 : 120);
  const from = u.history + firstDay;
  const through = u.history + sim.day + 1;
  const closes = prices[sym].slice(from, through);
  const replayBars = replayBarsOf(u)?.[sym].slice(from, through);
  const visibleNews = u.news.filter((n) => n.day <= sim.day && n.day > sim.day - 120).slice().reverse();
  const marks: ChartMark[] = (() => {
    const m: ChartMark[] = sim.acct.trades.filter((tr) => tr.sym === sym).map((tr) => ({ day: tr.day, kind: tr.side === "buy" ? "you-buy" : "you-sell", text: t(`You ${tr.side === "buy" ? "B" : "S"} ${qtyFmt(tr.qty)}`, `Du ${tr.side === "buy" ? "K" : "V"} ${qtyFmt(tr.qty)}`) }));
    for (const mv of replay?.moves ?? []) if (mv.day <= sim.day && (mv.buys?.some(([s]) => s === sym) || mv.sells?.includes(sym))) m.push({ day: mv.day, kind: "bot", text: BOTS[mv.bot].name.split(" ")[1] ?? BOTS[mv.bot].name });
    for (const n of u.news) if (n.major && n.day <= sim.day && n.day >= firstDay && (!n.sym || n.sym === sym)) m.push({ day: n.day, kind: "news", text: "N" });
    return m;
  })();
  const lastMove = replay?.moves.filter((m) => m.day <= sim.day && m.day >= sim.day - 2).at(-1);
  const show = (w: string) => !hidden[w];
  const simulated = mode.kind !== "replay" || !!mode.replay.sim;

  const overlays = (
    <>
      <div className="toasts" aria-live="polite">
        {toasts.map((x) => <div key={x.id} className="toast" role="status"><span>{x.text}</span><button className="link" onClick={() => setToasts((l) => l.filter((y) => y.id !== x.id))} aria-label={t("Dismiss", "Schließen")}>✕</button></div>)}
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
          speed={speed} setSpeed={setSpeed} ended={isEnded} closes={closes} replayBars={replayBars} firstDay={firstDay} label={label} news={visibleNews}
          breaking={breaking} clearBreaking={() => setBreaking(null)} freePlay={mode.kind === "main" && !chapter}
          order={order} cancel={cancel} addMoney={addMoney} replay={replay} answers={answers} onJumpRecent={onJumpRecent} realSim={realSim} />
        {overlays}
      </>
    );
  }

  return (
    <div className="pt">
      <SandboxBar dark onSimple={actions.switchToSimple} />
      <header className="pt-head" data-tour="pt-header">
        <span className="pt-logo"><Wordmark width={96} /></span>
        <span className="pt-icon" aria-hidden>☰</span>
        <span className="pt-icon" aria-hidden>🔔︎</span>
        <label className="pt-field"><span>{t("Workspaces", "Arbeitsbereiche")}</span>
          <select value={workspace} onChange={(e) => setWorkspace(e.target.value as "depot" | "focus")}>
            <option value="depot">{t("My depot", "Mein Depot")}</option><option value="focus">{t("Single stock focus", "Fokus Einzelwert")}</option>
          </select>
        </label>
        <div className="pt-field"><span>Order</span><button className="pt-yellow" data-tour="pt-order" onClick={() => setOrderOpen(true)} aria-label={t("Open order window", "Orderfenster öffnen")}>⇄</button></div>
        <div className="pt-field pt-widgets"><span>Widgets</span><button className="pt-yellow" onClick={() => setWidgetsOpen(!widgetsOpen)} aria-label={t("Show or hide widgets", "Widgets ein- oder ausblenden")} aria-expanded={widgetsOpen}>+</button>
          {widgetsOpen && (
            <div className="pt-menu" role="menu">
              {["Watchlist", "Portfolio", "Chart", "Orderbook", "News", ...(replay ? ["Rivals"] : [])].map((w) => (
                <label key={w} className="xs"><input type="checkbox" checked={show(w)} onChange={() => setHidden({ ...hidden, [w]: !hidden[w] })} /> {t(w)}</label>
              ))}
            </div>
          )}
        </div>
        <div className="pt-figs num">
          <span><small>{t("Portfolio value (EUR)", "Depotwert (EUR)")}</small>{num(dv)}</span>
          <span><small>{t("Available (EUR)", "Verfügbar (EUR)")}</small>{num(round2(sim.acct.cash - sim.acct.orders.filter((o) => o.side === "buy").reduce((v, o) => v + o.qty * o.limit + fee(o.qty * o.limit), 0)))}</span>
          <span className="hide-sm"><small>{t("Intraday credit (EUR)", "Intraday-Kredit (EUR)")}</small>0,00</span>
          <span className="hide-sm"><small>{t("Total (EUR)", "Gesamt (EUR)")}</small>{num(total)}</span>
        </div>
        <div className="pt-field pt-widgets"><span>Sandbox</span><button className="pt-play" onClick={() => setMoneyOpen(!moneyOpen)} aria-expanded={moneyOpen}>{t("+ Play money", "+ Spielgeld")}</button>
          {moneyOpen && (
            <div className="pt-menu" role="menu">
              <span className="xs muted">{t("Straight to your trading account. Never counts as profit.", "Direkt auf dein Verrechnungskonto. Zählt nie als Gewinn.")}</span>
              {[100, 500, 1000].map((a) => <button key={a} className="btn btn-outline btn-sm" onClick={() => { addMoney(a); setMoneyOpen(false); }}>+{num(a, 0)} €</button>)}
            </div>
          )}
        </div>
        <div className="pt-right">
          <span className="pt-figs num"><span><small>{t("Portfolio number", "Depotnummer")}</small>{mode.kind === "main" ? "1234567" : replay && !replay.sim ? "Replay" : t("Practice", "Übung")}</span></span>
          <Link className="pt-logout" href="/">{t("Exit", "Beenden")}</Link>
        </div>
      </header>

      <TimeBar clock={clock} speed={speed} setSpeed={(s) => { setBreaking(null); setSpeed(s); }} ended={isEnded} years={years}
        jump={(n) => { setBreaking(null); stepTime(n, mode.kind === "replay"); }}
        next={real ? undefined : () => { setBreaking(null); const nx = u.news.find((n) => n.major && n.day > simRef.current.day); const mv = replay?.moves.find((m) => m.day > simRef.current.day); const to = Math.min(nx?.day ?? u.days, mv?.day ?? u.days); stepTime(Math.max(1, to - simRef.current.day), true); }}
        progress={replay ? t(`${sim.day + 1} of ${u.days + 1} sessions`, `${sim.day + 1} von ${u.days + 1} Handelstagen`) : mode.kind === "lesson" ? `${sim.day} / ${u.days} ${t("days", "Tage")}` : undefined}
        label={real ? t("Real Market · Yahoo Finance daily history · EUR", "Echter Markt · Yahoo-Finance-Tageskurse · EUR") : replay && !replay.sim ? t("Historical replay · observed and simulated prices", "Historisches Replay · beobachtete und simulierte Kurse") : t("Simulated market", "Simulierter Markt")}
        breaking={breaking}
        reveal={isEnded && replay ? t(replay.reveal) : undefined}
        onReveal={replay && chapter?.kind !== "chapter" ? () => setRevealOpen(true) : undefined} />

      <main className={`pt-grid ${workspace} ${replay ? "with-rivals" : ""}`}>
        {show("Watchlist") && (
          <Widget id="w-watchlist" title="Watchlist" sub={real ? "Yahoo Finance" : t("Practice list", "Übungsliste")} className="g-watch">
            {real && <div className="pt-search"><input type="search" aria-label={t("Search stocks", "Aktien suchen")} placeholder={t("Name or ticker", "Name oder Kürzel")} value={watchQuery} onChange={(e) => setWatchQuery(e.target.value)} /></div>}
            <table className="pt-table">
              <thead><tr><th>Name</th><th>{t("Exch.", "Börse")}</th><th className="r">{t("Last", "Letzter")}</th><th className="r">{t("Diff. prev.", "Diff. Vortag")}</th></tr></thead>
              <tbody>
                {watch.map((c) => {
                  const p = priceOf(c.sym), pp = priceOf(c.sym, sim.day - 1), ch = (p / pp - 1) * 100;
                  return (
                    <tr key={c.sym} className={`clickable ${sym === c.sym ? "sel" : ""}`} onClick={() => setSym(c.sym)}>
                      <td><button className="pt-link" onClick={() => setSym(c.sym)}>{cover(c.sym)}</button></td>
                      <td className="muted">{c.venue ?? (c.type === "ETF" ? "Xetra" : "Tradegate")}</td>
                      <td className="r num cell-y">{num(p)}</td>
                      <td className={`r num ${ch >= 0 ? "cell-g" : "cell-r"}`}>{pct(ch)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="pt-foot xs">{comps.length} {t("instruments", "Werte")}</div>
          </Widget>
        )}

        {show("Portfolio") && (
          <Widget id="w-depot" title={t("Portfolio")} className="g-depot">
            <div className="pt-depot-sum num">
              <span>{t("Portfolio value (EUR)", "Depotwert (EUR)")} <strong>{num(dv)}</strong></span>
              <span>{t("Purchase value (EUR)", "Kaufwert (EUR)")} <strong>{num(costBasis(sim))}</strong></span>
              <span>{t("Diff. since purchase", "Diff. seit Kauf")} <strong className={cls(dv - costBasis(sim))}>{signed(dv - costBasis(sim))}</strong></span>
            </div>
            {Object.keys(sim.acct.holdings).length === 0 ? (
              <div className="pt-empty"><Icon name="chart" size={36} round /><strong>{t("No positions", "Keine Positionen")}</strong><span className="xs muted">{t("Open the yellow Order button to buy.", "Zum Kaufen den gelben Order-Button öffnen.")}</span></div>
            ) : (
              <table className="pt-table">
                <thead><tr><th>WKN</th><th>Name</th><th className="r">{t("Qty", "Stück")}</th><th className="r">{t("Price", "Kurs")}</th><th className="r">{t("Value", "Wert")}</th><th className="r">{t("Weight", "Gewicht")}</th><th className="r">Diff.</th></tr></thead>
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
            {sim.acct.plans.length > 0 && <div className="pt-foot xs">{t("Savings plan", "Sparplan")}: {sim.acct.plans.map((p) => t(`${eur(p.amount)}/month on ${cover(p.sym)}`, `${eur(p.amount)}/Monat auf ${cover(p.sym)}`)).join(", ")} · {sim.acct.trades.filter((x) => x.exchange === "Sparplan").length} {t("executions", "Ausführungen")}</div>}
            <div className="pt-foot xs">{Object.keys(sim.acct.holdings).length} {t("positions · cash", "Positionen · Guthaben")} {eur(sim.acct.cash)}</div>
          </Widget>
        )}

        {show("Chart") && (
          <ChartWidget firstMonth={real ? u.historical!.sessions![0].slice(0, 7) : undefined}
            asOf={real ? dateOf(u, sim.day).toISOString().slice(0, 10) : undefined} onJumpRecent={onJumpRecent}
            venue={describe(sym).venue ?? "Xetra"} sym={sym} name={cover(sym)} wkn={coverWkn(sym)} closes={closes} replayBars={replayBars} firstDay={firstDay} label={label} marks={marks} span={real ? 48 : replay ? closes.length : 90}
            bubble={lastMove ? <BotBubble move={lastMove} name={cover} /> : null} />
        )}

        {show("Orderbook") && (
          <OrderBook sim={sim} expired={expired} cover={cover} coverWkn={coverWkn} label={label} cancel={cancel} />
        )}

        {real && show("News") && <Widget id="w-news" title="Data source" className="g-news"><div className="pt-foot">Yahoo Finance daily prices and volume. US prices are converted to EUR using the daily reference rate.</div></Widget>}
        {!real && show("News") && (
          <NewsWidget news={visibleNews} day={sim.day} sel={selNews} setSel={setSelNews} label={label} simulated={simulated} cover={cover} breaking={breaking?.id} />
        )}

        {replay && show("Rivals") && (
          <Rivals replay={replay} sim={sim} answers={answers} cover={cover} />
        )}
      </main>

      {orderOpen && (
        <OrderWindow sim={sim} comps={comps} sym={sym} setSym={setSym} cover={cover} coverWkn={coverWkn} order={order} onClose={() => setOrderOpen(false)}
          planAllowed={years && !real} planAmount={PERSONAS[save.persona ?? "starter"].plan} setPlan={setPlan} disabled={isEnded} />
      )}

      {overlays}
    </div>
  );
}

const ended = (s: Sim) => s.day >= universeOf(s.universe).days;

function TimeBar({ clock, speed, setSpeed, jump, next, ended, years, progress, label, breaking, reveal, onReveal }: {
  clock: string; speed: number; setSpeed: (s: number) => void; jump: (n: number) => void; next?: () => void; ended: boolean; years: boolean;
  progress?: string; label: string; breaking: News | null; reveal?: string; onReveal?: () => void;
}) {
  const t = useT();
  return (
    <div className="tm" data-tour="time-machine" aria-label={t("Time machine", "Zeitmaschine")}>
      <span className="tm-tag">{t("Time machine", "Zeitmaschine")}</span>
      <span className="tm-clock num">{clock}</span>
      <div className="tm-btns" role="group" aria-label={t("Speed", "Tempo")}>
        <button aria-pressed={speed === 0} onClick={() => setSpeed(0)} title={t("Pause", "Pause")}>⏸</button>
        <button aria-pressed={speed === 1} onClick={() => setSpeed(1)} disabled={ended} title={t("Play 1×", "Abspielen 1×")}>▶ 1×</button>
        <button aria-pressed={speed === 5} onClick={() => setSpeed(5)} disabled={ended} title={t("Play 5×", "Abspielen 5×")}>⏩ 5×</button>
        {next && <button onClick={next} disabled={ended} title={t("Jump to the next event", "Zum nächsten Ereignis springen")}>{t("⏭ Next event", "⏭ Nächstes Ereignis")}</button>}
      </div>
      <div className="tm-btns" role="group" aria-label={t("Jump ahead", "Vorspringen")}>
        <button onClick={() => jump(1)} disabled={ended}>{t("+1 day", "+1 Tag")}</button>
        <button onClick={() => jump(5)} disabled={ended}>{t("+1 week", "+1 Woche")}</button>
        <button onClick={() => jump(21)} disabled={ended}>{t("+1 month", "+1 Monat")}</button>
        <button onClick={() => jump(252)} disabled={ended || !years} title={years ? "" : t("Unlocks in Module 4", "Wird in Modul 4 freigeschaltet")}>{years ? "" : "🔒 "}{t("+1 year", "+1 Jahr")}</button>
        <button onClick={() => jump(2520)} disabled={ended || !years} title={years ? "" : t("Unlocks in Module 4", "Wird in Modul 4 freigeschaltet")}>{years ? "" : "🔒 "}{t("+10 years", "+10 Jahre")}</button>
      </div>
      {progress && <span className="xs tm-prog num">{progress}</span>}
      <span className="tm-label xs">{label}</span>
      {breaking && !reveal && <span className="tm-break" role="status">{t("⏸ Paused on news:", "⏸ Pause wegen News:")} <strong>{t(breaking.headline)}</strong></span>}
      {reveal && <span className="tm-break reveal" data-tour="reveal-banner" role="status"><strong>{reveal}</strong>{onReveal && <button className="btn btn-primary btn-sm" onClick={onReveal}>{t("Results ›", "Ergebnisse ›")}</button>}</span>}
    </div>
  );
}

function ChartWidget({ sym, name, wkn, venue, closes, replayBars, firstDay, label, marks, span, bubble, asOf, onJumpRecent, firstMonth }: {
  asOf?: string; firstMonth?: string; onJumpRecent?: () => void;
  sym: string; name: string; wkn: string; venue: string; closes: number[]; replayBars?: ReplayBar[]; firstDay: number; label: (d: number) => string; marks: ChartMark[]; span: number; bubble: React.ReactNode;
}) {
  const t = useT();
  const [type, setType] = useState<"candles" | "line">("candles");
  const [bb, setBb] = useState(false);
  const dailyChart = (
    <>
      <div className="pt-tools">
        <label><span>{t("Chart type", "Chartart")}</span><select value={type} onChange={(e) => setType(e.target.value as "candles" | "line")}><option value="candles">{t("Candles", "Kerzen")}</option><option value="line">{t("Line", "Linie")}</option></select></label>
        <label><span>{t("Indicator", "Indikator")}</span><select value={bb ? "bb" : ""} onChange={(e) => setBb(e.target.value === "bb")}><option value="">{t("Add…", "Hinzufügen …")}</option><option value="bb">Bollinger (20, 2)</option></select></label>
        <label><span>{t("Drawing", "Zeichnen")}</span><select disabled><option>{t("Add…", "Hinzufügen …")}</option></select></label>
        <span className="pt-legend xs"><span className="lg-you" /> {t("You", "Du")} <span className="lg-bot" /> Bots <span className="lg-news" /> News</span>
      </div>
      <div className="pt-chart-body">
        <ProChart sym={sym} closes={closes} replayBars={replayBars} firstDay={firstDay} label={label} marks={marks} type={type} bollinger={bb} span={span} scrollHistory={!!asOf} />
        {bubble}
      </div>
    </>
  );
  return (
    <Widget id="w-chart" title="Chart" className="g-chart" actionsSlot={asOf ? undefined : <><span className="pt-chip-sel">{t("Since start", "Seit Start")}</span><span className="pt-chip-sel">{t("1 day", "1 Tag")}</span></>}>
      <div className="pt-chart-top">
        <span className="pt-instr"><span className="ok-dot" aria-hidden /> <span className="num">{wkn}</span> · {venue} · <strong>{name}</strong></span>
      </div>
      {asOf ? <MarketChart symbol={sym} asOf={asOf} firstMonth={firstMonth!} onJumpRecent={onJumpRecent}>{dailyChart}</MarketChart> : dailyChart}
    </Widget>
  );
}

function OrderBook({ sim, expired, cover, coverWkn, label, cancel }: { sim: Sim; expired: SimEvent[]; cover: (s: string) => string; coverWkn: (s: string) => string; label: (d: number) => string; cancel: (id: number) => void }) {
  const t = useT();
  const [tab, setTab] = useState<"all" | "open" | "done">("all");
  type Row = { key: string; day: number; sym: string; side: string; qty: number; type: string; limit?: number; status: "open" | "executed" | "expired"; id?: number };
  const rows: Row[] = [
    ...sim.acct.orders.map((o) => ({ key: `o${o.id}`, day: o.placed, sym: o.sym, side: o.side, qty: o.qty, type: o.type, limit: o.limit, status: "open" as const, id: o.id })),
    ...sim.acct.trades.map((x, i) => ({ key: `t${i}`, day: x.day, sym: x.sym, side: x.side, qty: x.qty, type: x.exchange === "Sparplan" ? "savings plan" : x.type, limit: x.price, status: "executed" as const })),
    ...expired.flatMap((e) => (e.kind === "expired" ? [{ key: `e${e.order.id}`, day: e.day, sym: e.order.sym, side: e.order.side, qty: e.order.qty, type: e.order.type, limit: e.order.limit, status: "expired" as const }] : [])),
  ].sort((a, b) => b.day - a.day).filter((r) => tab === "all" || (tab === "open" ? r.status === "open" : r.status !== "open"));
  return (
    <Widget id="w-orderbook" title={t("Orderbook")} className="g-book">
      <div className="pt-tabs" role="tablist">
        {(["all", "open", "done"] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{k === "all" ? t("All", "Alle") : k === "open" ? t("Open", "Offen") : t("Completed", "Erledigt")}</button>)}
      </div>
      {rows.length === 0 ? <div className="pt-empty"><Icon name="hourglass" size={36} round /><strong>{t("No orders yet", "Noch keine Orders")}</strong><span className="xs muted">{t("Orders and their status show up here.", "Orders und ihr Status erscheinen hier.")}</span></div> : (
        <table className="pt-table">
          <thead><tr><th>{t("Date", "Datum")}</th><th>WKN</th><th>Name</th><th>{t("Type", "Art")}</th><th className="r">{t("Qty", "Stück")}</th><th>{t("Order type", "Orderart")}</th><th className="r">{t("Limit/price", "Limit/Kurs")}</th><th>Status</th></tr></thead>
          <tbody>
            {rows.slice(0, 60).map((r) => (
              <tr key={r.key}>
                <td className="num">{label(r.day)}</td><td className="num">{coverWkn(r.sym)}</td><td>{cover(r.sym)}</td><td>{r.side === "buy" ? t("Buy", "Kauf") : t("Sell", "Verkauf")}</td><td className="r num">{qtyFmt(r.qty)}</td>
                <td>{r.type === "market" ? t("best price", "bestens") : t(r.type, r.type === "savings plan" ? "Sparplan" : r.type === "limit" ? "Limit" : "Stop")}</td><td className="r num">{r.limit ? num(r.limit) : ""}</td>
                <td><span className={`status ${r.status}`}>● {t(r.status, r.status === "open" ? "offen" : r.status === "executed" ? "ausgeführt" : "verfallen")}</span>{r.status === "open" && r.id && <button className="pt-link xs" onClick={() => cancel(r.id!)}> {t("cancel", "streichen")}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pt-foot xs">{rows.length} {t("orders", "Orders")}</div>
    </Widget>
  );
}

function NewsWidget({ news, day, sel, setSel, label, simulated, cover, breaking }: {
  news: News[]; day: number; sel: string | null; setSel: (id: string) => void; label: (d: number) => string; simulated: boolean; cover: (s: string) => string; breaking?: string;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const [card, setCard] = useState<string | null>(null);
  const list = news.filter((n) => !q || t(n.headline).toLowerCase().includes(q.toLowerCase()));
  const item = news.find((n) => n.id === sel) ?? null;
  const revealed = (n: News) => day >= n.day + 2 || day >= 1e9;
  return (
    <Widget id="w-news" title="News" className="g-news" actionsSlot={<span className="sim-label">{simulated ? t("Simulated", "Simuliert") : t("Retold history", "Nacherzählte Geschichte")}</span>}>
      <div className="pt-search"><input placeholder={t("WKN, ISIN, name", "WKN, ISIN, Name")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search news", "News durchsuchen")} /></div>
      <div className="pt-news-list">
        <table className="pt-table">
          <thead><tr><th>{t("Date, time", "Datum, Zeit")}</th><th>{t("Headline", "Schlagzeile")}</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={2} className="muted">{t("No news yet. Press play.", "Noch keine News. Drück auf Play.")}</td></tr>}
            {list.map((n) => (
              <tr key={n.id} className={`clickable ${sel === n.id ? "sel" : ""} ${n.major ? "major" : ""} ${breaking === n.id ? "breaking" : ""}`} onClick={() => setSel(n.id)}>
                <td className="num nowrap">{label(n.day)} {n.time.slice(0, 5)}</td>
                <td>{n.sym ? <span className="muted">{cover(n.sym)}: </span> : null}{t(n.headline)}{n.major && revealed(n) && <span className={`kind k-${n.kind}`}>{t(KIND_LABEL[n.kind])}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {item && (
        <div className="pt-news-detail">
          <strong>{item.sym ? `${cover(item.sym)}: ` : ""}{t(item.headline)}</strong>
          <span className="xs muted">{t("From", "Von")} {t(item.source)} | {label(item.day)} {item.time}</span>
          {item.body && <p className="small">{t(item.body)}</p>}
          {item.major ? (revealed(item) ? (
            <p className="small reveal-why"><span className={`kind k-${item.kind}`}>{t(KIND_LABEL[item.kind])}</span> {t(item.explain)} <button className="pt-link" onClick={() => setCard(item.concept)}>{t("Concept card ›", "Wissenskarte ›")}</button></p>
          ) : <p className="xs muted">{t("What kind of news is this? The type is revealed after the price reaction.", "Welche Art von News ist das? Die Art wird nach der Kursreaktion aufgedeckt.")}</p>) : null}
        </div>
      )}
      {card && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label={t("Concept card", "Wissenskarte")} onClick={() => setCard(null)}>
          <div className="modal modal-mid" onClick={(e) => e.stopPropagation()}>
            <div className="card-row"><ConceptCard id={card} /></div>
            <button className="btn btn-outline" style={{ alignSelf: "center" }} onClick={() => setCard(null)}>{t("Close", "Schließen")}</button>
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
  const t = useT();
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
  const venue = comps.find((company) => company.sym === sym)?.venue ?? "Xetra";
  const mid = priceAt(u, sym, sim.day);
  const n = parseInt(qty, 10) || 0;
  const lim = Number(limit.replace(",", ".")) || 0;
  const px = side === "buy" ? ask(mid) : bid(mid);
  const est = type === "limit" && lim ? (side === "buy" ? Math.min(lim, px) : Math.max(lim, px)) : px;
  const vol = round2(est * n), f = n ? fee(vol) : 0;
  const pick = (s: string) => { setLocalSym(s); setSym(s); setMsg(null); };
  function submit() {
    const res = order({ sym, side, qty: n, type, limit: lim, validity, exchange: venue });
    setMsg(res.error ? { ok: false, text: t(res.error) } : { ok: true, text: res.filled ? t(`Executed: ${side === "buy" ? "bought" : "sold"} ${n} × ${cover(sym)}.`, `Ausgeführt: ${n} × ${cover(sym)} ${side === "buy" ? "gekauft" : "verkauft"}.`) : t(`Order placed in the orderbook (${type} ${num(lim)} €).`, `Order ins Orderbuch gelegt (${type === "stop" ? "Stop" : "Limit"} ${num(lim)} €).`) });
  }
  return (
    <div className="ow" role="dialog" aria-label="Order" data-tour="w-order">
      <div className="pt-w-head"><strong>⇄ Order</strong><span className="pt-w-tools"><button className="pt-close" onClick={onClose} aria-label={t("Close order window", "Orderfenster schließen")}>✕</button></span></div>
      <div className="ow-body">
        <div className="ow-side" role="group" aria-label={t("Buy or sell", "Kauf oder Verkauf")}>
          <button className="buy" aria-pressed={side === "buy"} onClick={() => setSide("buy")}>✓ {t("Buy", "Kauf")}</button>
          <button className="sell" aria-pressed={side === "sell"} onClick={() => setSide("sell")}>✕ {t("Sell", "Verkauf")}</button>
        </div>
        <div className="ow-row">
          <label><span>{t("Instrument", "Wertpapier")}</span><select value={sym} onChange={(e) => pick(e.target.value)}>{comps.map((c) => <option key={c.sym} value={c.sym}>{coverWkn(c.sym)} · {cover(c.sym)}</option>)}</select></label>
          <label><span>{t("Exchange", "Handelsplatz")}</span><select key={venue} defaultValue={venue}><option>{venue}</option></select></label>
        </div>
        <strong className="ow-name"><span className="ok-dot" aria-hidden /> {cover(sym)}</strong>
        <div className="ow-quote num">
          <div><span className="xs muted">{t("Ask (EUR)", "Brief (EUR)")}</span><strong>{num(ask(mid))}</strong><button className="ow-as" onClick={() => { setType("limit"); setLimit(num(ask(mid))); }}>{t("As limit", "Als Limit")}</button></div>
          <div className="r"><span className="xs muted">{t("Bid (EUR)", "Geld (EUR)")}</span><strong>{num(bid(mid))}</strong><button className="ow-as" onClick={() => { setType("limit"); setLimit(num(bid(mid))); }}>{t("As limit", "Als Limit")}</button></div>
        </div>
        <div className="pt-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "std"} onClick={() => setTab("std")}>{t("Standard order", "Standardorder")}</button>
          <button role="tab" aria-selected={tab === "plan"} onClick={() => setTab("plan")} data-tour="w-order-plan" disabled={!planAllowed} title={planAllowed ? "" : t("Unlocks in Module 4", "Wird in Modul 4 freigeschaltet")}>{planAllowed ? "" : "🔒 "}{t("Savings plan", "Sparplan")}</button>
        </div>
        {tab === "std" ? (
          <>
            <div className="ow-row">
              <label><span>{t("Qty", "Stück")}</span><input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
              <span className="xs muted ow-avail num">{t("Available", "Verfügbar")}: {eur(sim.acct.cash)}<br />{t("Est. amount", "Vorauss. Betrag")}: {eur(side === "buy" ? vol + f : vol - f)}</span>
            </div>
            <div className="ow-grid">
              <span>{t("Order type", "Orderart")}</span><select value={type} onChange={(e) => setType(e.target.value as OrderType)}><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option></select>
              {type !== "market" && <><span>{type === "limit" ? "Limit (EUR)" : "Stop (EUR)"}</span><input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={num(px)} /></>}
              <span>{t("Validity", "Gültigkeit")}</span><select value={validity} onChange={(e) => setValidity(e.target.value as Validity)}><option value="day">{t("Good for day", "Tagesgültig")}</option><option value="ultimo">{t("Until end of month", "Ultimo (Monatsende)")}</option><option value="max">{t("Maximum", "Maximal")}</option></select>
            </div>
            <button className="pt-link xs ow-costs" onClick={() => setCosts(!costs)}>{costs ? t("Hide order costs", "Orderkosten ausblenden") : t("Show order costs", "Orderkosten anzeigen")} ›</button>
            {costs && <div className="ow-costs-box xs num">{t("Price value", "Kurswert")} {eur(vol)} · {t("Fee", "Gebühr")} {eur(f)} {vol ? `(${num((f / vol) * 100)} %)` : ""}</div>}
            {msg && <p className={`xs ${msg.ok ? "up" : "error"}`} role="status">{msg.text}</p>}
            <button className={`ow-go ${side}`} onClick={submit} disabled={disabled}>{side === "buy" ? t("Buy (with costs)", "Kostenpflichtig kaufen") : t("Sell", "Verkaufen")}</button>
          </>
        ) : (
          <>
            <p className="xs muted">{t("Invests the same amount every month, automatically. No fixed fee, 1,5 % per execution; fractional shares allowed.", "Investiert jeden Monat automatisch denselben Betrag. Keine fixe Gebühr, 1,5 % pro Ausführung; Bruchstücke möglich.")}</p>
            <div className="ow-grid">
              <span>{t("Amount per month (EUR)", "Betrag pro Monat (EUR)")}</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
              <span>{t("Start", "Start")}</span><select defaultValue="next"><option value="next">{t("Next trading day", "Nächster Handelstag")}</option></select>
            </div>
            {msg && <p className={`xs ${msg.ok ? "up" : "error"}`} role="status">{msg.text}</p>}
            <button className="ow-go buy" disabled={disabled || !(Number(amount) >= 1)} onClick={() => { setPlan(sym, Number(amount)); setMsg({ ok: true, text: t(`Savings plan set up: ${eur(Number(amount))} every month on ${cover(sym)}.`, `Sparplan eingerichtet: ${eur(Number(amount))} jeden Monat auf ${cover(sym)}.`) }); }}>{t("Set up savings plan", "Sparplan einrichten")}</button>
          </>
        )}
      </div>
    </div>
  );
}
