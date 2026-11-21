"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { num } from "@/shared/lib/format";
import { PERSONAS, personaFor, type Answers, type PersonaId } from "@/features/game/personas";
import { actions } from "@/features/game/store";
import { setUi } from "@/features/game/ui";
import CardArt from "@/features/learn/CardArt";
import CountUp from "@/shared/ui/CountUp";
import s from "./Onboarding.module.css";

type Opt = { label: string; art: ReactNode };
const QUESTIONS: { key: keyof Answers; q: string; options: Opt[] }[] = [
  { key: "goal", q: "What are you saving for?", options: [
    { label: "First steps", art: <CardArt id="goal-start" size={64} /> },
    { label: "Kids & a home", art: <CardArt id="goal-home" size={64} /> },
    { label: "Retirement", art: <CardArt id="goal-retire" size={64} /> },
  ] },
  { key: "horizon", q: "When do you need the money?", options: [
    { label: "years", art: <Big>&lt;5</Big> },
    { label: "years", art: <Big>5 – 15</Big> },
    { label: "years", art: <Big>15+</Big> },
  ] },
  { key: "experience", q: "Bought a stock before?", options: [
    { label: "Never", art: <Meter n={0} /> },
    { label: "Once or twice", art: <Meter n={1} /> },
    { label: "Regularly", art: <Meter n={3} /> },
  ] },
];

// Players who trade regularly can prove it and skip World 1.
const CHECK = [
  { q: "Limit buy at 50 €, price is 55 €. The order…", options: ["Buys at 55 €", "Waits for ≤ 50 €", "Is cancelled"], answer: 1 },
  { q: "Money for stocks has to be on…", options: ["Trading account", "Credit card", "Any account"], answer: 0 },
  { q: "4,90 € fee on a 100 € order is about…", options: ["0,5 %", "5 %", "49 %"], answer: 1 },
];

const PERSONA_ART: Record<PersonaId, string> = { starter: "goal-start", builder: "goal-home", retiree: "goal-retire" };

/** Max. 4 screens, about 60 seconds: welcome + 3 questions → persona. */
export default function Onboarding() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [a, setA] = useState<Partial<Answers>>({});
  const [check, setCheck] = useState<number[]>([]);
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const expert = a.experience === 2;
  const checkPassed = check.filter((x, i) => x === CHECK[i].answer).length >= 2;
  const checkDone = check.filter((x) => x !== undefined).length === CHECK.length;

  function answer(key: keyof Answers, v: number) {
    const next = { ...a, [key]: v } as Answers;
    setA(next);
    if (screen < 3) setScreen(screen + 1);
    else if (v === 2) setScreen(4);
    else { setPersona(personaFor(next)); setScreen(5); }
  }

  function go(skip: boolean) {
    actions.setPersona(persona!, a as Answers, skip);
    setUi({});
    // Both paths land on the hub (learning map); "Start the tour" there opens World 1.
    router.push("/");
  }

  // Keys 1–3 pick an option on question screens.
  useEffect(() => {
    if (screen < 1 || screen > 3) return;
    const Q = QUESTIONS[screen - 1];
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < 3 && !e.metaKey && !e.ctrlKey && !e.altKey) answer(Q.key, i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const step = Math.min(screen, 4); // 0 welcome, 1–3 questions, 4 = check/result
  const P = persona ? PERSONAS[persona] : null;

  return (
    <main className={s.page}>
      {screen === 0 && <Rise />}
      <section className={s.stage} aria-live="polite">
        {screen > 0 && (
          <div className={s.top}>
            <button className={s.back} onClick={() => setScreen(screen === 5 && expert ? 4 : screen === 5 ? 3 : screen - 1)} aria-label="Back">
              <Arrow left />
            </button>
            <ol className={s.rail} aria-label={`Step ${step} of 4`} style={{ "--p": (step - 1) / 3 } as CSSProperties}>
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className={i < step ? s.done : i === step ? s.now : ""}>
                  {i < step ? <Check /> : i === 4 ? <StarGlyph /> : i}
                </li>
              ))}
            </ol>
          </div>
        )}

        {screen === 0 && (
          <div className={s.welcome} key="w">
            <div className={s.welcomeText}>
              <h1>Learn to invest.<br /><mark>Risk nothing.</mark></h1>
              <button className={`btn btn-primary btn-lg ${s.go}`} onClick={() => setScreen(1)}>
                Let’s go <span className={s.goSub}>60 sec</span><Arrow />
              </button>
            </div>
          </div>
        )}

        {screen >= 1 && screen <= 3 && (() => {
          const Q = QUESTIONS[screen - 1];
          return (
            <div className={s.body} key={Q.key}>
              <h1>{Q.q}</h1>
              <div className={s.options}>
                {Q.options.map((o, i) => (
                  <button key={i} className={s.option} aria-pressed={a[Q.key] === i} onClick={() => answer(Q.key, i)}
                    aria-label={Q.key === "horizon" ? `${["Less than 5", "5 to 15", "More than 15"][i]} years` : o.label}>
                    <kbd className={s.key} aria-hidden>{i + 1}</kbd>
                    <span className={s.optArt}>{o.art}</span>
                    <span className={s.optLabel}>{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {screen === 4 && (
          <div className={s.body} key="check">
            <h1>Prove it, skip World 1.</h1>
            <div className={s.quiz}>
              {CHECK.map((c, i) => (
                <fieldset key={c.q} className={s.qRow}>
                  <legend>{c.q}</legend>
                  <div className={s.seg}>
                    {c.options.map((o, k) => (
                      <button key={o} aria-pressed={check[i] === k} onClick={() => { const n = [...check]; n[i] = k; setCheck(n); }}>{o}</button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <button className={`btn btn-primary btn-lg ${s.go}`} disabled={!checkDone}
              onClick={() => { setPersona(personaFor(a as Answers)); setScreen(5); }}>
              See my path <Arrow />
            </button>
          </div>
        )}

        {screen === 5 && P && (
          <div className={s.result} key="r">
            <div className={s.resultMain}>
              <h1>You’re a <mark>{P.label}</mark></h1>
              <div className={s.who}>
                <span className={s.chip}><CardArt id={PERSONA_ART[P.id]} size={40} /></span>
                <span><strong>{P.who}</strong><span>{P.goal}</span></span>
              </div>
              <div className="row">
                <button className={`btn btn-primary btn-lg ${s.go}`} onClick={() => go(false)}>Let’s start <Arrow /></button>
                {expert && checkPassed && <button className={`btn btn-lg ${s.ghost}`} onClick={() => go(true)}>Skip to Pro</button>}
              </div>
              {expert && !checkPassed && <p className={s.note}>Not quite. World 1 is a good warm-up.</p>}
            </div>
            <div className={s.wallet}>
              <span className={s.walletLabel}>Play money</span>
              <strong className="num"><CountUp to={P.start} active format={(n) => num(n, 0)} delay={250} /> €</strong>
              <span className={s.walletLabel}>{P.horizon}</span>
            </div>
          </div>
        )}
        {screen === 5 && (
          <div className={s.switch} role="group" aria-label="Pick another path">
            {(Object.keys(PERSONAS) as PersonaId[]).map((id) => (
              <button key={id} aria-pressed={id === persona} onClick={() => setPersona(id)}>
                <span className={s.chip}><CardArt id={PERSONA_ART[id]} size={28} /></span>
                <span><strong>{PERSONAS[id].label}</strong><span className="num">{num(PERSONAS[id].start, 0)} €</span></span>
              </button>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}

function Big({ children }: { children: ReactNode }) { return <span className={s.big}>{children}</span>; }
function Meter({ n }: { n: number }) {
  return <span className={s.meter} aria-hidden>{[0, 1, 2].map((i) => <span key={i} className={i < n ? s.on : ""} />)}</span>;
}

const Arrow = ({ left }: { left?: boolean }) => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden style={left ? { transform: "scaleX(-1)" } : undefined}><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const StarGlyph = () => <svg className={s.glyph} viewBox="0 0 16 16" aria-hidden><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="currentColor" /></svg>;

// A rising price line along the bottom of the screen, edge to edge, over a petrol landscape: a dip on the way (the crash you'll survive), the yellow node where you are headed.
const RISE = "M0 372 L40 360 L80 366 L120 338 L160 346 L200 316 L240 326 L280 292 L320 304 L360 248 L400 262 L440 310 L480 290 L520 236 L560 250 L600 186 L640 168 L680 182 L720 84 L760 112 L800 96";
function Rise() {
  return (
    <div className={s.rise} aria-hidden>
      <svg viewBox="0 0 800 400" preserveAspectRatio="none">
        <defs>
          <linearGradient id="onb-rise" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-ink)" stopOpacity="0.92" />
            <stop offset="1" stopColor="var(--color-ink)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={`${RISE} L800 400 L0 400 Z`} fill="url(#onb-rise)" />
        {[200, 300].map((y) => <line key={y} x1="0" x2="800" y1={y} y2={y} className={s.grid} />)}
        <path d={RISE} className={s.riseLine} pathLength={1} />
      </svg>
      <span className={s.riseDot} />
    </div>
  );
}
