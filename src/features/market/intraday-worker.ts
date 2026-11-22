import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

// Runs scripts/read-intraday.py through uv. Two problems this module solves:
// 1. Cold uv cache (fresh machine, cleaned disk): the first run downloads ~20 MB of Python packages and
//    can take longer than a request may wait. warmIntraday() installs them once, with its own long timeout,
//    and every request waits for that single warm-up instead of three requests downloading in parallel.
// 2. Bursts: at most MAX_WORKERS run at once; extra requests queue for a slot instead of failing at once.
// State lives on globalThis so the instrumentation hook, the route module and dev hot reloads share it.

const run = promisify(execFile);
const uv = () => process.env.REAL_MARKET_UV || "uv";
const DEPS = ["run", "--no-project", "--with", "yfinance==1.8.0", "--with", "exchange-calendars"];
const MAX_WORKERS = 3;
const WARM_TIMEOUT_MS = 180_000; // package download on a cold cache
const QUOTES_TIMEOUT_MS = 30_000; // quote download only; packages are already installed
const QUEUE_WAIT_MS = 20_000;

export class IntradayBusyError extends Error {}

type State = { warm?: Promise<void>; active: number; waiters: (() => void)[] };
const g = globalThis as typeof globalThis & { __intradayWorker?: State };
const state: State = (g.__intradayWorker ??= { active: 0, waiters: [] });

/** Installs the worker's Python packages once. A failure clears the promise so the next caller retries. */
export function warmIntraday(): Promise<void> {
  state.warm ??= run(uv(), [...DEPS, "python", "-c", "import yfinance, exchange_calendars"], { timeout: WARM_TIMEOUT_MS })
    .then(() => undefined)
    .catch((error: unknown) => {
      state.warm = undefined;
      throw error;
    });
  return state.warm;
}

function acquire(): Promise<boolean> {
  if (state.active < MAX_WORKERS) {
    state.active++;
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const wake = () => {
      clearTimeout(timer);
      state.active++;
      resolve(true);
    };
    const timer = setTimeout(() => {
      state.waiters = state.waiters.filter((w) => w !== wake);
      resolve(false);
    }, QUEUE_WAIT_MS);
    state.waiters.push(wake);
  });
}

function release() {
  state.active = Math.max(0, state.active - 1);
  state.waiters.shift()?.();
}

/** Returns the worker's stdout (JSON). Throws IntradayBusyError if no slot frees up within QUEUE_WAIT_MS. */
export async function runIntradayWorker(args: string[]): Promise<string> {
  await warmIntraday();
  if (!(await acquire())) throw new IntradayBusyError("Market data is busy.");
  try {
    const { stdout } = await run(uv(), [...DEPS, "python", join(process.cwd(), "scripts/read-intraday.py"), ...args], {
      timeout: QUOTES_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
    });
    return stdout;
  } finally {
    release();
  }
}
