"use client";
import { useSyncExternalStore } from "react";

// shortcut: progress lives in this browser's localStorage only; move to the comdirect profile when a backend exists.
export type Progress = { xp: number; done: string[]; tour: boolean };
const KEY = "cd-edu-progress";
const EMPTY: Progress = { xp: 0, done: [], tour: false };
let cache: Progress | null = null;
const listeners = new Set<() => void>();

function read(): Progress {
  if (cache) return cache;
  try { cache = { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { cache = EMPTY; }
  return cache!;
}
function write(p: Progress) {
  cache = p;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: keep in memory */ }
  listeners.forEach((l) => l());
}
export const tourDone = () => read().tour;
const subscribe =(l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const RANKS: [number, string][] = [[0, "Saver"], [100, "Beginner"], [300, "Investor"], [600, "Strategist"], [1000, "Market Reader"]];
export function rankOf(xp: number) {
  const i = RANKS.findLastIndex(([min]) => xp >= min);
  const next = RANKS[i + 1];
  return { level: i + 1, name: RANKS[i][1], next: next?.[1], progress: next ? (xp - RANKS[i][0]) / (next[0] - RANKS[i][0]) : 1, toNext: next ? next[0] - xp : 0 };
}

export function useProgress() {
  const p = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    p,
    addXP: (n: number) => write({ ...read(), xp: read().xp + n }),
    complete: (id: string, xp: number) => { const c = read(); if (!c.done.includes(id)) write({ ...c, xp: c.xp + xp, done: [...c.done, id] }); },
    finishTour: (xp = 50) => { const c = read(); if (!c.tour) write({ ...c, tour: true, xp: c.xp + xp }); },
    reset: () => write(EMPTY),
  };
}
