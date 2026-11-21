"use client";
import { useSyncExternalStore } from "react";

/**
 * What the player is looking at and typing right now (not persisted).
 * Sandbox screens publish here; the guided tour reads it to know when a task is done.
 */
export type Ui = {
  surface?: "cabinet" | "pro";
  view?: string;
  sym?: string;
  query?: string;
  trAmount?: number;
  tanOpen?: boolean;
  transferDone?: number; // counter
  finderSector?: string;
  chartRange?: string;
  orderSide?: string;
  qty?: number;
  orderType?: string;
  limit?: number;
  costsOpen?: boolean;
  orderPlaced?: number; // counter
  // pro mode
  orderOpen?: boolean;
  speed?: number;
  day?: number;
  newsOpened?: string;
  planSet?: boolean;
  widgetsOpen?: boolean;
  workspace?: string;
  ended?: boolean;
  [k: string]: unknown;
};

let ui: Ui = {};
const listeners = new Set<() => void>();
export const getUi = () => ui;
export function setUi(patch: Partial<Ui>) {
  let changed = false;
  for (const k of Object.keys(patch)) if (ui[k] !== patch[k]) { changed = true; break; }
  if (!changed) return;
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}
export const bump = (k: "transferDone" | "orderPlaced") => setUi({ [k]: ((ui[k] as number) ?? 0) + 1 });
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const EMPTY: Ui = {};
export const useUi = () => useSyncExternalStore(subscribe, getUi, () => EMPTY);
