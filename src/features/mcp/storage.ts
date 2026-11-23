import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeSave, type Save } from "../game/save.ts";

/**
 * Shared persistence for both the web app (/api/save) and the MCP server (/api/mcp + stdio CLI).
 * Everything lives in one local JSON file (.data/comdirect-edu-saves.json, or COMDIRECT_MCP_DATA_FILE).
 * shortcut: one file and a per-process write lock, fine for a single server process; move to a database if you run several.
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

export const isValidPlayerId = (id: string | null | undefined): id is string =>
  typeof id === "string" && PLAYER_UUID_RE.test(id);

function dataFilePath(): string {
  if (process.env.COMDIRECT_MCP_DATA_FILE) return process.env.COMDIRECT_MCP_DATA_FILE;
  return path.join(process.cwd(), ".data", "comdirect-edu-saves.json");
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
  } catch (e) {
    // Only a missing file means "no saves yet"; anything else (bad JSON, permissions) must not be overwritten with an empty store.
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { saves: {}, checkpoints: {} };
    throw e;
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
  const store = await readStoreFile();
  return normalizeSave(store.saves[playerId]?.data ?? null);
}

export async function writeSave(playerId: string, save: Save): Promise<void> {
  if (!isValidPlayerId(playerId)) throw new Error("Invalid player ID");
  await withFileLock(async () => {
    const store = await readStoreFile();
    store.saves[playerId] = { data: save, updatedAt: new Date().toISOString() };
    await writeStoreFile(store);
  });
}

export async function loadCheckpoint(playerId: string): Promise<McpCheckpoint | null> {
  if (!isValidPlayerId(playerId)) return null;
  const store = await readStoreFile();
  return store.checkpoints[playerId] ?? null;
}

export async function writeCheckpoint(playerId: string, cp: McpCheckpoint): Promise<void> {
  if (!isValidPlayerId(playerId)) throw new Error("Invalid player ID");
  await withFileLock(async () => {
    const store = await readStoreFile();
    store.checkpoints[playerId] = cp;
    await writeStoreFile(store);
  });
}

export async function clearCheckpoint(playerId: string): Promise<void> {
  if (!isValidPlayerId(playerId)) return;
  await withFileLock(async () => {
    const store = await readStoreFile();
    delete store.checkpoints[playerId];
    await writeStoreFile(store);
  });
}

/** Lists saved player IDs (helpful for local stdio diagnostics). */
export async function listSavedPlayerIds(): Promise<string[]> {
  const store = await readStoreFile();
  return Object.entries(store.saves)
    .sort((a, b) => (b[1].updatedAt ?? "").localeCompare(a[1].updatedAt ?? ""))
    .map(([id]) => id);
}
