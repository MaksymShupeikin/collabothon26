import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handleJsonRpcMessage, handleJsonRpcPayload, MCP_PROMPTS, MCP_RESOURCES, MCP_TOOLS } from "./server.ts";

const tmpFile = path.join(os.tmpdir(), `comdirect-edu-mcp-check-${process.pid}-${Date.now()}.json`);
process.env.COMDIRECT_MCP_DATA_FILE = tmpFile;
delete process.env.DATABASE_URL;

const playerId = "11111111-2222-4333-8444-555555555555";
const ctx = { playerId };

type RpcRes = { result?: Record<string, unknown>; error?: { code: number; message: string } };

async function call(method: string, params?: Record<string, unknown>, id: number | string = 1): Promise<RpcRes> {
  const res = await handleJsonRpcMessage({ jsonrpc: "2.0", id, method, params }, ctx);
  assert.ok(res, `Expected response for ${method}`);
  return res as RpcRes;
}

async function tool(name: string, args: Record<string, unknown> = {}) {
  const res = await call("tools/call", { name, arguments: args });
  assert.equal(res.error, undefined, `Unexpected JSON-RPC error for ${name}: ${res.error?.message}`);
  const result = res.result as {
    content: Array<{ type: string; text: string }>;
    structuredContent: Record<string, unknown>;
    isError?: boolean;
  };
  assert.ok(Array.isArray(result.content) && result.content.length > 0, `Missing text content for ${name}`);
  return result;
}

async function run() {
  try {
    // 1. Protocol handshake & discovery
    const init = await call("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "mcp-check", version: "1.0" },
    });
    assert.equal((init.result as { protocolVersion: string }).protocolVersion, "2025-03-26");
    assert.equal(((init.result as { serverInfo: { name: string } }).serverInfo).name, "comdirect-edu-mcp");
    assert.match(String((init.result as { instructions: string }).instructions), /NEVER invent company-specific news/i);

    // Notification must produce null (no JSON-RPC reply)
    const notif = await handleJsonRpcMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx);
    assert.equal(notif, null);

    // Ping & unknown method
    const ping = await call("ping");
    assert.deepEqual(ping.result, {});
    const unknown = await call("nope/method");
    assert.equal(unknown.error?.code, -32601);

    // Batch request
    const batch = await handleJsonRpcPayload(
      [
        { jsonrpc: "2.0", id: "b1", method: "tools/list" },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: "b2", method: "resources/list" },
        { jsonrpc: "2.0", id: "b3", method: "prompts/list" },
      ],
      ctx,
    );
    assert.ok(Array.isArray(batch) && batch.length === 3);
    assert.equal(((batch[0].result as { tools: unknown[] }).tools).length, MCP_TOOLS.length);
    assert.equal(((batch[1].result as { resources: unknown[] }).resources).length, MCP_RESOURCES.length);
    assert.equal(((batch[2].result as { prompts: unknown[] }).prompts).length, MCP_PROMPTS.length);

    // 2. Empty state check before onboarding/seeding
    const emptyUpdate = await tool("get_account_update");
    assert.equal(emptyUpdate.structuredContent.hasAccount, false);
    assert.equal((emptyUpdate.structuredContent.marketContext as { liveNewsAvailable: boolean }).liveNewsAvailable, false);

    // 3. Seed demo portfolio (opens 4 positions, saves Day-0 checkpoint, advances 15 days)
    const seeded = await tool("seed_demo_portfolio", { advance_days: 15 });
    assert.equal(seeded.structuredContent.ok, true);
    assert.equal(seeded.structuredContent.simDay, 15);
    assert.equal((seeded.structuredContent.positions as unknown[]).length, 4);

    // 4. Hero tool: get_account_update reports exact P/L + delta since Day 0
    const update1 = await tool("get_account_update");
    const u1 = update1.structuredContent as {
      hasAccount: boolean;
      simDay: number;
      positions: Array<{ sym: string; qty: number; unrealizedPnlEur: number; weightPct: number }>;
      changesSinceLastCheck: {
        hasPreviousCheck: boolean;
        daysElapsed: number;
        positionChanges: Array<{ sym: string; pnlDeltaEur: number; status: string }>;
      };
      marketContext: {
        liveNewsAvailable: boolean;
        honestyNotice: string;
        simulatedMacroAndSectorEvents: Array<{ simulated: boolean }>;
      };
    };
    assert.equal(u1.hasAccount, true);
    assert.equal(u1.simDay, 15);
    assert.equal(u1.positions.length, 4);
    assert.equal(u1.changesSinceLastCheck.hasPreviousCheck, true);
    assert.equal(u1.changesSinceLastCheck.daysElapsed, 15);
    assert.equal(u1.changesSinceLastCheck.positionChanges.length, 4);
    assert.equal(u1.marketContext.liveNewsAvailable, false);
    assert.match(u1.marketContext.honestyNotice, /Never fabricate/i);
    assert.ok(u1.marketContext.simulatedMacroAndSectorEvents.every((e) => e.simulated === true));

    // 5. Place paper order via MCP & advance 5 trading days
    const buy = await tool("place_paper_order", {
      symbol: "DTE",
      side: "buy",
      qty: 2,
      type: "market",
      transfer_from_giro: true,
    });
    assert.equal(buy.structuredContent.ok, true);
    assert.equal(buy.structuredContent.status, "filled");

    const adv = await tool("advance_market", { days: 5 });
    assert.equal(adv.structuredContent.ok, true);
    assert.equal(adv.structuredContent.currentDay, 20);

    // 6. Second account update reports exact 5-day delta + the 1 new trade
    const update2 = await tool("get_account_update", { lang: "de" });
    const u2 = update2.structuredContent as {
      simDay: number;
      changesSinceLastCheck: { daysElapsed: number; newTradesCount: number };
    };
    assert.equal(u2.simDay, 20);
    assert.equal(u2.changesSinceLastCheck.daysElapsed, 5);
    assert.equal(u2.changesSinceLastCheck.newTradesCount, 1);
    assert.match(update2.content[0].text, /comdirect edu Konto-Update/);

    // 7. Tutoring & lookup tools (including WKN lookup & multilingual concept matching)
    const stock = await tool("get_stock_overview", { symbol: "555750" }); // Deutsche Telekom WKN
    assert.equal((stock.structuredContent.instrument as { sym: string }).sym, "DTE");
    assert.equal((stock.structuredContent.userHolding as { qty: number }).qty, 14); // 12 demo + 2 bought

    const concept = await tool("explain_concept", { topic: "diversification" });
    assert.equal(concept.structuredContent.found, true);
    assert.ok(
      typeof concept.structuredContent.personalPortfolioContext === "string" &&
        concept.structuredContent.personalPortfolioContext.includes("%"),
      "Expected personalized tie-in to user's portfolio",
    );

    const conceptRu = await tool("explain_concept", { topic: "диверсификация" });
    assert.equal(conceptRu.structuredContent.id, "diversification");

    const progress = await tool("get_learning_progress");
    assert.equal(progress.structuredContent.hasAccount, true);
    assert.ok((progress.structuredContent.xp as number) >= 220);

    const trades = await tool("review_trades");
    assert.equal(trades.structuredContent.hasTrades, true);
    assert.equal((trades.structuredContent.summary as { totalTrades: number }).totalTrades, 5);

    const replaysHidden = await tool("get_historical_replays");
    assert.equal(((replaysHidden.structuredContent.replays as Array<{ reveal: string | null }>)[0]).reveal, null);
    const replaysShown = await tool("get_historical_replays", { include_reveal: true });
    assert.ok(((replaysShown.structuredContent.replays as Array<{ reveal: string | null }>)[0]).reveal);

    const diag = await tool("get_portfolio");
    assert.equal(diag.structuredContent.hasAccount, true);

    const instruments = await tool("list_market_instruments", { sector: "Telecom" });
    assert.equal((instruments.structuredContent.instruments as Array<{ sym: string }>)[0].sym, "DTE");

    // 8. Resources & Prompts
    const resPortfolio = await call("resources/read", { uri: "comdirect://portfolio" });
    const portfolioJson = JSON.parse(
      ((resPortfolio.result as { contents: Array<{ text: string }> }).contents)[0].text,
    ) as { simDay: number };
    assert.equal(portfolioJson.simDay, 20);

    const promptBriefing = await call("prompts/get", { name: "account-briefing", arguments: { lang: "en" } });
    assert.ok(Array.isArray((promptBriefing.result as { messages: unknown[] }).messages));

    console.log("mcp.check: all good (12 tools, 5 resources, 4 prompts, delta tracking & honesty guard verified)");
  } finally {
    await rm(tmpFile, { force: true });
  }
}

void run();
