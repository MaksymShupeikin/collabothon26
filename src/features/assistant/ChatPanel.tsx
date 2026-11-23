"use client";
// Layer 1 · the study-buddy chat. Floating launcher + sheet on desktop, full screen on phones.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGame } from "@/features/game/store";
import { useT } from "@/shared/lib/i18n";
import type { ChatEvent, ChatTurn, LearnerContext, Source } from "./types";
import s from "./ChatPanel.module.css";

type Msg = ChatTurn & { sources?: Source[]; error?: string; pending?: boolean };

const HIDDEN = ["/comdirect", "/ready"];
const STORE = "cd-edu-assistant-v1";
const MAX_QUESTION = 1500;
const CITE = /\[((?:concept|card|module|chapter|replay|lesson|company|persona|life-event):[^\]\s]+)\]/g;

function suggestions(path: string, t: ReturnType<typeof useT>): string[] {
  if (path.startsWith("/history")) return [t("How do I tell signal from noise?", "Wie erkenne ich Signal und Rauschen?"), t("Why is one stock risky?", "Warum ist eine einzelne Aktie riskant?")];
  if (path.startsWith("/invest")) return [t("Should I sell in a crash?", "Soll ich im Crash verkaufen?"), t("How does compound interest work?", "Wie funktioniert der Zinseszins?")];
  if (path.startsWith("/trade") || path.startsWith("/real-market")) return [t("What is a stop-loss?", "Was ist ein Stop-Loss?"), t("What does volatility mean?", "Was bedeutet Volatilität?")];
  return [t("What is an ETF?", "Was ist ein ETF?"), t("Market or limit order?", "Market- oder Limit-Order?"), t("Why do fees matter so much?", "Warum sind Gebühren so wichtig?")];
}

// ── Tiny, safe renderer: paragraphs, "- " bullets, **bold**, and citation chips. No HTML injection. ──

function inline(text: string, cite: (id: string) => ReactNode, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const parts = text.split(CITE);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      out.push(<Fragment key={`${keyBase}c${i}`}>{cite(part)}</Fragment>);
      return;
    }
    part.split(/(\*\*[^*]+\*\*)/g).forEach((seg, j) => {
      if (!seg) return;
      out.push(seg.startsWith("**") && seg.endsWith("**") ? <strong key={`${keyBase}b${i}-${j}`}>{seg.slice(2, -2)}</strong> : seg);
    });
  });
  return out;
}

function Answer({ text, sources }: { text: string; sources?: Source[] }) {
  // Number citations by first appearance; unknown ids (not confirmed by the server) render nothing once sources arrive.
  const order = useMemo(() => {
    const ids: string[] = [];
    for (const m of text.matchAll(CITE)) if (!ids.includes(m[1])) ids.push(m[1]);
    return sources ? ids.filter((id) => sources.some((src) => src.id === id)) : ids;
  }, [text, sources]);
  const cite = (id: string) => {
    const n = order.indexOf(id);
    if (n < 0) return null;
    const src = sources?.find((x) => x.id === id);
    return src ? (
      <Link href={src.href} className={s.cite} title={src.title} aria-label={src.title}>{n + 1}</Link>
    ) : (
      <span className={s.cite} aria-hidden>{n + 1}</span>
    );
  };
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={bi} className={s.list}>
              {lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""), cite, `${bi}-${li}`)}</li>)}
            </ul>
          );
        }
        return <p key={bi}>{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{inline(l.replace(/^#+\s*/, ""), cite, `${bi}-${li}`)}</Fragment>)}</p>;
      })}
    </>
  );
}

function SparkGlyph({ size = 22 }: { size?: number }) {
  // Speech bubble with the comdirect-yellow spark: authored in the Icon.tsx style (bold filled petrol + yellow).
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path d="M8 10a6 6 0 016-6h20a6 6 0 016 6v16a6 6 0 01-6 6H22l-9 8v-8h1a6 6 0 01-6-6z" fill="currentColor" />
      <path d="M24 9.5c.9 4.6 2.9 6.6 7.5 7.5-4.6.9-6.6 2.9-7.5 7.5-.9-4.6-2.9-6.6-7.5-7.5 4.6-.9 6.6-2.9 7.5-7.5z" fill="var(--color-accent)" />
    </svg>
  );
}

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
);
const SendGlyph = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
);
const StopGlyph = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" /></svg>
);

export default function ChatPanel() {
  const t = useT();
  const path = usePathname();
  const save = useGame();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Memory survives reloads within the tab, never across devices.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage after hydration
      if (raw) setMsgs((JSON.parse(raw) as Msg[]).filter((m) => !m.pending));
    } catch { /* private mode */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))); } catch { /* private mode */ }
  }, [msgs]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, status, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  const learner = useCallback((): LearnerContext => ({
    path, lang: t.lang, persona: save.persona, cards: save.cards, done: save.done, xp: save.xp,
  }), [path, t.lang, save.persona, save.cards, save.done, save.xp]);

  const ask = useCallback(async (question: string) => {
    const q = question.trim().slice(0, MAX_QUESTION);
    if (!q || busy) return;
    // Memory: only completed question → answer pairs; a question whose answer failed is left out.
    const history: ChatTurn[] = [];
    msgs.forEach((m, i) => {
      const answer = msgs[i + 1];
      if (m.role === "user" && answer?.role === "assistant" && answer.content && !answer.error) {
        history.push({ role: "user", content: m.content }, { role: "assistant", content: answer.content });
      }
    });
    history.push({ role: "user", content: q });
    setMsgs((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "", pending: true }]);
    setDraft("");
    setBusy(true);
    setStatus(t("Thinking", "Denke nach"));
    const ctrl = new AbortController();
    abort.current = ctrl;
    const patch = (fn: (m: Msg) => Msg) => setMsgs((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, learner: learner() }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        patch((m) => ({ ...m, pending: false, error: body?.message ?? t("The study buddy is unavailable right now.", "Der Lernbuddy ist gerade nicht erreichbar.") }));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as ChatEvent;
          if (e.type === "text") { setStatus(null); patch((m) => ({ ...m, content: m.content + e.delta })); }
          else if (e.type === "status") setStatus(e.text);
          else if (e.type === "sources") patch((m) => ({ ...m, sources: e.items }));
          else if (e.type === "error") patch((m) => ({ ...m, error: e.message }));
        }
      }
    } catch (err) {
      if (!ctrl.signal.aborted) patch((m) => ({ ...m, error: t("Connection lost. Please try again.", "Verbindung verloren. Bitte versuch es noch einmal.") }));
      void err;
    } finally {
      patch((m) => ({ ...m, pending: false }));
      setBusy(false);
      setStatus(null);
      abort.current = null;
    }
  }, [busy, msgs, learner, t]);

  const stop = () => abort.current?.abort();
  const reset = () => { stop(); setMsgs([]); setDraft(""); inputRef.current?.focus(); };

  if (HIDDEN.includes(path) || save.active) return null;

  const last = msgs[msgs.length - 1];
  const tooLong = draft.length > MAX_QUESTION;

  return (
    <>
      {!open && (
        <button ref={launcherRef} type="button" className={s.launcher} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={false}>
          <SparkGlyph />
          <span className={s.launcherLabel}>{t("Ask", "Fragen")}</span>
        </button>
      )}

      {open && (
        <section className={s.panel} role="dialog" aria-modal="false" aria-labelledby="assistant-title">
          <header className={s.head}>
            <span className={s.avatar}><SparkGlyph size={20} /></span>
            <div className={s.headText}>
              <h2 id="assistant-title">{t("Study buddy", "Lernbuddy")}</h2>
              <p>{t("Answers from your lessons", "Antworten aus deinen Lektionen")}</p>
            </div>
            {msgs.length > 0 && (
              <button type="button" className={s.textBtn} onClick={reset}>{t("New chat", "Neuer Chat")}</button>
            )}
            <button type="button" className={s.iconBtn} onClick={close} aria-label={t("Close chat", "Chat schließen")}><CloseGlyph /></button>
          </header>

          <div ref={listRef} className={s.list_} aria-live="polite" aria-busy={busy}>
            {msgs.length === 0 ? (
              <div className={s.empty}>
                <p className={s.hello}>{t("Ask anything about investing or this app.", "Frag alles übers Investieren oder diese App.")}</p>
                <p className={s.helloSub}>{t("I answer from comdirect edu's own lessons and show where each answer comes from. Any language works.", "Ich antworte aus den Lektionen von comdirect edu und zeige, woher jede Antwort kommt. Jede Sprache geht.")}</p>
                <div className={s.suggest}>
                  {suggestions(path, t).map((q) => (
                    <button key={q} type="button" className={s.chip} onClick={() => void ask(q)}>{q}</button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className={s.user}>{m.content}</div>
                ) : (
                  <div key={i} className={s.bot}>
                    {m.content && <div className={s.answer}><Answer text={m.content} sources={m.pending ? undefined : m.sources} /></div>}
                    {m.pending && status && i === msgs.length - 1 && (
                      <p className={s.status}><span className={s.pulse} aria-hidden />{status}…</p>
                    )}
                    {m.error && <p className={s.error} role="alert">{m.error}</p>}
                    {!m.pending && m.sources && m.sources.length > 0 && (
                      <ol className={s.sources} aria-label={t("Sources", "Quellen")}>
                        {m.sources.map((src) => (
                          <li key={src.id}>
                            <Link href={src.href}>{src.title}</Link>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ),
              )
            )}
          </div>

          <form
            className={s.composer}
            onSubmit={(e) => { e.preventDefault(); void ask(draft); }}
          >
            <label htmlFor="assistant-input" className={s.srOnly}>{t("Your question", "Deine Frage")}</label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              className={s.input}
              rows={1}
              value={draft}
              placeholder={busy ? t("Answering…", "Antwortet…") : t("Ask a question", "Stell eine Frage")}
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(draft); }
              }}
              aria-invalid={tooLong}
            />
            {busy ? (
              <button type="button" className={s.send} onClick={stop} aria-label={t("Stop answering", "Antwort stoppen")}><StopGlyph /></button>
            ) : (
              <button type="submit" className={s.send} disabled={!draft.trim() || tooLong} aria-label={t("Send", "Senden")}><SendGlyph /></button>
            )}
          </form>
          <p className={s.fine}>
            {tooLong
              ? t(`Please keep it under ${MAX_QUESTION} characters.`, `Bitte unter ${MAX_QUESTION} Zeichen bleiben.`)
              : last?.error
                ? t("Answers come from the platform's lessons. Play money, no investment advice.", "Antworten stammen aus den Lektionen. Spielgeld, keine Anlageberatung.")
                : t("Play money, no investment advice. AI can make mistakes: check the sources.", "Spielgeld, keine Anlageberatung. KI kann sich irren: prüf die Quellen.")}
          </p>
        </section>
      )}
    </>
  );
}
