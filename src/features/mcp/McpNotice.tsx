"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSave, useGame, useLoaded, usePlayerMeta } from "@/features/game/store";
import { useT } from "@/shared/lib/i18n";
import s from "./McpNotice.module.css";

/**
 * "Ask your AI about your depot": a quiet, Robinhood-style notice + a two-step connect sheet.
 * Plain words first ("connect your AI"); the technical name (MCP) only appears as a small footnote.
 * Every chatbot gets the same two steps: 1) copy your personal link, 2) open the app's connector page and paste it.
 */

const DISMISS_KEY = "cd-edu-mcp-notice-v2";
const HIDDEN_PATHS = new Set(["/mcp", "/start", "/comdirect", "/ready"]);

type BotId = "claude" | "chatgpt" | "gemini" | "grok";
type Bot = { id: BotId; name: string; open: string; whereEn: string; whereDe: string; chat: string; noteEn?: string; noteDe?: string };

// Connector pages and menu paths checked Nov 2026. All four need a link that is reachable on the internet.
const BOTS: Bot[] = [
  { id: "claude", name: "Claude", open: "https://claude.ai/settings/connectors", chat: "https://claude.ai/new",
    whereEn: "Settings → Connectors → Add custom connector", whereDe: "Einstellungen → Connectors → Add custom connector" },
  { id: "chatgpt", name: "ChatGPT", open: "https://chatgpt.com/#settings/Connectors", chat: "https://chatgpt.com/",
    whereEn: "Settings → Connectors → Create", whereDe: "Einstellungen → Connectors → Create",
    noteEn: "Custom connectors need developer mode in ChatGPT settings.", noteDe: "Eigene Connectors brauchen den Entwicklermodus in ChatGPT." },
  { id: "gemini", name: "Gemini", open: "https://gemini.google.com/app", chat: "https://gemini.google.com/app",
    whereEn: "Settings → Connected apps → Add a custom app", whereDe: "Einstellungen → Verbundene Apps → Eigene App hinzufügen",
    noteEn: "Gemini offers custom apps for personal accounts in some countries only.", noteDe: "Gemini bietet eigene Apps nur für private Konten in einigen Ländern." },
  { id: "grok", name: "Grok", open: "https://grok.com/connectors", chat: "https://grok.com",
    whereEn: "Connectors → New connector → Custom", whereDe: "Connectors → New connector → Custom" },
];

const listeners = new Set<() => void>();
const readDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
};
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
function dismiss() {
  try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
  listeners.forEach((cb) => cb());
}

const isLocal = (host: string) => /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith(".local");

function Svg({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const ICON = {
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M7 17L17 7M9 7h8v8",
};

export default function McpNotice() {
  const t = useT();
  const path = usePathname();
  const loaded = useLoaded();
  const save = useGame();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  const [open, setOpen] = useState(false);

  const show = loaded && !!save.persona && !dismissed && !HIDDEN_PATHS.has(path) && save.active === null && !open;

  return (
    <>
      {show && (
        <aside className={s.notice} aria-label={t("Connect your AI", "Deine KI verbinden")}>
          <span className={s.mark} aria-hidden><Svg d={ICON.spark} size={18} /></span>
          <div className={s.copy}>
            <strong>{t("Ask your AI about your depot", "Frag deine KI nach deinem Depot")}</strong>
            <span>{t("Connect Claude, ChatGPT, Gemini or Grok in two clicks.", "Verbinde Claude, ChatGPT, Gemini oder Grok in zwei Klicks.")}</span>
            <div className={s.actions}>
              <button type="button" className={s.primary} onClick={() => setOpen(true)}>{t("Connect", "Verbinden")}</button>
              <button type="button" className={s.quiet} onClick={dismiss}>{t("Not now", "Später")}</button>
            </div>
          </div>
          <button type="button" className={s.close} onClick={dismiss} aria-label={t("Dismiss", "Schließen")}><Svg d={ICON.close} /></button>
        </aside>
      )}
      {/* Mounted only while open: no server render, so window-based details never cause a hydration mismatch. */}
      {open && <ConnectSheet onClose={() => setOpen(false)} onDone={dismiss} />}
    </>
  );
}

function ConnectSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useT();
  const meta = usePlayerMeta();
  const ref = useRef<HTMLDialogElement>(null);
  const [botId, setBotId] = useState<BotId>("claude");
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const [summary, setSummary] = useState<"idle" | "busy" | "done" | "manual">("idle");
  const [summaryText, setSummaryText] = useState("");
  const bot = BOTS.find((b) => b.id === botId)!;

  const [copyFailed, setCopyFailed] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const ready = !!meta.playerId; // the token arrives with the save; never hand out a link without it
  const link = `${origin}/api/mcp?token=${meta.playerId ?? ""}`;
  const offline = !!host && isLocal(host);

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
    try { // older browsers / blocked clipboard API
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      ref.current?.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch { return false; }
  }
  async function copyLink() {
    if (!ready) return;
    const ok = await copy(link);
    setCopied(ok);
    setCopyFailed(!ok);
  }
  function openBot() {
    window.open(bot.open, "_blank", "noopener,noreferrer");
    setOpened(true);
    onDone(); // the learner has acted on it: no need to show the notice again
  }
  // No-setup fallback: copy a plain snapshot of the depot. The chat opens from a real link afterwards,
  // because browsers block new tabs (and often the clipboard) once a click has waited for the network.
  async function copySummary() {
    setSummary("busy");
    try {
      await flushSave();
      const res = await fetch(`/api/mcp${meta.playerId ? `?token=${meta.playerId}` : ""}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_account_update", arguments: { mark_seen: false, lang: t.lang } } }),
      });
      const json = (await res.json()) as { result?: { content?: Array<{ text: string }> } };
      const text = [json.result?.content?.[0]?.text ?? "", "", t("Explain my depot in simple words. Do not invent news.", "Erkläre mein Depot in einfachen Worten. Erfinde keine News.")].join("\n");
      setSummaryText(text);
      setSummary((await copy(text)) ? "done" : "manual");
    } catch {
      setSummary("idle");
    }
  }

  return (
    <dialog ref={ref} className={s.sheet} aria-labelledby="mcp-sheet-title" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className={s.sheetBody}>
        <div className={s.sheetHead}>
          <h2 id="mcp-sheet-title">{t("Connect your AI", "Deine KI verbinden")}</h2>
          <button type="button" className={s.close} onClick={onClose} aria-label={t("Close", "Schließen")}><Svg d={ICON.close} /></button>
        </div>
        <p className={s.lead}>{t("Your AI can then see your practice depot and explain it in simple words. Play money only.", "Deine KI sieht dann dein Übungsdepot und erklärt es in einfachen Worten. Nur Spielgeld.")}</p>

        <div className={s.apps} role="group" aria-label={t("Choose your AI", "Wähle deine KI")}>
          {BOTS.map((b) => (
            <button key={b.id} type="button" aria-pressed={b.id === botId} onClick={() => { setBotId(b.id); setOpened(false); setSummary("idle"); }}>{b.name}</button>
          ))}
        </div>

        <ol className={s.steps}>
          <li className={copied ? s.done : undefined}>
            <span className={s.num} aria-hidden>{copied ? <Svg d={ICON.check} size={14} /> : 1}</span>
            <div className={s.stepText}>
              <strong>{t("Copy your link", "Link kopieren")}</strong>
              <span>{t("It is personal: it opens your depot only.", "Er ist persönlich: Er öffnet nur dein Depot.")}</span>
            </div>
            <button type="button" className={copied ? s.quietBtn : s.primary} onClick={copyLink} disabled={!ready} aria-live="polite">
              {!ready ? t("Loading…", "Lädt…") : copied ? t("Copied", "Kopiert") : t("Copy", "Kopieren")}
            </button>
          </li>
          <li className={opened ? s.done : undefined}>
            <span className={s.num} aria-hidden>{opened ? <Svg d={ICON.check} size={14} /> : 2}</span>
            <div className={s.stepText}>
              <strong>{t(`Paste it in ${bot.name}`, `In ${bot.name} einfügen`)}</strong>
              <span>{t(bot.whereEn, bot.whereDe)}</span>
            </div>
            <button type="button" className={copied ? s.primary : s.quietBtn} onClick={openBot}>
              {t("Open", "Öffnen")} <Svg d={ICON.arrow} size={14} />
            </button>
          </li>
        </ol>

        {copyFailed && (
          <label className={s.manual}>
            <span>{t("Copy did not work here. Select the link and copy it:", "Kopieren ging hier nicht. Link markieren und kopieren:")}</span>
            <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          </label>
        )}
        {bot.noteEn && <p className={s.note}>{t(bot.noteEn, bot.noteDe)}</p>}
        {offline && (
          <p className={s.note}>{t("This copy of the app runs on your computer, so the link works once the app is online.", "Diese App läuft auf deinem Rechner. Der Link funktioniert, sobald die App online ist.")}</p>
        )}

        {summary === "manual" && (
          <label className={s.manual}>
            <span>{t("Copy did not work here. Select the text and copy it:", "Kopieren ging hier nicht. Text markieren und kopieren:")}</span>
            <textarea readOnly rows={4} value={summaryText} onFocus={(e) => e.currentTarget.select()} />
          </label>
        )}
        <div className={s.foot}>
          {summary === "done" || summary === "manual" ? (
            <a className={s.link} href={bot.chat} target="_blank" rel="noopener noreferrer" aria-live="polite">
              {summary === "done" ? t(`Summary copied. Open ${bot.name}`, `Übersicht kopiert. ${bot.name} öffnen`) : t(`Open ${bot.name}`, `${bot.name} öffnen`)}
              {" "}<Svg d={ICON.arrow} size={12} />
            </a>
          ) : (
            <button type="button" className={s.link} onClick={copySummary} disabled={summary === "busy"}>
              {summary === "busy" ? t("Copying…", "Kopiere…") : t("No setup? Copy a summary for any chat", "Ohne Einrichtung? Übersicht für jeden Chat kopieren")}
            </button>
          )}
          <Link href="/mcp" className={s.link} onClick={onClose}>{t("More options", "Mehr Optionen")}</Link>
        </div>
        <p className={s.tech}>{t("Technical name: MCP server. Your AI can read your depot and lessons and place practice orders. It never touches real money.", "Fachbegriff: MCP-Server. Deine KI liest Depot und Lektionen und kann Übungsorders setzen. Echtes Geld berührt sie nie.")}</p>
      </div>
    </dialog>
  );
}
