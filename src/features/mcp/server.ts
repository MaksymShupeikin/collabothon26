import {
  advanceMarket,
  explainConcept,
  getAccountUpdate,
  getHistoricalReplays,
  getLearningProgress,
  getPortfolioDiagnostics,
  getStockOverview,
  HONESTY_NOTICE,
  listConcepts,
  listMarketInstruments,
  placePaperOrder,
  resolveLang,
  reviewTrades,
  seedDemoPortfolio,
} from "./service.ts";
import { DEFAULT_MCP_PLAYER_ID, isValidPlayerId } from "./storage.ts";

export const SUPPORTED_PROTOCOLS = ["2025-03-26", "2024-11-05"] as const;
export const DEFAULT_PROTOCOL = SUPPORTED_PROTOCOLS[0];

export const MCP_SERVER_INFO = {
  name: "comdirect-edu-mcp",
  version: "1.0.0",
};

export const MCP_INSTRUCTIONS = [
  "You are connected to comdirect edu — an interactive play-money investing education sandbox.",
  "1. ACCOUNT & POSITION UPDATES: Whenever the user asks about their account, balance, positions, profit/loss, or what changed, call `get_account_update`. Report exact EUR and % numbers and highlight what changed since their previous check.",
  "2. NO FABRICATED NEWS: This platform does NOT scrape live real-time company news. NEVER invent company-specific news or rumors to explain why a stock moved. Explain moves honestly using actual platform data (price history, fees/spread, volatility, sector weights, diversification). Only mention sandbox headlines returned in `simulatedMacroAndSectorEvents` if you explicitly label them as Simulated.",
  "3. CLARITY & LEARNING: When the user asks to understand a concept (e.g. limit orders, spread, fees, diversification, ETF, P/L, compounding), call `explain_concept` to retrieve the platform's exact definition, example, quiz, and live tie-in to their own portfolio.",
  "4. PLAY MONEY ONLY: Every trade, balance, and order (`place_paper_order`, `advance_market`, `seed_demo_portfolio`) is 100% play money inside the educational sandbox, never real financial advice or real money.",
].join("\n");

export type McpContext = {
  playerId: string;
};

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export type McpToolSpec = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

export const MCP_TOOLS: McpToolSpec[] = [
  {
    name: "get_account_update",
    description:
      "Get a live briefing of the user's comdirect edu sandbox account: current account (Giro), trading cash, depot value, per-position unrealized P/L in EUR and %, exact deltas since the previous agent check, recent trades, and honest market context (never fabricated company news).",
    inputSchema: {
      type: "object",
      properties: {
        mark_seen: {
          type: "boolean",
          description: "Save this check as the new baseline for future delta comparisons (default true).",
        },
        lang: {
          type: "string",
          enum: ["en", "de"],
          description: "Language for the text summary (default 'en').",
        },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Account & P/L Update Briefing",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "get_portfolio",
    description:
      "Inspect the user's sandbox portfolio in depth: sector and ETF allocation, single-stock concentration check (30% rule), max drawdown, risk-adjusted score, open limit/stop orders, and active savings plans.",
    inputSchema: {
      type: "object",
      properties: {
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Portfolio Diagnostics",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "list_market_instruments",
    description:
      "List or search all tradable stocks and ETFs in the comdirect edu sandbox by name, ticker, WKN, ISIN, sector, or instrument type, with current ask/bid prices and 1d/5d/30d moves.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional search string (ticker, name, WKN, or ISIN)." },
        sector: { type: "string", description: "Optional sector filter (e.g. Telecom, Tech, Auto, Finance, ETF)." },
        type: { type: "string", enum: ["Aktie", "ETF"] },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "List Sandbox Market Instruments",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_stock_overview",
    description:
      "Get detailed metrics for a single stock or ETF (WKN, ISIN, mid/ask/bid, 52-week range, 1d/5d/30d/90d/1Y returns, order fee examples, and the user's current holding if owned).",
    inputSchema: {
      type: "object",
      required: ["symbol"],
      properties: {
        symbol: {
          type: "string",
          description: "Ticker (e.g. DTE, SAP, MSCIW), WKN (e.g. 555750, A0RPWH), ISIN, or company name.",
        },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Stock / ETF Overview",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_learning_progress",
    description:
      "Inspect the learner's profile, persona, XP, rank, stars, unlocked modules, collected concept cards, and recommended next chapter on comdirect edu.",
    inputSchema: {
      type: "object",
      properties: {
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Learning Progress & Next Lesson",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "list_concepts",
    description:
      "List all investing concept cards and curriculum topics across comdirect edu modules, marking which cards the user has already collected.",
    inputSchema: {
      type: "object",
      properties: {
        module: { type: "integer", minimum: 1, maximum: 5, description: "Optional module filter (1-5)." },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "List Investing Concepts",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "explain_concept",
    description:
      "Explain a comdirect edu investing concept clearly using the platform's definition, real example, quiz check, and a live personalized tie-in to the user's current sandbox portfolio.",
    inputSchema: {
      type: "object",
      required: ["topic"],
      properties: {
        topic: {
          type: "string",
          description: "Concept ID or keyword (e.g. 'diversification', 'limit-order', 'fees', 'etf', 'pnl', 'spread', 'compound').",
        },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Explain Investing Concept",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "review_trades",
    description:
      "Review the user's sandbox trade history with fee-ratio coaching, limit vs. market order usage, and order-sizing habits.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, description: "Max recent trades to include (default 15)." },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Review Trade History & Fees",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_historical_replays",
    description:
      "List the 5 History Mode crash/hype replays on comdirect edu, the investing habits each teaches, and the user's completion status.",
    inputSchema: {
      type: "object",
      properties: {
        include_reveal: {
          type: "boolean",
          description: "If true, reveal hidden company names and years even before the user completes the replay (default false).",
        },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "History Mode Replays",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "place_paper_order",
    description:
      "Place a play-money buy or sell order (market, limit, or stop) in the user's comdirect edu sandbox portfolio and persist it so it syncs with the web app.",
    inputSchema: {
      type: "object",
      required: ["symbol", "side", "qty"],
      properties: {
        symbol: { type: "string", description: "Ticker, WKN, ISIN, or name (e.g. 'DTE', 'SAP', 'MSCIW')." },
        side: { type: "string", enum: ["buy", "sell"] },
        qty: { type: "integer", minimum: 1, description: "Whole number of shares." },
        type: { type: "string", enum: ["market", "limit", "stop"], description: "Order type (default 'market')." },
        limit: { type: "number", description: "Required for limit or stop orders (EUR per share)." },
        validity: { type: "string", enum: ["day", "ultimo", "max"], description: "Order validity (default 'day')." },
        transfer_from_giro: {
          type: "boolean",
          description: "If true and trading cash is short, automatically transfer the shortfall from Giro (current account) first.",
        },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Place Play-Money Paper Order",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "advance_market",
    description:
      "Fast-forward the user's sandbox simulation clock by 1 to 252 trading days, executing any matching limit/stop orders and savings plans so the user can observe realistic P/L changes.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          minimum: 1,
          maximum: 252,
          description: "Number of trading days to advance (default 5; e.g. 5 = 1 week, 21 = 1 month).",
        },
        stop_at_major: {
          type: "boolean",
          description: "Pause early if a major simulated macro/sector headline arrives (default false).",
        },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Advance Sandbox Market Time",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "seed_demo_portfolio",
    description:
      "Create a ready-to-demo play-money portfolio (MSCI World ETF, Deutsche Telekom, SAP, Allianz), record a Day-0 baseline snapshot, and advance N trading days so `get_account_update` immediately demonstrates live account and position P/L updates.",
    inputSchema: {
      type: "object",
      properties: {
        persona: { type: "string", enum: ["starter", "builder", "retiree"], description: "Default 'builder'." },
        advance_days: {
          type: "integer",
          minimum: 0,
          maximum: 252,
          description: "Trading days to fast-forward after opening positions (default 15).",
        },
        force: {
          type: "boolean",
          description: "Overwrite an existing active portfolio if present (default false).",
        },
        lang: { type: "string", enum: ["en", "de"] },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Seed Demo Portfolio",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
];

export const MCP_RESOURCES = [
  {
    uri: "comdirect://portfolio",
    name: "Sandbox Portfolio & Account Snapshot",
    description: "Live JSON snapshot of the user's comdirect edu Giro, trading cash, positions, P/L, open orders, and savings plans.",
    mimeType: "application/json",
  },
  {
    uri: "comdirect://learning-progress",
    name: "Learning Progress & Roadmap",
    description: "Persona, rank, XP, stars, unlocked modules, collected concept cards, and recommended next lesson.",
    mimeType: "application/json",
  },
  {
    uri: "comdirect://concepts",
    name: "Investing Concept Catalog",
    description: "All comdirect edu concept cards and extended curriculum concepts with examples and quizzes.",
    mimeType: "application/json",
  },
  {
    uri: "comdirect://market",
    name: "Sandbox Market Instruments",
    description: "All 12 tradable sandbox stocks and ETFs with WKN, ISIN, sectors, ask/bid prices, and recent returns.",
    mimeType: "application/json",
  },
  {
    uri: "comdirect://replays",
    name: "History Mode Replays",
    description: "Real-market crash and hype scenarios available in History Mode.",
    mimeType: "application/json",
  },
] as const;

export const MCP_PROMPTS = [
  {
    name: "account-briefing",
    description: "Give the user a clear, honest update on their comdirect edu sandbox account and how each open position performed since their last check.",
    arguments: [
      { name: "lang", description: "Preferred language: 'en' or 'de' (optional).", required: false },
    ],
  },
  {
    name: "explain-concept",
    description: "Explain an investing concept from comdirect edu and connect it directly to the user's actual sandbox portfolio.",
    arguments: [
      { name: "topic", description: "Concept to explain (e.g. diversification, limit-order, fees, etf, pnl).", required: true },
      { name: "lang", description: "Preferred language: 'en' or 'de' (optional).", required: false },
    ],
  },
  {
    name: "coach-my-portfolio",
    description: "Coach the learner on diversification, fees, and their next recommended lesson based on live sandbox data.",
    arguments: [
      { name: "lang", description: "Preferred language: 'en' or 'de' (optional).", required: false },
    ],
  },
  {
    name: "review-recent-trades",
    description: "Review recent sandbox trades calmly, focusing on decision quality, fees, and order types rather than short-term luck.",
    arguments: [
      { name: "lang", description: "Preferred language: 'en' or 'de' (optional).", required: false },
    ],
  },
] as const;

function rpcError(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

function rpcOk(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

async function callTool(name: string, args: Record<string, unknown>, playerId: string) {
  const lang = resolveLang(args.lang);
  switch (name) {
    case "get_account_update":
      return getAccountUpdate(playerId, {
        markSeen: args.mark_seen === undefined ? true : Boolean(args.mark_seen),
        lang,
      });
    case "get_portfolio":
      return getPortfolioDiagnostics(playerId, lang);
    case "list_market_instruments":
      return listMarketInstruments(playerId, {
        query: typeof args.query === "string" ? args.query : undefined,
        sector: typeof args.sector === "string" ? args.sector : undefined,
        type: args.type === "Aktie" || args.type === "ETF" ? args.type : undefined,
        lang,
      });
    case "get_stock_overview":
      if (typeof args.symbol !== "string" || !args.symbol.trim()) {
        return { isError: true, text: "Missing required parameter `symbol`.", data: { error: "missing_symbol" } };
      }
      return getStockOverview(playerId, args.symbol, lang);
    case "get_learning_progress":
      return getLearningProgress(playerId, lang);
    case "list_concepts":
      return listConcepts(playerId, {
        module: typeof args.module === "number" ? args.module : undefined,
        lang,
      });
    case "explain_concept":
      if (typeof args.topic !== "string" || !args.topic.trim()) {
        return { isError: true, text: "Missing required parameter `topic`.", data: { error: "missing_topic" } };
      }
      return explainConcept(playerId, args.topic, lang);
    case "review_trades":
      return reviewTrades(playerId, {
        limit: typeof args.limit === "number" ? args.limit : undefined,
        lang,
      });
    case "get_historical_replays":
      return getHistoricalReplays(playerId, {
        includeReveal: Boolean(args.include_reveal),
        lang,
      });
    case "place_paper_order":
      if (typeof args.symbol !== "string" || typeof args.side !== "string" || typeof args.qty !== "number") {
        return {
          isError: true,
          text: "Parameters `symbol` (string), `side` ('buy'|'sell'), and `qty` (positive integer) are required.",
          data: { error: "invalid_arguments" },
        };
      }
      return placePaperOrder(playerId, {
        symbol: args.symbol,
        side: args.side as "buy" | "sell",
        qty: args.qty,
        type: typeof args.type === "string" ? (args.type as "market" | "limit" | "stop") : "market",
        limit: typeof args.limit === "number" ? args.limit : undefined,
        validity: typeof args.validity === "string" ? (args.validity as "day" | "ultimo" | "max") : "day",
        transferFromGiro: Boolean(args.transfer_from_giro),
        lang,
      });
    case "advance_market":
      return advanceMarket(playerId, {
        days: typeof args.days === "number" ? args.days : undefined,
        stopAtMajor: Boolean(args.stop_at_major),
        lang,
      });
    case "seed_demo_portfolio":
      return seedDemoPortfolio(playerId, {
        persona:
          args.persona === "starter" || args.persona === "builder" || args.persona === "retiree"
            ? args.persona
            : undefined,
        advanceDays: typeof args.advance_days === "number" ? args.advance_days : undefined,
        force: Boolean(args.force),
        lang,
      });
    default:
      return null;
  }
}

async function readResource(uri: string, playerId: string) {
  switch (uri) {
    case "comdirect://portfolio": {
      const r = await getAccountUpdate(playerId, { markSeen: false });
      return { uri, mimeType: "application/json", text: JSON.stringify(r.data, null, 2) };
    }
    case "comdirect://learning-progress": {
      const r = await getLearningProgress(playerId);
      return { uri, mimeType: "application/json", text: JSON.stringify(r.data, null, 2) };
    }
    case "comdirect://concepts": {
      const r = await listConcepts(playerId);
      return { uri, mimeType: "application/json", text: JSON.stringify(r.data, null, 2) };
    }
    case "comdirect://market": {
      const r = await listMarketInstruments(playerId);
      return { uri, mimeType: "application/json", text: JSON.stringify(r.data, null, 2) };
    }
    case "comdirect://replays": {
      const r = await getHistoricalReplays(playerId);
      return { uri, mimeType: "application/json", text: JSON.stringify(r.data, null, 2) };
    }
    default:
      return null;
  }
}

function getPrompt(name: string, args: Record<string, unknown>) {
  const lang = resolveLang(args.lang);
  switch (name) {
    case "account-briefing":
      return {
        description: "Clear P/L and account update briefing based strictly on real platform numbers.",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                lang === "de"
                  ? `Rufe zuerst \`get_account_update\` (lang: "de") auf und gib mir ein klares, kurzes Update zu meinem comdirect edu Sandbox-Konto: wie sich der Depotwert verändert hat, welche Positionen wie viel € und % im Plus/Minus liegen und was sich seit dem letzten Check bewegt hat. ${HONESTY_NOTICE}`
                  : `Call \`get_account_update\` first and give me a clear, concise briefing on my comdirect edu sandbox account: total value, how much each open position gained or lost in EUR and %, and what changed since my last check. ${HONESTY_NOTICE}`,
            },
          },
        ],
      };
    case "explain-concept": {
      const topic = typeof args.topic === "string" && args.topic.trim() ? args.topic.trim() : "diversification";
      return {
        description: `Explain "${topic}" with a tie-in to the user's sandbox portfolio.`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Call \`explain_concept\` with topic="${topic}" and lang="${lang}". Explain it in plain language, connect it directly to my actual sandbox portfolio numbers, and finish with the short check question (wait for my answer before revealing it).`,
            },
          },
        ],
      };
    }
    case "coach-my-portfolio":
      return {
        description: "Diversification, fee, and next-lesson coaching.",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Call \`get_portfolio\` and \`get_learning_progress\` (lang="${lang}"). Review my portfolio balance, single-stock concentration (30% rule), fee efficiency, and suggest my next concrete lesson on comdirect edu. Do not fabricate real-world news.`,
            },
          },
        ],
      };
    case "review-recent-trades":
      return {
        description: "Behavioral and fee review of executed sandbox trades.",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Call \`review_trades\` (lang="${lang}"). Coach me calmly on my order types (limit vs. market), fee percentages, and position sizing without judging short-term luck.`,
            },
          },
        ],
      };
    default:
      return null;
  }
}

export async function handleJsonRpcMessage(
  raw: unknown,
  ctx: McpContext,
): Promise<JsonRpcResponse | null> {
  if (typeof raw !== "object" || raw === null || (raw as { jsonrpc?: unknown }).jsonrpc !== "2.0") {
    return rpcError(null, -32600, "Invalid Request: expected JSON-RPC 2.0 object.");
  }

  const req = raw as JsonRpcRequest;
  const hasId = req.id !== undefined;
  const id = req.id ?? null;

  if (typeof req.method !== "string") {
    return hasId ? rpcError(id, -32600, "Invalid Request: missing string method.") : null;
  }

  // Notifications carry no id and must not produce a JSON-RPC response
  if (!hasId || req.method.startsWith("notifications/")) {
    return null;
  }

  const playerId = isValidPlayerId(ctx.playerId) ? ctx.playerId : DEFAULT_MCP_PLAYER_ID;
  const params = req.params && typeof req.params === "object" ? req.params : {};

  try {
    switch (req.method) {
      case "initialize": {
        const clientProto = typeof params.protocolVersion === "string" ? params.protocolVersion : DEFAULT_PROTOCOL;
        const protocolVersion = (SUPPORTED_PROTOCOLS as readonly string[]).includes(clientProto)
          ? clientProto
          : DEFAULT_PROTOCOL;
        return rpcOk(id, {
          protocolVersion,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: MCP_SERVER_INFO,
          instructions: MCP_INSTRUCTIONS,
        });
      }

      case "ping":
        return rpcOk(id, {});

      case "tools/list":
        return rpcOk(id, { tools: MCP_TOOLS });

      case "tools/call": {
        const name = typeof params.name === "string" ? params.name : "";
        const toolArgs =
          params.arguments && typeof params.arguments === "object"
            ? (params.arguments as Record<string, unknown>)
            : {};
        if (!name) return rpcError(id, -32602, "Invalid params: missing tool name.");
        const res = await callTool(name, toolArgs, playerId);
        if (!res) return rpcError(id, -32602, `Unknown tool: ${name}`);
        return rpcOk(id, {
          content: [{ type: "text", text: res.text }],
          structuredContent: res.data,
          ...("isError" in res && res.isError ? { isError: true } : {}),
        });
      }

      case "resources/list":
        return rpcOk(id, { resources: MCP_RESOURCES });

      case "resources/templates/list":
        return rpcOk(id, { resourceTemplates: [] });

      case "resources/read": {
        const uri = typeof params.uri === "string" ? params.uri : "";
        if (!uri) return rpcError(id, -32602, "Invalid params: missing resource uri.");
        const content = await readResource(uri, playerId);
        if (!content) return rpcError(id, -32002, `Resource not found: ${uri}`, { uri });
        return rpcOk(id, { contents: [content] });
      }

      case "prompts/list":
        return rpcOk(id, { prompts: MCP_PROMPTS });

      case "prompts/get": {
        const name = typeof params.name === "string" ? params.name : "";
        const promptArgs =
          params.arguments && typeof params.arguments === "object"
            ? (params.arguments as Record<string, unknown>)
            : {};
        if (!name) return rpcError(id, -32602, "Invalid params: missing prompt name.");
        const prompt = getPrompt(name, promptArgs);
        if (!prompt) return rpcError(id, -32602, `Unknown prompt: ${name}`);
        return rpcOk(id, prompt);
      }

      default:
        return rpcError(id, -32601, `Method not found: ${req.method}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal MCP server error";
    return rpcError(id, -32603, message);
  }
}

export async function handleJsonRpcPayload(
  payload: unknown,
  ctx: McpContext,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    if (payload.length === 0) return rpcError(null, -32600, "Invalid Request: empty batch.");
    const results = await Promise.all(payload.map((item) => handleJsonRpcMessage(item, ctx)));
    const responses = results.filter((r): r is JsonRpcResponse => r !== null);
    return responses.length > 0 ? responses : null;
  }
  return handleJsonRpcMessage(payload, ctx);
}
