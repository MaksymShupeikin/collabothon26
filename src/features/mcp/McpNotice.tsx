"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useGame, useLoaded } from "@/features/game/store";
import { useT } from "@/shared/lib/i18n";
import QuickConnect, { type ChatbotId } from "./QuickConnect";
import s from "./McpNotice.module.css";

const DISMISS_KEY = "cd-edu-mcp-notice-v1";
const HIDDEN_PATHS = new Set(["/mcp", "/start", "/comdirect", "/ready"]);

const dismissListeners = new Set<() => void>();
function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeDismissed(cb: () => void) {
  dismissListeners.add(cb);
  return () => dismissListeners.delete(cb);
}
function setDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
  dismissListeners.forEach((cb) => cb());
}

/**
 * Friendly, plain-language notification telling learners they can connect their AI chatbot
 * (Claude, ChatGPT, Gemini, Grok) via MCP in 2 clicks. Automatically stays out of the way
 * during guided tours, onboarding, and on /mcp itself.
 */
export default function McpNotice() {
  const t = useT();
  const path = usePathname();
  const loaded = useLoaded();
  const save = useGame();
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => true);
  const [modalBot, setModalBot] = useState<ChatbotId | null>(null);

  useEffect(() => {
    if (!modalBot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalBot(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalBot]);

  const hiddenRoute = HIDDEN_PATHS.has(path);
  const tourRunning = save.active !== null;
  const showToast = loaded && !!save.persona && !dismissed && !hiddenRoute && !tourRunning && !modalBot;

  if (!showToast && !modalBot) return null;

  return (
    <>
      {showToast && (
        <aside
          className={s.toast}
          role="region"
          aria-label={t("Connect your AI chatbot via MCP", "KI-Chatbot per MCP verbinden")}
        >
          <div className={s.toastHead}>
            <span className={s.toastKicker}>{t("New · AI Chatbot (MCP)", "Neu · KI-Chatbot (MCP)")}</span>
            <button
              type="button"
              className={s.closeBtn}
              aria-label={t("Dismiss notification", "Hinweis schließen")}
              onClick={setDismissed}
            >
              ×
            </button>
          </div>

          <strong className={s.toastTitle}>
            {t("Connect Claude, ChatGPT, Gemini or Grok", "Verbinde Claude, ChatGPT, Gemini oder Grok")}
          </strong>
          <p className={s.toastBody}>
            {t(
              "Link your sandbox portfolio in 2 clicks — ask your chatbot for simple explanations and live updates on your positions.",
              "Verbinde dein Übungs-Depot in 2 Klicks — für einfache Erklärungen und Live-Updates zu deinen Positionen.",
            )}
          </p>

          <div className={s.botPills}>
            {([
              ["claude", "Claude"],
              ["chatgpt", "ChatGPT"],
              ["gemini", "Gemini"],
              ["grok", "Grok"],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" className={s.botPill} onClick={() => setModalBot(id)}>
                {label}
              </button>
            ))}
          </div>

          <div className={s.toastFoot}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setModalBot("claude")}>
              {t("Connect in 2 clicks ›", "In 2 Klicks verbinden ›")}
            </button>
            <Link href="/mcp" className={s.toastMore} onClick={setDismissed}>
              {t("Live demo ›", "Live-Demo ›")}
            </Link>
          </div>
        </aside>
      )}

      {modalBot && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mcp-quick-h"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalBot(null);
          }}
        >
          <div className={s.modal}>
            <div className={s.modalHead}>
              <div className={s.modalHeadText}>
                <span className={s.toastKicker} style={{ alignSelf: "flex-start" }}>
                  {t("2-Click MCP Connect", "2-Klick-MCP-Verbindung")}
                </span>
                <h2 id="mcp-quick-h">
                  {t("Connect your favorite AI chatbot", "Verbinde deinen Lieblings-KI-Chatbot")}
                </h2>
                <p>
                  {t(
                    "Pick your chatbot below, copy your personal link, and paste it in. Works with your play-money sandbox — never real money, never made-up news.",
                    "Wähle deinen Chatbot, kopiere deinen persönlichen Link und füge ihn ein. Läuft auf Spielgeld — kein echtes Geld, keine erfundenen News.",
                  )}
                </p>
              </div>
              <button
                type="button"
                className={s.closeBtn}
                aria-label={t("Close", "Schließen")}
                onClick={() => setModalBot(null)}
              >
                ×
              </button>
            </div>

            <div className={s.modalBody}>
              <QuickConnect key={modalBot} initialBot={modalBot} compact />

              <div className={s.modalFoot}>
                <span className="xs muted">
                  {t(
                    "Want to preview a live P/L briefing first?",
                    "Möchtest du erst ein Live-G/V-Briefing testen?",
                  )}
                </span>
                <Link
                  href="/mcp"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setModalBot(null);
                    setDismissed();
                  }}
                >
                  {t("Open full AI console ›", "Zur kompletten KI-Konsole ›")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
