"use client";
import { useMemo, useState } from "react";
import { flushSave, useLoaded, usePlayerMeta } from "@/features/game/store";
import { useT } from "@/shared/lib/i18n";
import s from "./QuickConnect.module.css";

export type ChatbotId = "claude" | "chatgpt" | "gemini" | "grok";
type DevTab = "cursor" | "claude-desktop" | "claude-code" | "gemini-cli" | "curl";

function BotGlyph({ id }: { id: ChatbotId }) {
  if (id === "claude") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3L5.3 18.7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "chatgpt") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M12 4.5v5l4.2 2.4M12 19.5v-5l-4.2-2.4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === "gemini") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 2.5C12.8 8.2 15.8 11.2 21.5 12c-5.7.8-8.7 3.8-9.5 9.5-.8-5.7-3.8-8.7-9.5-9.5 5.7-.8 8.7-3.8 9.5-9.5z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M7.5 16.5L17.5 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

type BotGuide = {
  id: ChatbotId;
  name: string;
  tagEn: string;
  tagDe: string;
  openUrl: string;
  openLabelEn: string;
  openLabelDe: string;
  step1En: string;
  step1De: string;
  step2En: string;
  step2De: string;
  instantUrl: string;
  instantHintEn: string;
  instantHintDe: string;
};

const BOTS: BotGuide[] = [
  {
    id: "claude",
    name: "Claude",
    tagEn: "Direct MCP · 2 clicks",
    tagDe: "Direkt-MCP · 2 Klicks",
    openUrl: "https://claude.ai/settings/connectors",
    openLabelEn: "2. Open Claude Connectors ↗",
    openLabelDe: "2. Claude Connectors öffnen ↗",
    step1En: "Copy your personal comdirect edu MCP link.",
    step1De: "Kopiere deinen persönlichen comdirect edu MCP-Link.",
    step2En: "In Claude: click “Add custom connector”, paste your link, and save. Done!",
    step2De: "In Claude: „Add custom connector“ klicken, Link einfügen und speichern. Fertig!",
    instantUrl: "https://claude.ai/new",
    instantHintEn: "Or skip settings and paste a live portfolio snapshot straight into a new Claude chat.",
    instantHintDe: "Oder ohne Einstellungen: aktuellen Depot-Stand kopieren und direkt in Claude einfügen.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    tagEn: "Direct MCP · 2 clicks",
    tagDe: "Direkt-MCP · 2 Klicks",
    openUrl: "https://chatgpt.com/#settings/Connectors",
    openLabelEn: "2. Open ChatGPT Connectors ↗",
    openLabelDe: "2. ChatGPT Connectors öffnen ↗",
    step1En: "Copy your personal comdirect edu MCP link.",
    step1De: "Kopiere deinen persönlichen comdirect edu MCP-Link.",
    step2En: "In ChatGPT: open Connectors → Create / Add MCP server, paste your link, and save.",
    step2De: "In ChatGPT: Connectors → Neuen MCP-Server hinzufügen, Link einfügen und speichern.",
    instantUrl: "https://chatgpt.com/",
    instantHintEn: "Or copy your live portfolio briefing right now and paste it into any ChatGPT chat.",
    instantHintDe: "Oder kopiere jetzt dein Live-Depot-Briefing und füge es direkt in ChatGPT ein.",
  },
  {
    id: "gemini",
    name: "Gemini",
    tagEn: "MCP + 1-click chat",
    tagDe: "MCP + 1-Klick-Chat",
    openUrl: "https://gemini.google.com/app",
    openLabelEn: "2. Open Gemini ↗",
    openLabelDe: "2. Gemini öffnen ↗",
    step1En: "Copy your personal MCP link (works in Gemini MCP / Gemini CLI) or use instant chat below.",
    step1De: "Kopiere deinen MCP-Link (für Gemini MCP / Gemini CLI) oder nutze den 1-Klick-Chat unten.",
    step2En: "Paste the MCP link in Gemini Extensions/CLI — or press the instant button below to paste your live depot directly into Gemini web chat.",
    step2De: "Füge den MCP-Link in Gemini/CLI ein — oder nutze den Sofort-Button unten für den Gemini-Webchat.",
    instantUrl: "https://gemini.google.com/app",
    instantHintEn: "Fastest in Gemini web: copies your live positions & P/L and opens Gemini so you just press Paste.",
    instantHintDe: "Am schnellsten im Web: kopiert deine Live-Positionen & G/V und öffnet Gemini zum direkten Einfügen.",
  },
  {
    id: "grok",
    name: "Grok",
    tagEn: "MCP + 1-click chat",
    tagDe: "MCP + 1-Klick-Chat",
    openUrl: "https://grok.com",
    openLabelEn: "2. Open Grok ↗",
    openLabelDe: "2. Grok öffnen ↗",
    step1En: "Copy your personal MCP link (for Grok / xAI MCP tools) or use instant chat below.",
    step1De: "Kopiere deinen MCP-Link (für Grok / xAI MCP-Tools) oder nutze den 1-Klick-Chat unten.",
    step2En: "Paste the MCP link into Grok's MCP/tool settings — or use the 1-click briefing button below to chat immediately on grok.com.",
    step2De: "Füge den MCP-Link in den Grok-MCP-Einstellungen ein — oder starte mit 1 Klick sofort auf grok.com.",
    instantUrl: "https://grok.com",
    instantHintEn: "Fastest in Grok web: copies your live positions & P/L and opens Grok so you just press Paste.",
    instantHintDe: "Am schnellsten im Web: kopiert deine Live-Positionen & G/V und öffnet Grok zum direkten Einfügen.",
  },
];

export default function QuickConnect({
  initialBot = "claude",
  compact = false,
}: {
  initialBot?: ChatbotId;
  compact?: boolean;
}) {
  const t = useT();
  const loaded = useLoaded();
  const meta = usePlayerMeta();
  const [bot, setBot] = useState<ChatbotId>(initialBot);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [instantBusy, setInstantBusy] = useState(false);
  const [instantDone, setInstantDone] = useState(false);
  const [devTab, setDevTab] = useState<DevTab>("cursor");
  const [copiedDev, setCopiedDev] = useState(false);

  const origin = "https://mcp.hop.vokh.dev"; // public MCP host on this VPS
  const token = meta.playerId ?? "00000000-0000-4000-8000-000000000001";
  const endpointUrl = `${origin}/api/mcp?token=${token}`;
  const relativeEndpoint = meta.playerId ? `/api/mcp?token=${meta.playerId}` : "/api/mcp";
  const current = BOTS.find((b) => b.id === bot) ?? BOTS[0];

  const starterQuestion = t(
    "Check my comdirect edu portfolio: how much did my positions gain or lose, what changed since my last check, and explain anything I should watch out for (no made-up news).",
    "Prüfe mein comdirect edu Depot: Wie viel haben meine Positionen gewonnen oder verloren, was hat sich seit dem letzten Check geändert und worauf sollte ich achten (ohne erfundene News)?",
  );

  const devSnippet = useMemo(() => {
    if (devTab === "cursor") {
      return {
        label: ".cursor/mcp.json",
        code: JSON.stringify({ mcpServers: { "comdirect-edu": { url: endpointUrl } } }, null, 2),
      };
    }
    if (devTab === "claude-desktop") {
      return {
        label: "claude_desktop_config.json",
        code: JSON.stringify(
          {
            mcpServers: {
              "comdirect-edu": {
                command: "node",
                args: ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/mcp-server.ts", "--url", endpointUrl],
              },
            },
          },
          null,
          2,
        ),
      };
    }
    if (devTab === "claude-code") {
      return {
        label: "Terminal",
        code: `claude mcp add --transport http comdirect-edu "${endpointUrl}"`,
      };
    }
    if (devTab === "gemini-cli") {
      return {
        label: "Terminal (Gemini CLI)",
        code: `gemini mcp add --transport http comdirect-edu "${endpointUrl}"`,
      };
    }
    return {
      label: "curl",
      code: `curl -sS -X POST "${endpointUrl}" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_account_update","arguments":{"lang":"${t.lang}"}}}'`,
    };
  }, [devTab, endpointUrl, t.lang]);

  async function copy(text: string): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function handleCopyLink() {
    await copy(endpointUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3500);
  }

  async function handleCopyStarter() {
    await copy(starterQuestion);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  }

  async function handleInstantChat() {
    setInstantBusy(true);
    try {
      await flushSave();
      const res = await fetch(relativeEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: "get_account_update", arguments: { mark_seen: false, lang: t.lang } },
        }),
      });
      const json = (await res.json()) as { result?: { content?: Array<{ text: string }> } };
      const snapshot = json.result?.content?.[0]?.text ?? "";
      const payload = [
        snapshot,
        "",
        t(
          "Question: Summarize my current positions and P/L in simple words, point out any risks or fees I should watch, and do NOT invent company news.",
          "Frage: Fasse meine aktuellen Positionen und meinen G/V einfach zusammen, weise auf Risiken oder Gebühren hin und erfinde KEINE Unternehmensnews.",
        ),
      ]
        .filter(Boolean)
        .join("\n");
      await copy(payload);
      setInstantDone(true);
      setTimeout(() => setInstantDone(false), 3500);
      if (typeof window !== "undefined") {
        window.open(current.instantUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setInstantBusy(false);
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.botGrid} role="tablist" aria-label={t("Choose your AI chatbot", "Wähle deinen KI-Chatbot")}>
        {BOTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={bot === item.id}
            className={s.botCard}
            onClick={() => {
              setBot(item.id);
              setCopiedLink(false);
              setInstantDone(false);
            }}
          >
            <span className={s.botHead}>
              <span className={s.botIcon} aria-hidden>
                <BotGlyph id={item.id} />
              </span>
              <span className={s.botName}>{item.name}</span>
            </span>
            <span className={s.botTag}>{t(item.tagEn, item.tagDe)}</span>
          </button>
        ))}
      </div>

      <div className={s.stepsCard}>
        <div className={s.stepsGrid}>
          <div className={`${s.stepBox} ${copiedLink ? s.stepBoxDone : s.stepBoxActive}`}>
            <div className={s.stepHead}>
              <span className={`${s.stepNum} ${copiedLink ? s.stepNumDone : ""}`} aria-hidden>
                {copiedLink ? "✓" : "1"}
              </span>
              <strong>{t("Copy your MCP link", "MCP-Link kopieren")}</strong>
            </div>
            <p className={s.stepDesc}>{t(current.step1En, current.step1De)}</p>
            <div className={s.linkPreview} title={endpointUrl}>
              {endpointUrl}
            </div>
            <button type="button" className={`btn btn-primary ${s.stepAction}`} onClick={() => void handleCopyLink()}>
              {copiedLink
                ? t("Link copied ✓ — now step 2 ›", "Link kopiert ✓ — weiter zu Schritt 2 ›")
                : t("1. Copy my personal link", "1. Persönlichen Link kopieren")}
            </button>
          </div>

          <div className={`${s.stepBox} ${copiedLink ? s.stepBoxActive : ""}`}>
            <div className={s.stepHead}>
              <span className={s.stepNum} aria-hidden>
                2
              </span>
              <strong>{t(`Paste inside ${current.name}`, `In ${current.name} einfügen`)}</strong>
            </div>
            <p className={s.stepDesc}>{t(current.step2En, current.step2De)}</p>
            <a
              href={current.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn ${copiedLink ? "btn-primary" : "btn-dark"} ${s.stepAction}`}
            >
              {t(current.openLabelEn, current.openLabelDe)}
            </a>
          </div>
        </div>

        <div className={s.instantBar}>
          <div className={s.instantText}>
            <strong>
              {bot === "gemini" || bot === "grok"
                ? t(`Even faster: 1-click chat in ${current.name}`, `Noch schneller: 1-Klick-Chat in ${current.name}`)
                : t("First message to try once connected", "Erste Frage nach dem Verbinden")}
            </strong>
            <span>{t(current.instantHintEn, current.instantHintDe)}</span>
          </div>
          <div className={s.instantActions}>
            <button
              type="button"
              className={`btn ${bot === "gemini" || bot === "grok" ? "btn-primary" : "btn-outline"} btn-sm`}
              disabled={instantBusy}
              onClick={() => void handleInstantChat()}
            >
              {instantBusy
                ? t("Preparing…", "Wird geladen…")
                : instantDone
                  ? t(`Copied & opened ${current.name} ✓`, `Kopiert & ${current.name} geöffnet ✓`)
                  : t(`Copy portfolio & open ${current.name} ↗`, `Depot kopieren & ${current.name} öffnen ↗`)}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleCopyStarter()}>
              {copiedPrompt ? t("Question copied ✓", "Frage kopiert ✓") : t("Copy starter question", "Beispielfrage kopieren")}
            </button>
          </div>
        </div>
      </div>

      {!compact && (
        <details className={s.devDetails}>
          <summary>
            {t(
              "Using Cursor, Claude Desktop, Gemini CLI or curl? (Developer configs)",
              "Nutzt du Cursor, Claude Desktop, Gemini CLI oder curl? (Entwickler-Konfiguration)",
            )}
          </summary>
          <div className={s.devBody}>
            <div className={s.devTabs} role="tablist" aria-label={t("Developer clients", "Entwickler-Clients")}>
              {([
                ["cursor", "Cursor"],
                ["claude-desktop", "Claude Desktop"],
                ["claude-code", "Claude Code"],
                ["gemini-cli", "Gemini CLI"],
                ["curl", "HTTP / curl"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={devTab === id}
                  className="chip"
                  onClick={() => {
                    setDevTab(id);
                    setCopiedDev(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={s.codeWrap}>
              <div className={s.codeHead}>
                <span className={s.codeMeta}>{devSnippet.label}</span>
                <button
                  type="button"
                  className={s.copyMini}
                  onClick={() => {
                    void copy(devSnippet.code).then(() => {
                      setCopiedDev(true);
                      setTimeout(() => setCopiedDev(false), 2000);
                    });
                  }}
                >
                  {copiedDev ? t("Copied ✓", "Kopiert ✓") : t("Copy", "Kopieren")}
                </button>
              </div>
              <pre className={s.codePre}>
                <code>{devSnippet.code}</code>
              </pre>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
