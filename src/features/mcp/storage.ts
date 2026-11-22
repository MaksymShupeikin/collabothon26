import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { normalizeSave, type Save } from "../game/save.ts";

/**
 * Shared persistence for both the web app (/api/save) and the MCP server (/api/mcp + stdio CLI).
 * Uses Postgres when DATABASE_URL is configured (VPS production), and falls back to a local JSON
 * file (.data/comdirect-edu-saves.json) so local dev and stdio MCP work without database setup.
 */

export const PLAYER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DEFAULT_MCP_PLAYER_ID = "00000000-0000-4000-8000-000000000001";

export type PositionSnapshot = {
  qty: number;
  price: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
};

export type McpCheckpoint = {
  day: number;
  simDate: string;
  checkedAt: string;
  giro: number;
  cash: number;
  depotValue: number;
  totalValue: number;
  tradeCount: number;
  positions: Record<string, PositionSnapshot>;
};

type FileStore = {
  saves: Record<string, { data: Save; updatedAt: string }>;
  checkpoints: Record<string, McpCheckpoint>;
};

export type StorageKind = "postgres" | "file";

export const isValidPlayerId = (id: string | null | undefined): id is string =>
  typeof id === "string" && PLAYER_UUID_RE.test(id);

export const storageKind = (): StorageKind => (process.env.DATABASE_URL ? "postgres" : "file");

function dataFilePath(): string {
  if (process.env.COMDIRECT_MCP_DATA_FILE) return process.env.COMDIRECT_MCP_DATA_FILE;
  return path.join(process.cwd(), ".data", "comdirect-edu-saves.json");
}

// ── Postgres backend ───────────────────────────────────────────────────────

let sql: postgres.Sql | undefined;
let pgReady: Promise<void> | undefined;

async function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  sql ??= postgres(process.env.DATABASE_URL, { max: 5 });
  pgReady ??= Promise.all([
    sql`create table if not exists saves (
      id uuid primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )`,
    sql`create table if not exists mcp_checkpoints (
      id uuid primary key,
      checkpoint jsonb not null,
      updated_at timestamptz not null default now()
    )`,
  ]).then(
    () => {},
    (e) => {
      pgReady = undefined;
      throw e;
    },
  );
  await pgReady;
  return sql;
}

// ── Local file backend (serialized writes per process) ────────────────────

let fileQueue: Promise<unknown> = Promise.resolve();

function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = fileQueue.then(fn, fn);
  fileQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function readStoreFile(): Promise<FileStore> {
  const fp = dataFilePath();
  try {
    const raw = await readFile(/*turbopackIgnore: true*/ fp, "utf8");
    const parsed = JSON.parse(raw) as Partial<FileStore>;
    return {
      saves: parsed.saves && typeof parsed.saves === "object" ? parsed.saves : {},
      checkpoints: parsed.checkpoints && typeof parsed.checkpoints === "object" ? parsed.checkpoints : {},
    };
  } catch {
    return { saves: {}, checkpoints: {} };
  }
}

async function writeStoreFile(store: FileStore): Promise<void> {
  const fp = dataFilePath();
  await mkdir(path.dirname(fp), { recursive: true });
  const tmp = `${fp}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await rename(tmp, fp);
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function loadSave(playerId: string): Promise<Save | null> {
  if (!isValidPlayerId(playerId)) return null;
  if (storageKind() === "postgres") {
    const q = await db();
    const [row] = await q`select data from saves where id = ${playerId}`;
    return normalizeSave(row?.data ?? null);
  }
  const store = await readStoreFile();
  return normalizeSave(store.saves[playerId]?.data ?? null);
}

export async function writeSave(playerId: string, save: Save): Promise<void> {
  if (!isValidPlayerId(playerId)) throw new Error("Invalid player ID");
  if (storageKind() === "postgres") {
    const q = await db();
    await q`insert into saves (id, data) values (${playerId}, ${q.json(save as unknown as postgres.JSONValue)})
            on conflict (id) do update set data = excluded.data, updated_at = now()`;
    return;
  }
  await withFileLock(async () => {
    const store = await readStoreFile();
    store.saves[playerId] = { data: save, updatedAt: new Date().toISOString() };
    await writeStoreFile(store);
  });
}

export async function loadCheckpoint(playerId: string): Promise<McpCheckpoint | null> {
  if (!isValidPlayerId(playerId)) return null;
  if (storageKind() === "postgres") {
    const q = await db();
    const [row] = await q`select checkpoint from mcp_checkpoints where id = ${playerId}`;
    return (row?.checkpoint as McpCheckpoint | undefined) ?? null;
  }
  const store = await readStoreFile();
  return store.checkpoints[playerId] ?? null;
}

export async function writeCheckpoint(playerId: string, cp: McpCheckpoint): Promise<void> {
  if (!isValidPlayerId(playerId)) throw new Error("Invalid player ID");
  if (storageKind() === "postgres") {
    const q = await db();
    await q`insert into mcp_checkpoints (id, checkpoint) values (${playerId}, ${q.json(cp as unknown as postgres.JSONValue)})
            on conflict (id) do update set checkpoint = excluded.checkpoint, updated_at = now()`;
    return;
  }
  await withFileLock(async () => {
    const store = await readStoreFile();
    store.checkpoints[playerId] = cp;
    await writeStoreFile(store);
  });
}

export async function clearCheckpoint(playerId: string): Promise<void> {
  if (!isValidPlayerId(playerId)) return;
  if (storageKind() === "postgres") {
    const q = await db();
    await q`delete from mcp_checkpoints where id = ${playerId}`;
    return;
  }
  await withFileLock(async () => {
    const store = await readStoreFile();
    delete store.checkpoints[playerId];
    await writeStoreFile(store);
  });
}

/** Lists saved player IDs (helpful for local stdio diagnostics). */
export async function listSavedPlayerIds(): Promise<string[]> {
  if (storageKind() === "postgres") {
    const q = await db();
    const rows = await q`select id from saves order by updated_at desc limit 20`;
    return rows.map((r) => String(r.id));
  }
  const store = await readStoreFile();
  return Object.entries(store.saves)
    .sort((a, b) => (b[1].updatedAt ?? "").localeCompare(a[1].updatedAt ?? ""))
    .map(([id]) => id);
}
