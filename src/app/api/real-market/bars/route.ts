import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { IntradayBusyError, runIntradayWorker } from "@/features/market/intraday-worker";

const dataPath = join(process.cwd(), "public/market/yahoo-daily.json");
const intervals = new Set(["5m", "15m", "1h", "4h"]);
type Bar = [number, string, number, number, number, number, number, "AFES" | "Yahoo Finance"];
type History = { bars: Bar[]; partial?: boolean };
type MarketData = { stocks: Record<string, { currency: "EUR" | "USD" }>; eurUsd: Record<string, number> };
let market: Promise<MarketData> | undefined;
const cache = new Map<string, { expires: number; task: Promise<History> }>();

async function load(symbol: string, interval: string, start: string, end: string, data: MarketData): Promise<History> {
  // Warm-up (cold uv cache), the worker limit and the queue live in intraday-worker.ts.
  const stdout = await runIntradayWorker([symbol, interval, start, end]);
  const result: History = JSON.parse(stdout);
  if (data.stocks[symbol].currency === "USD") {
    const fxDays = Object.keys(data.eurUsd).sort().reverse();
    result.bars = result.bars.map(([stamp, date, open, high, low, close, volume, source]) => {
      const rate = data.eurUsd[fxDays.find((day) => day <= date) ?? ""];
      if (!(rate > 0)) throw new Error("Missing EUR/USD reference rate");
      return [stamp, date, open / rate, high / rate, low / rate, close / rate, volume, source];
    });
  }
  return result;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const symbol = params.get("symbol") ?? "";
  const interval = params.get("interval") ?? "";
  const month = params.get("month") ?? "";
  if (!intervals.has(interval) || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    return Response.json({ error: "Invalid interval or month." }, { status: 400 });
  }

  try {
    market ??= readFile(dataPath, "utf8").then((contents) => JSON.parse(contents));
    const data = await market;
    if (!Object.hasOwn(data.stocks, symbol)) return Response.json({ error: "Unknown ticker." }, { status: 404 });

    const [year, number] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, number - 2, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10);
    const key = `${symbol}:${interval}:${month}`;
    // Requests for the same chart share one task; a failed task is dropped so the next request retries.
    const existing = cache.get(key);
    let task: Promise<History>;
    if (existing && existing.expires > Date.now()) task = existing.task;
    else {
      task = load(symbol, interval, start, end, data);
      cache.delete(key);
      if (cache.size >= 36) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 10 * 60_000, task });
    }
    try {
      const result = await task;
      if (result.partial) cache.delete(key);
      return Response.json(result);
    } catch (error) {
      if (cache.get(key)?.task === task) cache.delete(key);
      if (error instanceof IntradayBusyError) return Response.json({ error: "Market data is busy. Try again." }, { status: 503 });
      return Response.json({ error: "Intraday quotes are temporarily unavailable." }, { status: 502 });
    }
  } catch {
    market = undefined;
    return Response.json({ error: "Could not load intraday quotes." }, { status: 503 });
  }
}
