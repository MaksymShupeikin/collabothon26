// Layer 2 · server gateway for the study-buddy chat. The Claude API key stays here (ANTHROPIC_API_KEY), never in the browser.
import Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "@/features/assistant/agent";
import type { ChatEvent, ChatTurn, LearnerContext } from "@/features/assistant/types";

export const maxDuration = 60;

const MAX_QUESTION = 1500; // characters in the newest question
const MAX_TURN = 4000; // characters kept per earlier turn
const MAX_TURNS = 12; // earlier turns kept as memory
const ID = /^[\w.\-★👾]{1,40}$/u;

// Small in-memory limiter per IP: 20 questions per 10 minutes. Good enough for one container; use a shared store when scaling out.
const WINDOW = 10 * 60_000;
const LIMIT = 20;
const hits = new Map<string, number[]>();
function allow(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.delete(hits.keys().next().value!);
  return true;
}

function parseHistory(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const turns: ChatTurn[] = [];
  for (const t of raw.slice(-(MAX_TURNS + 1))) {
    const role = (t as ChatTurn)?.role;
    const content = (t as ChatTurn)?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) continue;
    // Merge accidental repeats so roles alternate.
    const last = turns.at(-1);
    if (last?.role === role) last.content += `\n\n${content}`;
    else turns.push({ role, content: content.slice(0, MAX_TURN) });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  const question = turns.at(-1);
  if (!question || question.role !== "user" || question.content.length > MAX_QUESTION) return null;
  return turns;
}

function parseLearner(raw: unknown): LearnerContext {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && ID.test(x)).slice(0, 80) : []);
  return {
    path: typeof r.path === "string" ? r.path.slice(0, 80) : undefined,
    lang: r.lang === "de" ? "de" : "en",
    persona: typeof r.persona === "string" && ID.test(r.persona) ? r.persona : null,
    cards: ids(r.cards),
    done: ids(r.done),
    xp: typeof r.xp === "number" && Number.isFinite(r.xp) ? Math.round(r.xp) : undefined,
  };
}

const ndjson = (e: ChatEvent) => new TextEncoder().encode(JSON.stringify(e) + "\n");

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json(
      { type: "error", code: "not_configured", message: "The study buddy isn't switched on yet: ANTHROPIC_API_KEY is missing on the server." },
      { status: 503 },
    );
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(ip)) {
    return Response.json({ type: "error", code: "rate_limited", message: "That's a lot of questions at once. Take a short break and try again in a few minutes." }, { status: 429 });
  }

  let body: { messages?: unknown; learner?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ type: "error", code: "bad_request", message: "Invalid request." }, { status: 400 });
  }
  const history = parseHistory(body.messages);
  if (!history) {
    return Response.json({ type: "error", code: "bad_request", message: `Please ask a question (up to ${MAX_QUESTION} characters).` }, { status: 400 });
  }
  const learner = parseLearner(body.learner);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ChatEvent) => controller.enqueue(ndjson(e));
      try {
        await runAgent(history, learner, emit, req.signal);
      } catch (err) {
        if (req.signal.aborted) return controller.close();
        console.error("assistant:", err);
        const code = err instanceof Anthropic.RateLimitError ? "rate_limited" : err instanceof Anthropic.AuthenticationError ? "not_configured" : "upstream";
        emit({
          type: "error",
          code,
          message:
            code === "rate_limited"
              ? "The study buddy is busy right now. Try again in a moment."
              : code === "not_configured"
                ? "The study buddy's API key was rejected. Check ANTHROPIC_API_KEY on the server."
                : "Something went wrong while answering. Please try again.",
        });
      }
      emit({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
