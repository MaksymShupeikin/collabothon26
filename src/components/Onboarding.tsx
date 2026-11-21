"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { num } from "@/lib/format";
import { PERSONAS, personaFor, type Answers, type PersonaId } from "@/lib/game/personas";
import { actions } from "@/lib/game/store";
import { setUi } from "@/lib/game/ui";

const QUESTIONS = [
  { key: "goal", q: "What are you saving for?", options: ["My first steps", "A big goal (kids, a home)", "Retirement"] },
  { key: "horizon", q: "When do you need the money?", options: ["In less than 5 years", "In 5 to 15 years", "In more than 15 years"] },
  { key: "experience", q: "Have you bought a stock before?", options: ["No", "Once or twice", "Regularly"] },
] as const;

// Players who trade regularly can prove it and skip World 1.
const CHECK = [
  { q: "A limit buy order at 50 € while the price is 55 €…", options: ["Buys at 55 €", "Waits until the price is 50 € or lower", "Is cancelled"], answer: 1 },
  { q: "Money for buying stocks has to be on…", options: ["The trading account (Verrechnungskonto)", "The credit card", "Any account"], answer: 0 },
  { q: "A fixed 4,90 € fee on a 100 € order is about…", options: ["0,5 %", "5 %", "49 %"], answer: 1 },
];

/** Max. 4 screens, about 60 seconds: welcome + 3 questions → persona. */
export default function Onboarding() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [a, setA] = useState<Partial<Answers>>({});
  const [check, setCheck] = useState<number[]>([]);
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const expert = a.experience === 2;
  const checkPassed = check.filter((x, i) => x === CHECK[i].answer).length >= 2;

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
    if (skip) router.push("/learn");
    else { actions.start("1.1"); router.push("/cabinet"); }
  }

  const step = Math.min(screen, 4);
  return (
    <main className="onb">
      <div className="onb-card">
        <div className="onb-dots" aria-label={`Screen ${step + 1} of 4`}>{[0, 1, 2, 3].map((i) => <span key={i} className={i <= step ? "on" : ""} />)}</div>
        {screen === 0 && (
          <div className="stack">
            <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>Training sandbox</span>
            <h1>Welcome to comdirect edu</h1>
            <p className="onb-lead">This is a copy of comdirect with play money. Nothing you do here costs real money.</p>
            <p className="small muted">Three quick questions, then you start. About 60 seconds.</p>
            <button className="btn btn-primary btn-lg" style={{ alignSelf: "flex-start" }} onClick={() => setScreen(1)} autoFocus>Let’s go ›</button>
          </div>
        )}
        {screen >= 1 && screen <= 3 && (() => {
          const Q = QUESTIONS[screen - 1];
          return (
            <div className="stack" key={Q.key}>
              <span className="xs muted">Question {screen} of 3</span>
              <h1>{Q.q}</h1>
              <div className="stack-sm">
                {Q.options.map((o, i) => (
                  <button key={o} className="option option-lg" aria-pressed={a[Q.key] === i} onClick={() => answer(Q.key, i)}>{o}</button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setScreen(screen - 1)}>‹ Back</button>
            </div>
          );
        })()}
        {screen === 4 && (
          <div className="stack">
            <span className="xs muted">Quick check · skip World 1 if you know the basics</span>
            {CHECK.map((c, i) => (
              <div key={c.q} className="stack-sm">
                <p className="small"><strong>{c.q}</strong></p>
                <div className="row">
                  {c.options.map((o, k) => (
                    <button key={o} className="btn btn-outline btn-sm" aria-pressed={check[i] === k} onClick={() => { const n = [...check]; n[i] = k; setCheck(n); }}>{o}</button>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={check.filter((x) => x !== undefined).length < 3}
              onClick={() => { setPersona(personaFor(a as Answers)); setScreen(5); }}>See my result ›</button>
          </div>
        )}
        {screen === 5 && persona && (
          <div className="stack">
            <span className="xs muted">Your path</span>
            <h1>You’re a {PERSONAS[persona].label}</h1>
            <div className="persona">
              <div className="persona-avatar" aria-hidden>{PERSONAS[persona].name[0]}</div>
              <div className="stack-sm">
                <strong>Like {PERSONAS[persona].who}</strong>
                <span className="small">{PERSONAS[persona].goal} · {PERSONAS[persona].horizon}</span>
                <span className="small">Start money on your Girokonto: <strong className="num">{num(PERSONAS[persona].start)} €</strong></span>
                <span className="xs muted">Focus: {PERSONAS[persona].focus}</span>
              </div>
            </div>
            {persona === "starter" && <p className="small">Only 100 €? On purpose: investing isn’t only for grown-ups with big savings. You can start with what you have.</p>}
            <div className="row">
              <button className="btn btn-primary btn-lg" onClick={() => go(false)} autoFocus>Start World 1 ›</button>
              {expert && checkPassed && <button className="btn btn-outline btn-lg" onClick={() => go(true)}>Skip to Pro mode</button>}
            </div>
            {expert && !checkPassed && check.length === 3 && <p className="xs muted">Two of three were right? Not quite, so World 1 is a good warm-up.</p>}
            <div className="persona-switch">
              <span className="xs muted">Not you? Pick another path:</span>
              {(Object.keys(PERSONAS) as PersonaId[]).map((id) => (
                <button key={id} className="chip" aria-pressed={id === persona} onClick={() => setPersona(id)}>{PERSONAS[id].label} · {num(PERSONAS[id].start, 0)} €</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
