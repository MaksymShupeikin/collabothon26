import { cookies } from "next/headers";
import {
  DEFAULT_PROTOCOL,
  handleJsonRpcPayload,
  MCP_PROMPTS,
  MCP_RESOURCES,
  MCP_SERVER_INFO,
  MCP_TOOLS,
  SUPPORTED_PROTOCOLS,
} from "@/features/mcp/server";
import { isValidPlayerId, storageKind } from "@/features/mcp/storage";

const COOKIE = "cd-edu-id";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, X-Player-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
};

async function resolvePlayerId(req: Request): Promise<string | null> {
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  if (isValidPlayerId(queryToken)) return queryToken;

  const auth = req.headers.get("authorization");
  if (auth) {
    const bearer = auth.replace(/^Bearer\s+/i, "").trim();
    if (isValidPlayerId(bearer)) return bearer;
  }

  const headerToken = req.headers.get("x-player-id");
  if (isValidPlayerId(headerToken)) return headerToken;

  try {
    const jar = await cookies();
    const cookieId = jar.get(COOKIE)?.value;
    if (isValidPlayerId(cookieId)) return cookieId;
  } catch {
    // Non-cookie MCP client request
  }

  // No shared fallback player: anonymous callers would all read and overwrite one save.
  return null;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  // Per MCP Streamable HTTP 2025-03-26 spec, servers that don't expose an unsolicited GET SSE stream return 405
  if (accept.includes("text/event-stream") && !accept.includes("application/json")) {
    return new Response("SSE stream not supported on GET; use POST for JSON-RPC.", {
      status: 405,
      headers: { ...CORS_HEADERS, Allow: "POST, DELETE, OPTIONS" },
    });
  }

  return Response.json(
    {
      ...MCP_SERVER_INFO,
      transport: "streamable-http",
      protocolVersions: SUPPORTED_PROTOCOLS,
      storage: storageKind(),
      capabilities: {
        tools: MCP_TOOLS.length,
        resources: MCP_RESOURCES.length,
        prompts: MCP_PROMPTS.length,
      },
      authentication: {
        queryParam: "?token=<player-uuid>",
        header: "Authorization: Bearer <player-uuid> or X-Player-Id: <player-uuid>",
        cookie: "cd-edu-id",
      },
    },
    { headers: CORS_HEADERS },
  );
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: invalid JSON." } },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const playerId = await resolvePlayerId(req);
  if (!playerId) {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Missing player id: add ?token=<player-uuid> or Authorization: Bearer <player-uuid>." } },
      { status: 401, headers: CORS_HEADERS },
    );
  }
  // A fresh id, not the player id: the player id is the credential and must not be echoed in headers.
  const sessionId = req.headers.get("mcp-session-id") || crypto.randomUUID();
  const response = await handleJsonRpcPayload(payload, { playerId });

  const headers: Record<string, string> = {
    ...CORS_HEADERS,
    "Mcp-Session-Id": sessionId,
    "MCP-Protocol-Version": req.headers.get("mcp-protocol-version") || DEFAULT_PROTOCOL,
    "Cache-Control": "no-store",
  };

  if (response === null) {
    return new Response(null, { status: 202, headers });
  }

  return Response.json(response, { status: 200, headers });
}

export async function DELETE() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
