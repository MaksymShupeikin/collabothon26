// Runs once when the Next.js server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { warmIntraday } = await import("./features/market/intraday-worker");
  // Fire and forget: server start is not blocked; the first intraday request waits for this same warm-up.
  warmIntraday().catch((error: unknown) => console.warn("[intraday] warm-up failed, will retry on first request:", error instanceof Error ? error.message : error));
}
