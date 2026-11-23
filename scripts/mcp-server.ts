#!/usr/bin/env node
/**
 * comdirect edu MCP stdio server (runs with plain Node.js 22+/24, zero build step).
 *
 * Modes:
 *   1. Local shared storage (.data/comdirect-edu-saves.json):
 *        npm run mcp -- --player <uuid>
 *   2. Remote HTTP bridge (connects stdio-only clients like Claude Desktop to a deployed server):
 *        npm run mcp -- --url https://comdirect.vokh.dev/api/mcp?token=<uuid>
 *
 * Protocol: Supports newline-delimited JSON-RPC 2.0 (MCP standard) AND Content-Length framed frames.
 * All diagnostics are written to stderr; stdout is reserved strictly for JSON-RPC messages.
 */

import { handleJsonRpcPayload } from "../src/features/mcp/server.ts";
import {
  DEFAULT_MCP_PLAYER_ID,
  isValidPlayerId,
  listSavedPlayerIds,
} from "../src/features/mcp/storage.ts";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  const prefix = `${flag}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const remoteUrl = argValue("--url") ?? process.env.COMDIRECT_EDU_MCP_URL;
const explicitPlayer = argValue("--player") ?? process.env.COMDIRECT_EDU_PLAYER;

async function resolveLocalPlayerId(): Promise<string> {
  if (isValidPlayerId(explicitPlayer)) return explicitPlayer;
  try {
    const saved = await listSavedPlayerIds();
    if (saved.length > 0) return saved[0];
  } catch {
    // Fall back cleanly if storage isn't initialized yet
  }
  return DEFAULT_MCP_PLAYER_ID;
}

async function dispatch(rawJson: string, playerId: string, sessionId: { value: string | null }) {
  let payload: unknown;
  try {
    payload = JSON.parse(rawJson);
  } catch {
    return {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error: invalid JSON." },
    };
  }

  if (remoteUrl) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
    };
    if (isValidPlayerId(explicitPlayer)) headers["x-player-id"] = explicitPlayer;
    if (sessionId.value) headers["mcp-session-id"] = sessionId.value;
    const res = await fetch(remoteUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const nextSession = res.headers.get("mcp-session-id");
    if (nextSession) sessionId.value = nextSession;
    if (res.status === 202 || res.status === 204) return null;
    if (!res.ok) {
      const id = typeof payload === "object" && payload && "id" in payload ? (payload as { id?: unknown }).id ?? null : null;
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: `Remote MCP endpoint returned HTTP ${res.status}` },
      };
    }
    return await res.json();
  }

  return handleJsonRpcPayload(payload, { playerId });
}

async function main() {
  const playerId = remoteUrl ? (explicitPlayer ?? "remote") : await resolveLocalPlayerId();
  const sessionId = { value: null as string | null };

  if (remoteUrl) {
    process.stderr.write(`[comdirect-edu-mcp] stdio bridge ready -> ${remoteUrl}\n`);
  } else {
    process.stderr.write(`[comdirect-edu-mcp] stdio server ready (player=${playerId})\n`);
  }

  let buffer = Buffer.alloc(0);
  let useContentLength = false;
  let queue: Promise<void> = Promise.resolve();

  function emit(msg: unknown) {
    const json = JSON.stringify(msg);
    if (useContentLength) {
      const len = Buffer.byteLength(json, "utf8");
      process.stdout.write(`Content-Length: ${len}\r\n\r\n${json}`);
    } else {
      process.stdout.write(`${json}\n`);
    }
  }

  function enqueue(rawJson: string) {
    queue = queue.then(async () => {
      try {
        const res = await dispatch(rawJson, playerId, sessionId);
        if (res !== null && res !== undefined) emit(res);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[comdirect-edu-mcp] error: ${message}\n`);
      }
    });
  }

  function drain() {
    while (buffer.length > 0) {
      // Skip leading whitespace / blank lines between frames
      let start = 0;
      while (start < buffer.length && (buffer[start] === 0x0a || buffer[start] === 0x0d || buffer[start] === 0x20 || buffer[start] === 0x09)) {
        start++;
      }
      if (start > 0) buffer = buffer.subarray(start);
      if (buffer.length === 0) return;

      // Mode A: Content-Length header framing
      if (buffer.subarray(0, 15).toString("ascii").toLowerCase().startsWith("content-length:")) {
        useContentLength = true;
        const headerEnd = buffer.indexOf("\r\n\r\n");
        if (headerEnd === -1) return;
        const headerText = buffer.subarray(0, headerEnd).toString("ascii");
        const m = /content-length:\s*(\d+)/i.exec(headerText);
        if (!m) {
          buffer = buffer.subarray(headerEnd + 4);
          continue;
        }
        const len = Number(m[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + len) return;
        const body = buffer.subarray(bodyStart, bodyStart + len).toString("utf8");
        buffer = buffer.subarray(bodyStart + len);
        enqueue(body);
        continue;
      }

      // Mode B: Newline-delimited JSON-RPC (standard MCP stdio transport)
      const nl = buffer.indexOf(0x0a);
      if (nl === -1) return;
      const line = buffer.subarray(0, nl).toString("utf8").trim();
      buffer = buffer.subarray(nl + 1);
      if (line) enqueue(line);
    }
  }

  process.stdin.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    drain();
  });

  process.stdin.on("end", () => {
    if (buffer.length > 0) {
      const rest = buffer.toString("utf8").trim();
      if (rest && !rest.toLowerCase().startsWith("content-length:")) enqueue(rest);
    }
    void queue.finally(() => process.exit(0));
  });
}

void main();
