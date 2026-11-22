"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  flushSave,
  reloadFromServer,
  useGame,
  useLoaded,
  usePlayerMeta,
} from "@/features/game/store";
import { costBasis, depotValue, round2 } from "@/features/market/engine";
import { cls, eur, pct, signed } from "@/shared/lib/format";
import { useT } from "@/shared/lib/i18n";
import Icon from "@/shared/ui/Icon";
import s from "./McpConnect.module.css";

type ClientTab = "cursor" | "claude-desktop" | "claude-code" | "http";

type AccountUpdateData = {
  hasAccount: boolean;
  simDay?: number;
  simDate?: string;
  accounts?: {
    giroEur: number;
    tradingCashEur: number;
    depotValueEur: number;
    totalNetWorthEur: number;
    costBasisEur: number;
    unrealizedPnlEur: number;
    unrealizedPnlPct: number;
  };
  changesSinceLastCheck?: {
    hasPreviousCheck: boolean;
    daysElapsed?: number;
    depotValueChangeEur?: number;
    depotValueChangePct?: number;
    totalValueChangeEur?: number;
    totalValueChangePct?: number;
    positionChanges?: Array<{
      sym: string;
      short: string;
      status: string;
      pnlDeltaEur: number;
      priceChangePct: number | null;
      currentValue: number;
    }>;
    note?: string;
  };
  positions?: Array<{
    sym: string;
    short: string;
    wkn: string;
    qty: number;
    avgCostPerShare: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnlEur: number;
    unrealizedPnlPct: number;
    weightPct: number;
  }>;
  portfolioInsights?: string[];
  marketContext?: {
    liveNewsAvailable: boolean;
    honestyNotice: string;
    simulatedMacroAndSectorEvents?: Array<{
      simulated: true;
      day: number;
      date: string;
      scope: string;
      headline: string;
    }>;
  };
};

type RunResult = {
  actionId: string;
  toolName: string;
  text: string;
  data: Record<string, unknown>;
  isError?: boolean;
  requestPayload: unknown;
  responsePayload: unknown;
};

const TOOL_CATALOG = [
  { name: "get_account_update", en: "Account totals, per-position P/L, deltas since last check, honest context.", de: "Kontostände, G/V pro Position, Delta seit letztem Check, ehrlicher Kontext." },
  { name: "get_portfolio", en: "Sector/ETF allocation, 30% concentration check, max drawdown, open orders.", de: "Branchen-/ETF-Aufteilung, 30-%-Regel, Drawdown, offene Orders." },
  { name: "list_market_instruments", en: "Search stocks & ETFs by ticker, WKN, ISIN, or sector with live sandbox quotes.", de: "Aktien & ETFs nach Ticker, WKN, ISIN oder Branche durchsuchen." },
  { name: "get_stock_overview", en: "Deep dive on one instrument: ask/bid, 52W range, returns, fee preview.", de: "Detailblick: Brief/Geld, 52W-Spanne, Renditen, Gebührenvorschau." },
  { name: "get_learning_progress", en: "Persona, rank, XP, stars, unlocked modules, and next recommended lesson.", de: "Persona, Rang, XP, Sterne, freigeschaltete Module und nächste Lektion." },
  { name: "list_concepts", en: "All 12 concept cards + extended curriculum topics with collected flags.", de: "Alle 12 Wissenskarten und erweiterten Lernkonzepte mit Sammelstatus." },
  { name: "explain_concept", en: "Plain explanation, concrete example, quiz, and tie-in to your real portfolio.", de: "Klare Erklärung, Beispiel, Quiz und Bezug zu deinem echten Depot." },
  { name: "review_trades", en: "Trade history coaching: fee percentages, limit vs. market order habits.", de: "Trade-Coaching: Gebührenquote, Limit- vs. Market-Order-Disziplin." },
  { name: "get_historical_replays", en: "5 real crash/hype History Mode replays without spoiling hidden dates.", de: "5 echte Crash-/Hype-Replays aus dem Geschichtsmodus ohne Spoiler." },
  { name: "place_paper_order", en: "Execute play-money buy/sell orders (market, limit, stop) synced to web.", de: "Spielgeld-Orders (Market, Limit, Stop) ausführen, synchron mit der Web-App." },
  { name: "advance_market", en: "Fast-forward 1–252 sandbox trading days to observe realistic P/L shifts.", de: "1–252 Handelstage vorspulen, um realistische G/V-Veränderungen zu testen." },
  { name: "seed_demo_portfolio", en: "One-click demo depot (4 positions + 15 trading days) for instant briefings.", de: "Ein-Klick-Demo-Depot (4 Positionen + 15 Tage) für sofortige Updates." },
];

const RESOURCE_CATALOG = [
  { name: "comdirect://portfolio", en: "Live JSON snapshot of balances, positions, and P/L.", de: "Live-JSON-Snapshot von Konten, Positionen und G/V." },
  { name: "comdirect://learning-progress", en: "Current XP, rank, collected cards, and next chapter.", de: "Aktuelle XP, Rang, gesammelte Karten und nächstes Kapitel." },
  { name: "comdirect://concepts", en: "Complete investing concept & card dictionary.", de: "Vollständiger Katalog aller Lernkonzepte und Karten." },
  { name: "comdirect://market", en: "Current day prices, spreads, and sectors for all 12 instruments.", de: "Aktuelle Kurse, Spreads und Branchen aller 12 Wertpapiere." },
  { name: "comdirect://replays", en: "History Mode real-market crash & hype scenarios.", de: "Reale Crash- und Hype-Szenarien im Geschichtsmodus." },
];

const PROMPT_CATALOG = [
  { name: "account-briefing", en: "Concise P/L update since your last check without fabricated news.", de: "Kurzes G/V-Update seit dem letzten Check ohne erfundene News." },
  { name: "explain-concept", en: "Interactive concept tutoring anchored to your own holdings.", de: "Interaktive Konzepterklärung direkt an deinem Depot." },
  { name: "coach-my-portfolio", en: "Diversification, fee drag, and next-lesson coaching.", de: "Diversifikation, Gebührencheck und nächste Lektion." },
  { name: "review-recent-trades", en: "Calm behavioral review of execution & order sizing.", de: "Ruhiger Rückblick auf Orderarten und Ordergrößen." },
];

async function invokeMcpTool(
  endpointUrl: string,
  name: string,
  args: Record<string, unknown>,
) {
  const requestPayload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name, arguments: args },
  };
  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(requestPayload),
  });
  const responsePayload = (await res.json()) as {
    result?: {
      content?: Array<{ type: string; text: string }>;
      structuredContent?: Record<string, unknown>;
      isError?: boolean;
    };
    error?: { message: string };
  };
  if (responsePayload.error) {
    throw new Error(responsePayload.error.message);
  }
  const r = responsePayload.result ?? {};
  return {
    text: r.content?.[0]?.text ?? "",
    data: r.structuredContent ?? {},
    isError: r.isError,
    requestPayload,
    responsePayload,
  };
}

export default function McpConnect() {
  const t = useT();
  const loaded = useLoaded();
  const save = useGame();
  const meta = usePlayerMeta();
  const [tab, setTab] = useState<ClientTab>("cursor");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const origin = loaded && typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const token = meta.playerId ?? "00000000-0000-4000-8000-000000000001";
  const endpointUrl = `${origin}/api/mcp?token=${token}`;
  const relativeEndpoint = meta.playerId ? `/api/mcp?token=${meta.playerId}` : "/api/mcp";

  const holdingsCount = Object.values(save.sim.acct.holdings).filter((h) => h.qty > 0).length;
  const depVal = depotValue(save.sim);
  const basis = costBasis(save.sim);
  const pnlEur = round2(depVal - basis);
  const pnlPct = basis > 0 ? round2((pnlEur / basis) * 100) : 0;

  const snippet = useMemo(() => {
    if (tab === "cursor") {
      return {
        label: ".cursor/mcp.json",
        hint: t(
          "Paste into .cursor/mcp.json (or Cursor Settings → MCP) for instant Streamable HTTP access to your live sandbox account.",
          "In .cursor/mcp.json (oder Cursor Settings → MCP) einfügen für direkten Streamable-HTTP-Zugriff auf dein Sandbox-Depot.",
        ),
        code: JSON.stringify(
          {
            mcpServers: {
              "comdirect-edu": {
                url: endpointUrl,
              },
            },
          },
          null,
          2,
        ),
      };
    }
    if (tab === "claude-desktop") {
      return {
        label: "claude_desktop_config.json",
        hint: t(
          "Uses the built-in zero-dependency stdio bridge (Node 22+) to forward securely to your comdirect edu account.",
          "Nutzt die eingebaute Stdio-Bridge (Node 22+) für den sicheren Zugriff auf dein comdirect edu Sandbox-Konto.",
        ),
        code: JSON.stringify(
          {
            mcpServers: {
              "comdirect-edu": {
                command: "node",
                args: [
                  "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
                  "scripts/mcp-server.ts",
                  "--url",
                  endpointUrl,
                ],
              },
            },
          },
          null,
          2,
        ),
      };
    }
    if (tab === "claude-code") {
      return {
        label: "Terminal",
        hint: t(
          "Run once in your terminal to register comdirect edu as an HTTP MCP server in Claude Code.",
          "Einmal im Terminal ausführen, um comdirect edu als HTTP-MCP-Server in Claude Code zu registrieren.",
        ),
        code: `claude mcp add --transport http comdirect-edu "${endpointUrl}"`,
      };
    }
    return {
      label: "Streamable HTTP (JSON-RPC 2.0)",
      hint: t(
        "Send standard MCP JSON-RPC 2.0 POST requests directly to your personal endpoint URL.",
        "Sende Standard-MCP-JSON-RPC-2.0-POST-Anfragen direkt an deine persönliche Endpoint-URL.",
      ),
      code: [
        `# Endpoint`,
        `${endpointUrl}`,
        ``,
        `# Quick test: get live account update`,
        `curl -sS -X POST "${endpointUrl}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_account_update","arguments":{"lang":"${t.lang}"}}}'`,
      ].join("\n"),
    };
  }, [tab, endpointUrl, t]);

  function copyText(key: string, value: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 2000);
    });
  }

  async function runSingleTool(actionId: string, toolName: string, args: Record<string, unknown>, reloadAfter = false) {
    setBusy(actionId);
    setError(null);
    try {
      await flushSave();
      const out = await invokeMcpTool(relativeEndpoint, toolName, { ...args, lang: t.lang });
      setResult({ actionId, toolName, ...out });
      if (reloadAfter) await reloadFromServer(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runSeedAndBrief() {
    setBusy("seed");
    setError(null);
    try {
      await flushSave();
      await invokeMcpTool(relativeEndpoint, "seed_demo_portfolio", {
        advance_days: 15,
        force: true,
        lang: t.lang,
      });
      const out = await invokeMcpTool(relativeEndpoint, "get_account_update", {
        mark_seen: true,
        lang: t.lang,
      });
      setResult({ actionId: "account-update", toolName: "get_account_update", ...out });
      await reloadFromServer(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runAdvanceAndBrief() {
    setBusy("advance-brief");
    setError(null);
    try {
      await flushSave();
      if (holdingsCount === 0 && !save.persona) {
        await invokeMcpTool(relativeEndpoint, "seed_demo_portfolio", {
          advance_days: 5,
          force: false,
          lang: t.lang,
        });
      } else {
        await invokeMcpTool(relativeEndpoint, "advance_market", { days: 5, lang: t.lang });
      }
      const out = await invokeMcpTool(relativeEndpoint, "get_account_update", {
        mark_seen: true,
        lang: t.lang,
      });
      setResult({ actionId: "advance-brief", toolName: "get_account_update", ...out });
      await reloadFromServer(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) return null;

  const updateData =
    result?.toolName === "get_account_update"
      ? (result.data as AccountUpdateData)
      : null;

  const samplePrompts = [
    {
      id: "account-update",
      title: t("Account & P/L update", "Konto- & G/V-Update"),
      tool: "get_account_update",
      quote: t(
        "“Any updates on my account? How much did my positions make or lose?”",
        "„Gibt es Neuigkeiten im Depot? Wie viel haben meine Positionen gewonnen oder verloren?“",
      ),
      onRun: () => void runSingleTool("account-update", "get_account_update", { mark_seen: true }),
    },
    {
      id: "advance-brief",
      title: t("Simulate +5 trading days & report changes", "+5 Handelstage vorspulen & Delta prüfen"),
      tool: "advance + update",
      quote: t(
        "“Move the sandbox 1 week ahead and tell me exactly what changed since my last check.”",
        "„Spul die Sandbox 1 Woche vor und sag mir genau, was sich seit dem letzten Check geändert hat.“",
      ),
      onRun: () => void runAdvanceAndBrief(),
    },
    {
      id: "explain-div",
      title: t("Explain a concept on my portfolio", "Konzept an meinem Depot erklären"),
      tool: "explain_concept",
      quote: t(
        "“Explain diversification clearly and check how concentrated my current holdings are.”",
        "„Erkläre mir Diversifikation verständlich und prüfe, wie stark mein Depot konzentriert ist.“",
      ),
      onRun: () => void runSingleTool("explain-div", "explain_concept", { topic: "diversification" }),
    },
    {
      id: "review-trades",
      title: t("Review my trades & fee discipline", "Trades & Gebührendisziplin prüfen"),
      tool: "review_trades",
      quote: t(
        "“Check my recent trades: am I losing too much to fixed order fees or skipping limit orders?”",
        "„Prüfe meine letzten Trades: Verliere ich zu viel durch Ordergebühren oder nutze ich Limit-Orders?“",
      ),
      onRun: () => void runSingleTool("review-trades", "review_trades", { limit: 10 }),
    },
    {
      id: "stock-dte",
      title: t("Look up Deutsche Telekom (WKN 555750)", "Deutsche Telekom (WKN 555750) prüfen"),
      tool: "get_stock_overview",
      quote: t(
        "“Give me the key numbers, spread, and my current position in Deutsche Telekom.”",
        "„Zeig mir die Kennzahlen, den Spread und meinen aktuellen Bestand bei der Deutschen Telekom.“",
      ),
      onRun: () => void runSingleTool("stock-dte", "get_stock_overview", { symbol: "555750" }),
    },
    {
      id: "progress",
      title: t("Check my learning progress", "Meinen Lernfortschritt prüfen"),
      tool: "get_learning_progress",
      quote: t(
        "“What is my rank, which concept cards am I missing, and what lesson should I take next?”",
        "„Was ist mein Rang, welche Wissenskarten fehlen mir noch und welche Lektion kommt als Nächstes?“",
      ),
      onRun: () => void runSingleTool("progress", "get_learning_progress", {}),
    },
  ];

  return (
    <main className={`container ${s.page}`}>
      <section className={s.hero} aria-labelledby="mcp-h">
        <div className={s.heroLeft}>
          <Link href="/" className={`xs ${s.back}`}>
            {t("‹ Learning map", "‹ Lernpfad")}
          </Link>
          <span className={s.kicker}>
            <Icon name="agent" size={18} color="var(--color-accent)" />
            {t("Model Context Protocol (MCP)", "Model Context Protocol (MCP)")}
          </span>
          <h1 id="mcp-h">
            {t("Connect your AI agent to comdirect edu", "Verbinde deinen KI-Agenten mit comdirect edu")}
          </h1>
          <p className={s.heroSub}>
            {t(
              "Plug Cursor, Claude Desktop, or Claude Code straight into your sandbox account. Ask your agent for live position P/L updates, track exact changes since your last check, and learn investing concepts tied to your own holdings — with real platform math and zero fabricated company news.",
              "Verbinde Cursor, Claude Desktop oder Claude Code direkt mit deinem Sandbox-Konto. Frage deinen Agenten nach aktuellen G/V-Updates pro Position, verfolge exakte Veränderungen seit dem letzten Check und lerne Börsenkonzepte direkt an deinem Depot — mit echten Zahlen statt erfundener Unternehmensnews.",
            )}
          </p>
          <div className={s.heroActions}>
            <button
              className="btn btn-primary btn-lg"
              disabled={busy !== null}
              onClick={() => void (holdingsCount === 0 ? runSeedAndBrief() : runSingleTool("account-update", "get_account_update", { mark_seen: true }))}
            >
              {busy === "seed"
                ? t("Preparing demo depot…", "Demo-Depot wird geladen…")
                : holdingsCount === 0
                  ? t("Load demo depot & run briefing", "Demo-Depot laden & Update testen")
                  : t("Run live account briefing", "Live-Konto-Update abrufen")}
            </button>
            <Link href="/pro" className="btn btn-outline-light">
              {t("Open trading area ›", "Handelsbereich öffnen ›")}
            </Link>
          </div>
        </div>

        <div className={s.hud} aria-label={t("Live MCP bridge status", "Live-MCP-Brückenstatus")}>
          <div className={s.hudTop}>
            <span className={s.statusPill}>
              <span className={s.dot} aria-hidden />
              {t("MCP Server Ready", "MCP-Server bereit")}
            </span>
            <span className={s.hudBadge}>
              {meta.storage === "postgres"
                ? t("Storage: Postgres", "Speicher: Postgres")
                : t("Storage: Local file", "Speicher: Lokal")}
            </span>
          </div>

          <dl className={s.hudGrid}>
            <div className={s.hudStat}>
              <dt>{t("Sim Day", "Handelstag")}</dt>
              <dd>{save.sim.day}</dd>
            </div>
            <div className={s.hudStat}>
              <dt>{t("Depot", "Depotwert")}</dt>
              <dd>{eur(depVal)}</dd>
            </div>
            <div className={s.hudStat}>
              <dt>{t("Open P/L", "Offener G/V")}</dt>
              <dd className={pnlEur > 0.01 ? s.gain : pnlEur < -0.01 ? s.loss : ""}>
                {holdingsCount > 0 ? `${signed(pnlEur)} €` : "—"}
              </dd>
            </div>
          </dl>

          <div className={s.tokenRow}>
            <code title={token}>
              {t("Session token:", "Session-Token:")} {token.slice(0, 8)}…{token.slice(-6)}
            </code>
            <button
              type="button"
              className={s.copyBtn}
              onClick={() => copyText("token", token)}
            >
              {copied === "token" ? t("Copied", "Kopiert") : t("Copy ID", "ID kopieren")}
            </button>
          </div>

          <div className={s.hudBtns}>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              disabled={busy !== null}
              onClick={() => void runSeedAndBrief()}
            >
              {t("Seed demo (4 positions + 15d)", "Demo laden (4 Pos. + 15T)")}
            </button>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              disabled={busy !== null}
              onClick={() => void reloadFromServer(true)}
            >
              {t("Sync browser", "Browser synchronisieren")}
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="connect-h">
        <div className={s.sectionHead}>
          <h2 id="connect-h">{t("Connect your AI client", "KI-Client verbinden")}</h2>
          <span className="xs muted">
            {t("Protocol: MCP JSON-RPC 2.0 (2025-03-26) · Streamable HTTP & Stdio", "Protokoll: MCP JSON-RPC 2.0 (2025-03-26) · Streamable HTTP & Stdio")}
          </span>
        </div>

        <div className={s.card}>
          <div className={s.tabs} role="tablist" aria-label={t("MCP clients", "MCP-Clients")}>
            {([
              ["cursor", "Cursor"],
              ["claude-desktop", "Claude Desktop"],
              ["claude-code", "Claude Code"],
              ["http", t("HTTP / curl", "HTTP / curl")],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className="chip"
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="small muted">{snippet.hint}</p>

          <div className={s.codeWrap}>
            <div className={s.codeHead}>
              <span className={s.codeMeta}>{snippet.label}</span>
              <button
                type="button"
                className={s.copyBtn}
                onClick={() => copyText(tab, snippet.code)}
              >
                {copied === tab ? t("Copied ✓", "Kopiert ✓") : t("Copy config", "Konfiguration kopieren")}
              </button>
            </div>
            <pre className={s.codePre}><code>{snippet.code}</code></pre>
          </div>
        </div>
      </section>

      <section aria-labelledby="console-h">
        <div className={s.sectionHead}>
          <h2 id="console-h">{t("Live MCP agent console", "Live-MCP-Agentenkonsole")}</h2>
          <span className="xs muted">
            {t(
              "Calls your real POST /api/mcp endpoint using this browser session.",
              "Ruft deinen echten POST /api/mcp Endpoint mit dieser Browser-Session auf.",
            )}
          </span>
        </div>

        <div className={s.consoleGrid}>
          <div className={s.promptList}>
            {samplePrompts.map((p) => (
              <button
                key={p.id}
                type="button"
                className={s.promptBtn}
                disabled={busy !== null}
                aria-pressed={result?.actionId === p.id}
                onClick={p.onRun}
              >
                <span className={s.promptTop}>
                  <strong>{p.title}</strong>
                  <span className={s.toolTag}>{p.tool}</span>
                </span>
                <span className={s.promptQuote}>{p.quote}</span>
              </button>
            ))}
          </div>

          <div className={s.outputCard} aria-live="polite">
            <div className={s.outputHead}>
              <div>
                <h3>
                  {result
                    ? t(`Agent tool response: ${result.toolName}`, `Agenten-Antwort: ${result.toolName}`)
                    : t("Test what your AI agent sees", "Teste, was dein KI-Agent sieht")}
                </h3>
                <p className="xs muted">
                  {busy
                    ? t("Calling POST /api/mcp…", "Rufe POST /api/mcp auf…")
                    : result
                      ? t("Live JSON-RPC 2.0 response from your sandbox.", "Live-JSON-RPC-2.0-Antwort aus deiner Sandbox.")
                      : t("Pick any sample prompt on the left or load the demo depot to inspect a real MCP briefing.", "Wähle links eine Beispielanfrage oder lade das Demo-Depot für ein echtes MCP-Briefing.")}
                </p>
              </div>
              {holdingsCount > 0 && (
                <span className="badge badge-accent num">
                  {holdingsCount} {t("positions", "Positionen")} · {pct(pnlPct)}
                </span>
              )}
            </div>

            {error && <p className="error">{error}</p>}

            {!result && !error && (
              <div className="empty">
                <Icon name="agent" size={44} round />
                <strong>{t("No MCP call run yet", "Noch kein MCP-Aufruf ausgeführt")}</strong>
                <p className="xs muted">
                  {t(
                    "Click “Account & P/L update” or “Load demo depot & run briefing” to see exact position gains/losses and deltas since the last check.",
                    "Klicke auf „Konto- & G/V-Update“ oder „Demo-Depot laden & Update testen“, um exakte Gewinne/Verluste und Deltas seit dem letzten Check zu sehen.",
                  )}
                </p>
              </div>
            )}

            {updateData?.hasAccount && updateData.accounts && (
              <>
                <div className={s.kpiRow}>
                  <div className={s.kpi}>
                    <span>{t("Net worth", "Gesamtvermögen")}</span>
                    <strong className="num">{eur(updateData.accounts.totalNetWorthEur)}</strong>
                  </div>
                  <div className={s.kpi}>
                    <span>{t("Depot value", "Depotwert")}</span>
                    <strong className="num">{eur(updateData.accounts.depotValueEur)}</strong>
                  </div>
                  <div className={`${s.kpi} ${updateData.accounts.unrealizedPnlEur > 0.01 ? s.gain : updateData.accounts.unrealizedPnlEur < -0.01 ? s.loss : ""}`}>
                    <span>{t("Unrealized P/L", "Offener G/V")}</span>
                    <strong className="num">
                      {signed(updateData.accounts.unrealizedPnlEur)} € ({pct(updateData.accounts.unrealizedPnlPct)})
                    </strong>
                  </div>
                  <div className={s.kpi}>
                    <span>{t("Cash (Giro + Trade)", "Cash (Giro + Verrech.)")}</span>
                    <strong className="num">
                      {eur(round2(updateData.accounts.giroEur + updateData.accounts.tradingCashEur))}
                    </strong>
                  </div>
                </div>

                {updateData.changesSinceLastCheck?.hasPreviousCheck && (
                  <div className={s.deltaBanner}>
                    <strong>
                      {t(
                        `Change since previous agent check (${updateData.changesSinceLastCheck.daysElapsed} trading day(s)):`,
                        `Veränderung seit letztem Agenten-Check (${updateData.changesSinceLastCheck.daysElapsed} Handelstage):`,
                      )}
                    </strong>
                    <span className={`num ${cls(updateData.changesSinceLastCheck.depotValueChangeEur ?? 0)}`}>
                      <strong>
                        {signed(updateData.changesSinceLastCheck.depotValueChangeEur ?? 0)} € (
                        {pct(updateData.changesSinceLastCheck.depotValueChangePct ?? 0)})
                      </strong>
                    </span>
                  </div>
                )}

                {updateData.positions && updateData.positions.length > 0 && (
                  <div className="scroll-x">
                    <table className={s.posTable}>
                      <thead>
                        <tr>
                          <th>{t("Instrument", "Wertpapier")}</th>
                          <th className="r">{t("Qty", "Stk.")}</th>
                          <th className="r">{t("Price", "Kurs")}</th>
                          <th className="r">{t("Value", "Wert")}</th>
                          <th className="r">{t("Total P/L", "G/V gesamt")}</th>
                          <th className="r">{t("Delta", "Delta")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updateData.positions.map((pos) => {
                          const ch = updateData.changesSinceLastCheck?.positionChanges?.find(
                            (x) => x.sym === pos.sym,
                          );
                          return (
                            <tr key={pos.sym}>
                              <td>
                                <strong>{pos.short}</strong>{" "}
                                <span className="muted">({pos.sym} · {pos.weightPct.toFixed(1)}%)</span>
                              </td>
                              <td className="r num">{pos.qty}</td>
                              <td className="r num">{eur(pos.currentPrice)}</td>
                              <td className="r num">{eur(pos.marketValue)}</td>
                              <td className={`r num ${cls(pos.unrealizedPnlEur)}`}>
                                <strong>{signed(pos.unrealizedPnlEur)} €</strong> ({pct(pos.unrealizedPnlPct)})
                              </td>
                              <td className={`r num ${ch ? cls(ch.pnlDeltaEur) : ""}`}>
                                {ch ? `${signed(ch.pnlDeltaEur)} €` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {result && (
              <>
                <div className={s.textBlock}>{result.text}</div>

                <div className={s.honesty}>
                  <span className={s.honestyTag}>{t("Data policy", "Datenprinzip")}</span>
                  <span>
                    {t(
                      "No live news scraping is attached. The MCP server explicitly instructs connected AI agents never to fabricate company-specific news — only real account figures, price history, fees/spread, and clearly labeled Simulated macro/sector sandbox events.",
                      "Es ist kein Echtzeit-News-Scraping angebunden. Der MCP-Server weist verbundene KI-Agenten ausdrücklich an, niemals unternehmensspezifische News zu erfinden — nur echte Kontokennzahlen, Kursverläufe, Gebühren/Spread und klar als „Simuliert“ markierte Makro-/Branchen-Events.",
                    )}
                  </span>
                </div>

                <details className={s.rawDetails}>
                  <summary>{t("Inspect raw JSON-RPC 2.0 exchange", "Rohen JSON-RPC-2.0-Austausch ansehen")}</summary>
                  <div className={s.rawGrid}>
                    <pre className={s.rawBox}>
                      <code>{JSON.stringify(result.requestPayload, null, 2)}</code>
                    </pre>
                    <pre className={s.rawBox}>
                      <code>{JSON.stringify(result.responsePayload, null, 2)}</code>
                    </pre>
                  </div>
                </details>
              </>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="caps-h">
        <div className={s.sectionHead}>
          <h2 id="caps-h">{t("What your AI agent can access", "Worauf dein KI-Agent zugreifen kann")}</h2>
          <span className="xs muted">
            {t("12 tools · 5 live resources · 4 coaching prompts", "12 Tools · 5 Live-Ressourcen · 4 Coaching-Prompts")}
          </span>
        </div>

        <div className={s.capGrid}>
          <div className={s.capCard}>
            <div className={s.capHead}>
              <h3>{t("Tools", "Tools")}</h3>
              <span className="badge badge-dark">12</span>
            </div>
            <ul className={s.capList}>
              {TOOL_CATALOG.map((item) => (
                <li key={item.name}>
                  <code>{item.name}</code>
                  <span>{t(item.en, item.de)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={s.capCard}>
            <div className={s.capHead}>
              <h3>{t("Live Resources", "Live-Ressourcen")}</h3>
              <span className="badge">5</span>
            </div>
            <ul className={s.capList}>
              {RESOURCE_CATALOG.map((item) => (
                <li key={item.name}>
                  <code>{item.name}</code>
                  <span>{t(item.en, item.de)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={s.capCard}>
            <div className={s.capHead}>
              <h3>{t("Coaching Prompts", "Coaching-Prompts")}</h3>
              <span className="badge badge-accent">4</span>
            </div>
            <ul className={s.capList}>
              {PROMPT_CATALOG.map((item) => (
                <li key={item.name}>
                  <code>{item.name}</code>
                  <span>{t(item.en, item.de)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
