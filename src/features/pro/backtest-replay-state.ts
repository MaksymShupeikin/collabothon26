import type { ReplayBar } from "@/features/market/replay-market";

export const BT_SPEEDS = [0.5, 1, 2, 5, 10] as const;
export type BtSpeed = (typeof BT_SPEEDS)[number];
export const BT_DEFAULT_BACK = 63; // ~3 months of trading sessions before the latest bar

/** Indices into `closes` where the selected instrument actually traded (skips market holidays). */
export function tradableIndices(length: number, replayBars?: ReplayBar[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    if (!replayBars?.[i]?.closed) out.push(i);
  }
  return out;
}

/**
 * Resolve the position inside `tradable` for a given `cursor` index into `closes`.
 * When switching stocks across different market calendars (e.g. Xetra -> US holiday),
 * falls back to the nearest earlier tradable session instead of jumping to index 0.
 */
export function resolveTradablePos(tradable: number[], cursor: number): number {
  if (tradable.length === 0) return 0;
  let lo = 0;
  let hi = tradable.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tradable[mid] <= cursor) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const minPos = tradable.length > 1 ? 1 : 0;
  return Math.max(minPos, Math.min(tradable.length - 1, best));
}

/** Default starting bar index when entering backtest mode (~3 months back, leaving at least 2 bars visible). */
export function defaultBacktestCursor(tradable: number[], barsBack = BT_DEFAULT_BACK): number {
  if (tradable.length === 0) return 0;
  const minPos = tradable.length > 1 ? 1 : 0;
  const pos = Math.max(minPos, tradable.length - 1 - barsBack);
  return tradable[pos];
}

/** Step forward (+1) or backward (-1) by one tradable session, safely clamped. */
export function stepTradableCursor(tradable: number[], cursor: number, delta: -1 | 1): number | null {
  if (tradable.length === 0) return null;
  const minPos = tradable.length > 1 ? 1 : 0;
  const currentPos = resolveTradablePos(tradable, cursor);
  const nextPos = currentPos + delta;
  if (nextPos < minPos || nextPos >= tradable.length) return null;
  return tradable[nextPos];
}

/** Map a scrubber position (`minPos .. tradable.length - 1`) to a `closes` index. */
export function cursorAtPos(tradable: number[], pos: number): number | null {
  if (tradable.length === 0) return null;
  const minPos = tradable.length > 1 ? 1 : 0;
  const clamped = Math.max(minPos, Math.min(tradable.length - 1, pos));
  return tradable[clamped];
}

/** Map a clicked Lightweight Charts time (ISO string or business day) to the nearest tradable cursor. */
export function cursorFromIsoDate(times: string[], tradable: number[], isoDate: string): number | null {
  if (times.length === 0 || tradable.length === 0) return null;
  const exact = times.indexOf(isoDate);
  if (exact >= 0) return tradable[resolveTradablePos(tradable, exact)];
  // Nearest session <= isoDate
  let found = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= isoDate) found = i;
    else break;
  }
  if (found < 0) return tradable[Math.min(1, tradable.length - 1)];
  return tradable[resolveTradablePos(tradable, found)];
}
