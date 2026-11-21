"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { actions } from "@/features/game/store";
import CardArt, { CARD_SHORT } from "@/features/learn/CardArt";
import LineChart from "@/shared/charts/LineChart";
import CountUp from "@/shared/ui/CountUp";
import Glyph from "@/shared/ui/Glyph";
import Icon from "@/shared/ui/Icon";
import { num, signed } from "@/shared/lib/format";
import { income, JARS, netWorth, newGame, nextYear, nudge, realValue, result, START_AGE, YEARS, type Game, type Jar, type RivalId } from "./engine";
import { begin, choose, eventOf, titleOf } from "./events";
import { dict, useT } from "@/shared/lib/i18n";
import s from "./InvestorSim.module.css";

const eur0 = (n: number) => `${num(Math.round(n) || 0, 0)} €`; // `|| 0`: no "−0 €"
const pctFmt = (r: number) => `${signed(r * 100, 1)} %`;

const JAR: Record<Jar, { name: string; short: string }> = {
  cushion: { name: "Cushion", short: "1,5 %, pays surprise bills" },
  etf: { name: "World ETF", short: "About 7 % a year, with swings" },
  stock: { name: "Single stocks", short: "Big swings, can go to zero" },
  spend: { name: "Enjoy", short: "Keeps your joy of life up" },
};
// Icons say what each pot is: a safe, a basket of companies, one egg, a lock.
const WALLET: { key: "cushion" | "etf" | "stock" | "debt"; name: string; icon: string }[] = [
  { key: "etf", name: "World ETF", icon: "basket" }, { key: "stock", name: "Single stocks", icon: "egg" }, { key: "cushion", name: "Cushion", icon: "anna" }, { key: "debt", name: "Loan", icon: "lock" },
];
// Chart: you in ink, rivals all in ink-2 told apart by stroke pattern (light greys fail 3:1 on white).
const RIVALS: Record<RivalId | "you", { name: string; habit: string; icon: string; color: string; width: number; dash?: string }> = {
  you: { name: "You", habit: "Your choices", icon: "you", color: "var(--color-ink)", width: 3.5 },
  anna: { name: "Careful Anna", habit: "Everything in the savings account", icon: "anna", color: "var(--color-ink-2)", width: 2, dash: "6 5" },
  max: { name: "Trader Max", habit: "Hot stocks; sells every crash", icon: "max", color: "var(--color-ink-2)", width: 2 },
  sleeper: { name: "Did nothing", habit: "Cash under the mattress", icon: "sleeper", color: "var(--color-ink-2)", width: 2.5, dash: "1 5" },
};
const STAR_RULES = ["Beat Careful Anna and the mattress", "Beat Trader Max", "No forced sales, no loans"];
const ORDINAL = ["1st", "2nd", "3rd", "4th"];
const lifeWord = (j: number) => (j >= 70 ? "Thriving" : j >= 45 ? "Balanced" : j >= 25 ? "Tight" : "Grey");
dict({
  Cushion: "Polster", "1,5 %, pays surprise bills": "1,5 %, zahlt überraschende Rechnungen", "World ETF": "Welt-ETF", "About 7 % a year, with swings": "Etwa 7 % pro Jahr, mit Schwankungen",
  "Single stocks": "Einzelaktien", "Big swings, can go to zero": "Große Schwankungen, kann auf null fallen", Enjoy: "Genießen", "Keeps your joy of life up": "Hält deine Lebensfreude hoch", Loan: "Kredit",
  You: "Du", "Your choices": "Deine Entscheidungen", "Careful Anna": "Vorsichtige Anna", "Everything in the savings account": "Alles auf dem Sparkonto",
  "Trader Max": "Trader Max", "Hot stocks; sells every crash": "Heiße Aktien; verkauft bei jedem Crash", "Did nothing": "Nichts getan", "Cash under the mattress": "Bargeld unter der Matratze",
  "Beat Careful Anna and the mattress": "Schlag die vorsichtige Anna und die Matratze", "Beat Trader Max": "Schlag Trader Max", "No forced sales, no loans": "Keine Notverkäufe, keine Kredite",
  "1st": "Platz 1", "2nd": "Platz 2", "3rd": "Platz 3", "4th": "Platz 4", Thriving: "Blühend", Balanced: "Ausgeglichen", Tight: "Knapp", Grey: "Grau",
});
const BEST_KEY = "cd-edu-invsim-best";

type Best = { worth: number; stars: number };
function readBest(): Best | null {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) ?? "null"); } catch { return null; }
}

/** Investor Simulator: 30 years of a life in about ten minutes. One event and one money decision per year. */
export default function InvestorSim() {
  const [g, setG] = useState<Game | null>(null);
  const [best, setBest] = useState<Best | null>(null);
  useEffect(() => { const t = setTimeout(() => setBest(readBest()), 0); return () => clearTimeout(t); }, []);

  const start = () => { setG(newGame(Math.floor(Math.random() * 1e6) + 1, begin)); window.scrollTo({ top: 0 }); };

  return (
    <main className={`container ${s.page}`}>
      {!g ? <Intro onStart={start} best={best} />
        : g.year >= YEARS ? <End g={g} onAgain={start} best={best} setBest={setBest} />
        : <Play g={g} setG={setG} />}
    </main>
  );
}

// ── Intro ─────────────────────────────────────────────────────────────────

function Intro({ onStart, best }: { onStart: () => void; best: Best | null }) {
  const t = useT();
  return (
    <>
      <section className={`${s.stage} ${s.introStage}`}>
        <div className={s.stageText}>
          <Link className={s.backLink} href="/">{t("‹ Learning map", "‹ Lernpfad")}</Link>
          <h1>{t("30 years of life", "30 Jahre Leben")}<br />{t("in 10 minutes", "in 10 Minuten")}</h1>
          <div className="row">
            <button className={`btn btn-primary btn-lg ${s.go}`} onClick={onStart}>{t("Start", "Starten")} <span className="btn-context">{t("Age", "Alter")} {START_AGE}</span><Arrow /></button>
            {best && <span className={`xs ${s.best}`}>{t("Your best", "Dein Bestwert")}: <strong className="num">{eur0(best.worth)}</strong> · {t(`${best.stars} of 3 stars`, `${best.stars} von 3 Sternen`)}</span>}
          </div>
        </div>
        <div className={s.lifePreview}>
          <h2>{t("Your money at 60", "Dein Geld mit 60")}</h2>
          <LifeCurve you={DEMO.you} anna={DEMO.anna} sleeper={DEMO.sleeper} crash={DEMO.crash} compact />
          <div className={`xs ${s.previewFooter}`}><span className={s.previewLegend}>{t("Your choices")}</span><span>{t("30 years ahead", "30 Jahre voraus")}</span></div>
        </div>
      </section>

      <section className={s.introGrid}>
        <div>
          <h2 className={s.h2}>{t("Four places for your money", "Vier Orte für dein Geld")}</h2>
          <ul className={s.jarList}>
            {JARS.map((j) => (
              <li key={j}><span className={s.swatch} data-jar={j} /><span><strong>{t(JAR[j].name)}</strong><span className="xs muted">{t(JAR[j].short)}</span></span></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={s.h2}>{t("Your rivals", "Deine Rivalen")}</h2>
          <ul className={s.rivalList}>
            {(["anna", "max", "sleeper"] as RivalId[]).map((id) => (
              <li key={id}><Icon name={RIVALS[id].icon} size={32} round /><strong>{t(RIVALS[id].name)}</strong></li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

// ── One year ──────────────────────────────────────────────────────────────

function Play({ g, setG }: { g: Game; setG: (g: Game) => void }) {
  const t = useT();
  const ev = eventOf(g);
  const age = START_AGE + g.year;
  const worth = netWorth(g.wallet);
  // Count from the last shown value to the new one (state from the previous render, React's documented pattern).
  const [tick, setTick] = useState({ from: worth, to: worth });
  if (tick.to !== worth) setTick({ from: tick.to, to: worth });
  const inc = income(g);
  const waiting = !!ev.choices && !g.picked;
  const last = g.year > 0 ? { r: g.returns[g.year - 1], d: g.worth[g.year] - g.worth[g.year - 1] } : null;
  const race = [{ id: "you" as const, w: worth }, ...(["anna", "max", "sleeper"] as RivalId[]).map((id) => ({ id, w: g.rivals[id][g.year] }))].sort((a, b) => b.w - a.w);
  const next = () => { setG(nextYear(g, begin)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  // Tips of events without a choice stay folded until asked for; choice outcomes and bills always show.
  const [tipYear, setTipYear] = useState(-1);
  const tipOpen = !!ev.choices || tipYear === g.year;

  const leader = race[0].w || 1;

  return (
    <div className={s.grid}>
        {/* One petrol band for the whole picture: age and year, your money, the race. */}
        <section className={s.band} aria-label={t("Your life so far", "Dein Leben bisher")}>
          <div className={s.age}>
            <span className="xs">{t("Age", "Alter")}</span>
            <strong className="num">{age}</strong>
            <span className={`xs ${s.yearOf}`}>{t(`Year ${g.year + 1} of ${YEARS}`, `Jahr ${g.year + 1} von ${YEARS}`)}</span>
            <span className={s.yearBar} aria-hidden><span style={{ height: `${((g.year + 1) / YEARS) * 100}%` }} /></span>
          </div>
          <div className={s.budget}>
            <div className={s.budgetHead}>
              <span className="xs">{t("Your money", "Dein Geld")}</span>
              <strong className={`num ${s.total}`}><CountUp key={tick.to} from={Math.round(tick.from)} to={Math.round(tick.to)} active duration={900} delay={0} format={eur0} /></strong>
              {last && <span className={`xs ${s.delta}`}><strong className={`num ${last.d >= 0 ? s.up : s.down}`}>{signed(Math.round(last.d), 0)} €</strong> {t("last year · market", "letztes Jahr · Markt")} <strong className={`num ${last.r >= 0 ? s.up : s.down}`}>{pctFmt(last.r)}</strong></span>}
            </div>
            <div className={s.bar} aria-hidden>
              {WALLET.filter((w) => w.key !== "debt").map((w) => <span key={w.key} data-jar={w.key} style={{ flexGrow: Math.max(0, g.wallet[w.key]) }} />)}
            </div>
            <ul className={s.pots}>
              {WALLET.filter((w) => w.key !== "debt" || g.wallet.debt > 0).map((w) => (
                <li key={w.key}>
                  <span className={s.potIcon} data-pot={w.key}><Icon name={w.icon} size={30} round /></span>
                  <span className={s.potText}><span className="xs">{t(w.name)}</span><strong className={`num ${w.key === "debt" ? s.down : ""}`}>{w.key === "debt" ? "−" : ""}{eur0(g.wallet[w.key])}</strong></span>
                </li>
              ))}
            </ul>
            {/* Joy of life: fades every year on its own; only the Enjoy share (and some events) lift it. */}
            <div className={s.joy}>
              <span className={`xs ${s.joyLabel}`}>{t("Joy of life", "Lebensfreude")}</span>
              <span className={s.joyBar} role="meter" aria-valuenow={g.joy} aria-valuemin={0} aria-valuemax={100} aria-label={t("Joy of life", "Lebensfreude")} style={{ "--joy": g.joy } as React.CSSProperties}><span className={s.joyFill} /></span>
              <strong className={`xs ${s.joyWord}`}>{t(lifeWord(g.joy))}</strong>
            </div>
          </div>
          {/* The race: one compact row per player, ranked; the thin bar shows how close each is to the leader. */}
          <div className={s.raceBox} role="group" aria-labelledby="race-h">
            <span id="race-h" className="xs">{t("The race", "Das Rennen")}</span>
            <ol className={s.lanes}>
              {race.map((r, place) => (
                <li key={r.id} className={r.id === "you" ? s.laneMe : ""} aria-label={`${t(ORDINAL[place])}: ${t(RIVALS[r.id].name)}, ${eur0(r.w)}`}>
                  <span className={`num ${s.lanePlace}`}>{place + 1}</span>
                  {r.id === "you" ? <span style={{ width: 24, display: "grid", placeItems: "center" }}><Icon name="you" size={16} color="var(--color-accent)" /></span> : <Icon name={RIVALS[r.id].icon} size={24} round />}
                  <span className={s.laneMain}>
                    <span className={s.laneTop}><span className={s.laneName}>{t(RIVALS[r.id].name)}</span><strong className="num">{eur0(r.w)}</strong></span>
                    <span className={s.lane} aria-hidden><span className={s.laneFill} style={{ width: `${Math.max(0, r.w / leader) * 100}%` }} /></span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`card ${s.event}`} key={g.year} aria-live="polite">
          <div className={s.evHead}>
            <span className={s.evIcon}><Icon name={ev.icon} size={56} round /></span>
            <h2>{t(titleOf(g))}</h2>
          </div>
          <p className={s.body}>{t(ev.body(g))}</p>

          {ev.choices && (
            <div className={s.choices} role="group" aria-label={t("Your choice", "Deine Entscheidung")}>
              {ev.choices.map((c) => (
                <button key={c.id} className={`option option-lg ${s.choice}`} aria-pressed={g.picked === c.id} disabled={!!g.picked && g.picked !== c.id}
                  onClick={() => setG(choose(g, c.id))}>
                  <strong>{t(c.label)}</strong><span className="xs">{t(c.hint)}</span>
                </button>
              ))}
            </div>
          )}

          {g.note && !ev.choices && (
            <button className={`btn btn-outline btn-sm ${s.tipBtn}`} aria-expanded={tipOpen} onClick={() => setTipYear(tipOpen ? -1 : g.year)}>
              <Icon name="card" size={18} /> {tipOpen ? t("Hide tip", "Tipp ausblenden") : t("Show tip", "Tipp anzeigen")}
            </button>
          )}
          {g.note && (tipOpen || g.alert) && (
            <div className={s.outcome}>
              {tipOpen && <p>{t(g.note)}</p>}
              {g.alert && <p className={s.alert}>{t(g.alert)}</p>}
            </div>
          )}
          {ev.concept && <span className={`${s.concept} ${s.evConcept}`}><CardArt id={ev.concept} size={28} /><span className="xs">{t("Concept", "Konzept")}: <strong>{t(CARD_SHORT[ev.concept])}</strong></span></span>}
        </section>

        <section className={`card ${s.panel} ${s.planPanel}`} aria-labelledby="plan-h">
          <h3 id="plan-h" className={s.panelHead}>{t("Split this year’s money", "Teil das Geld dieses Jahres auf")} <span className="num">{eur0(inc)}</span></h3>
          <div className={s.bar} aria-hidden>{JARS.map((j) => <span key={j} data-jar={j} style={{ flexGrow: g.split[j] }} />)}</div>
          <ul className={s.jars}>
            {JARS.map((j) => (
              <li key={j}>
                <span className={s.jarText}>
                  <strong><span className={s.swatch} data-jar={j} />{t(JAR[j].name)}</strong>
                  <span className="xs muted">{t(JAR[j].short)}</span>
                </span>
                {/* − [percent over its euros] +, one centred column */}
                <span className={s.stepper}>
                  <button className={s.step} aria-label={t(`Less to ${JAR[j].name}`, `Weniger für ${t(JAR[j].name)}`)} disabled={g.split[j] <= 0} onClick={() => setG({ ...g, split: nudge(g.split, j, -1) })}><Glyph name="minus" /></button>
                  <span className={s.pctBox}>
                    <span className={`num ${s.pct}`}>{g.split[j] * 10} %</span>
                    <span className={`num xs ${s.amt}`}>{eur0((inc * g.split[j]) / 10)}</span>
                  </span>
                  <button className={s.step} aria-label={t(`More to ${JAR[j].name}`, `Mehr für ${t(JAR[j].name)}`)} disabled={g.split[j] >= 10} onClick={() => setG({ ...g, split: nudge(g.split, j, 1) })}><Glyph name="plus" /></button>
                </span>
              </li>
            ))}
          </ul>
          {/* The year ends where the split is set: event → choice → split → go. */}
          <div className={s.turn}>
            <button className={`btn btn-primary btn-lg ${s.go}`} disabled={waiting} onClick={next}>
              {g.year === YEARS - 1 ? t("Retire at 60", "Mit 60 in Rente") : <>{t("Next year", "Nächstes Jahr")}<span className="btn-context">{t("age", "Alter")} {age + 1}</span></>}
              <Arrow />
            </button>
            {waiting && <span className="xs muted">{t("Make this year’s choice first", "Triff zuerst die Entscheidung dieses Jahres")}</span>}
          </div>
        </section>
    </div>
  );
}

// ── At 60 ─────────────────────────────────────────────────────────────────

function End({ g, onAgain, best, setBest }: { g: Game; onAgain: () => void; best: Best | null; setBest: (b: Best) => void }) {
  const t = useT();
  const r = result(g);
  const starCount = r.stars.filter(Boolean).length;
  const [shown, setShown] = useState(false);
  const [isBest] = useState(() => !best || r.worth > best.worth); // frozen: setBest below would flip it on re-render
  const decisions = g.log.filter((l) => l.choice);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 50);
    actions.award("invsim-finish", 60);
    if (starCount === 3) actions.award("invsim-3stars", 40);
    if (isBest) {
      const b = { worth: r.worth, stars: starCount };
      try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* private mode: no personal best */ }
      setBest(b);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when the game ends
  }, []);

  const placeWord = t(ORDINAL[r.place - 1]);
  return (
    <>
      <section className={`${s.stage} ${s.endStage}`}>
        <div className={s.stageText}>
          <p className={s.endLine}>{t("At 60, you have", "Mit 60 hast du")}</p>
          <p className={`num ${s.big}`}><CountUp to={Math.round(r.worth)} active={shown} duration={1600} format={eur0} /></p>
          <p className={s.lead}>{t(`${placeWord} of 4. In today’s money that’s about ${eur0(realValue(r.worth))}, after 2 % inflation a year.`, `${placeWord} von 4. In heutigem Geld sind das etwa ${eur0(realValue(r.worth))}, nach 2 % Inflation pro Jahr.`)}{isBest && best ? t(" A new personal best.", " Ein neuer persönlicher Bestwert.") : ""}</p>
          <ul className={s.stars}>
            {r.stars.map((ok, i) => (
              <li key={i} className={ok ? s.starOn : ""}><Star /><span className="xs">{t(STAR_RULES[i])}</span></li>
            ))}
          </ul>
          <div className="row">
            <button className={`btn btn-primary btn-lg ${s.go}`} onClick={onAgain}>{t("Live another life", "Noch ein Leben leben")} <Arrow /></button>
            <Link className="btn btn-outline-light btn-lg" href="/">{t("Back to the learning path", "Zurück zum Lernpfad")}</Link>
          </div>
        </div>
        {/* The intro's curve again, now drawn from this life. */}
        <LifeCurve you={g.worth} anna={g.rivals.anna} sleeper={g.rivals.sleeper} end={r.worth} />
      </section>

      <div className={s.endGrid}>
        <section className={`card ${s.panel}`} aria-labelledby="chart-h">
          <h2 id="chart-h" className={s.h2}>{t("30 years, four habits", "30 Jahre, vier Gewohnheiten")}</h2>
          {/* "You" first in the list (LineChart scales from series[0]) but drawn last, on top. */}
          <LineChart height={260} topLast series={(["you", "anna", "max", "sleeper"] as const).map((id) => ({ label: t(RIVALS[id].name), color: RIVALS[id].color, width: RIVALS[id].width, dash: RIVALS[id].dash, values: id === "you" ? g.worth : g.rivals[id] }))} />
          <div className={`xs muted num ${s.axis}`} aria-hidden>{[30, 40, 50, 60].map((a) => <span key={a}>{a}</span>)}</div>
          <ul className={s.legend}>
            {(["you", "anna", "max", "sleeper"] as const).map((id) => (
              <li key={id}><svg width="22" height="6" aria-hidden><line x1="2" y1="3" x2="20" y2="3" stroke={RIVALS[id].color} strokeWidth={RIVALS[id].width} strokeDasharray={RIVALS[id].dash} strokeLinecap="round" /></svg>{t(RIVALS[id].name)}</li>
            ))}
          </ul>
        </section>
        <section className={`card ${s.panel}`} aria-labelledby="board-h">
          <h2 id="board-h" className={s.h2}>{t("Final standings", "Endstand")}</h2>
          <ol className={s.race}>
            {r.board.map((b, i) => (
              <li key={b.id} className={b.id === "you" ? s.me : ""}>
                <span className={`num xs ${s.place}`}>{i + 1}</span>
                <Icon name={RIVALS[b.id].icon} size={40} round />
                <span className={s.raceName}><strong>{t(RIVALS[b.id].name)}</strong><span className="xs muted">{b.id === "you" ? t(`Joy of life at 60: ${lifeWord(g.joy)}`, `Lebensfreude mit 60: ${t(lifeWord(g.joy))}`) : t(RIVALS[b.id].habit)}</span></span>
                <span className="num small">{eur0(b.worth)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {decisions.length > 0 && (
        <section className={`card ${s.panel}`} aria-labelledby="dec-h">
          <h2 id="dec-h" className={s.h2}>{t("Your big decisions", "Deine großen Entscheidungen")}</h2>
          <ol className={s.decisions}>
            {decisions.map((l) => (
              <li key={l.year}>
                <span className={`num ${s.decAge}`}>{l.age}</span>
                <span className={s.decText}>
                  <span><strong>{t(l.choice!)}</strong>{l.tone !== "neutral" && <span className={`badge ${l.tone === "good" ? "badge-dark" : ""} ${s.verdict}`}>{l.tone === "good" ? t("Paid off", "Hat sich gelohnt") : t("Cost you", "Hat gekostet")}</span>}</span>
                  <span className="small muted">{t(l.title)} · {t(l.note)}</span>
                </span>
                {l.concept && <span className={s.concept}><CardArt id={l.concept} size={28} /><span className="xs">{t(CARD_SHORT[l.concept])}</span></span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

// ── The life curve: 30 → 60 as a line that compounds ─────────────────────

/** Illustrative intro curve: steady saving at ~7 % with one crash. Not a forecast; the game's own numbers replace it at 60. */
const DEMO = (() => {
  const you = [0], anna = [0], sleeper = [0];
  for (let y = 1; y <= YEARS; y++) {
    const inc = 4000 * 1.03 ** y;
    you.push((you[y - 1] * (y === 9 ? 0.66 : y === 10 ? 1.27 : 1.075)) + inc);
    anna.push(anna[y - 1] * 1.015 + inc);
    sleeper.push(sleeper[y - 1] + inc);
  }
  return { you, anna, sleeper, crash: 9 };
})();

const CW = 340, CH = 230, PX = 14, TOP = 26, BASE = 196;
/** Petrol-stage chart: your line in yellow climbing past the dashed savings account and the dotted mattress. Draws itself in once. */
function LifeCurve({ you, anna, sleeper, crash, end, compact = false }: { you: number[]; anna: number[]; sleeper: number[]; crash?: number; end?: number; compact?: boolean }) {
  const t = useT();
  const base = compact ? 126 : BASE;
  const top = compact ? 20 : TOP;
  const height = compact ? 156 : CH;
  const max = Math.max(...you, ...anna, ...sleeper, 1);
  const n = you.length - 1;
  const x = (i: number) => PX + (i / n) * (CW - 2 * PX);
  const y = (v: number) => base - (Math.max(0, v) / max) * (base - top);
  const path = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const last = you[n];
  return (
    <svg className={s.curve} viewBox={`0 0 ${CW} ${height}`} role="img"
      aria-label={end ? t(`Your net worth from 30 to 60, ending at ${eur0(end)}`, `Dein Vermögen von 30 bis 60, am Ende ${eur0(end)}`) : t("Illustration: steady investing climbs past the savings account and the mattress over 30 years", "Illustration: Stetiges Investieren zieht über 30 Jahre an Sparkonto und Matratze vorbei")}>
      {[0.33, 0.66].map((f) => <line key={f} x1={PX} x2={CW - PX} y1={base - f * (base - top)} y2={base - f * (base - top)} className={s.curveGrid} />)}
      <path d={`${path(you)}L${x(n)} ${base}L${x(0)} ${base}Z`} className={s.curveArea} />
      <path d={path(sleeper)} className={s.curveSleeper} />
      <path d={path(anna)} className={s.curveAnna} />
      <path d={path(you)} className={s.curveYou} pathLength={1} />
      {crash !== undefined && (
        <g className={s.curveNote}>
          <circle cx={x(crash)} cy={y(you[crash])} r={4} />
        </g>
      )}
      <g className={s.curveEnd}>
        <circle cx={x(n)} cy={y(last)} r={13} className={s.curvePulse} />
        <circle cx={x(n)} cy={y(last)} r={6} />
      </g>
      <line x1={PX} x2={CW - PX} y1={base} y2={base} className={s.curveAxis} />
      {[30, 40, 50, 60].map((a, i) => (
        <text key={a} x={x((i / 3) * n)} y={base + 22} textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"} className={a === 60 ? s.curveAge60 : s.curveAge}>{a}</text>
      ))}
    </svg>
  );
}

const Arrow = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Star = () => <svg className={s.starGlyph} viewBox="0 0 16 16" aria-hidden><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="currentColor" /></svg>;
