// Layer 5 · retrieval. BM25 over the prebuilt index, with the title counted three times.
// Pure TypeScript: no React, no SDK, no fs. Claude re-ranks by choosing which hits to read and cite.
import indexJson from "./knowledge-index.json" with { type: "json" };
import type { Chunk, ChunkType, KnowledgeIndex, LearnerContext } from "./types.ts";

const INDEX = indexJson as KnowledgeIndex;

const STOP = new Set(
  "a an and are as at be but by can do does for from has have how i if in into is it its me my of on or our so than that the their them then there these they this to was we what when where which who why will with you your".split(" "),
);

/** Very light English stemmer: enough to match "orders"/"order", "diversified"/"diversification". */
function stem(w: string): string {
  if (w.length <= 3) return w;
  for (const suf of ["ification", "ations", "ation", "ings", "ing", "ies", "ied", "ers", "er", "ed", "es", "s"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) return suf === "ies" || suf === "ied" ? w.slice(0, -3) + "y" : w.slice(0, -suf.length);
  }
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents and umlaut dots: "Gebühr" → "gebuhr" (also "й" → "и", same on both sides)
    .split(/[^a-z0-9%€а-я]+/)
    .filter((t) => t && !STOP.has(t))
    .map(stem);
}

/**
 * Safety net for German and Russian queries. The agent is told to search in English; if it doesn't,
 * these stems (matched as word prefixes) map the most common learning terms to the English index.
 */
const ALIASES = ([
  ["aktie", "stock share"], ["anleihe", "bond"], ["dividend", "dividend"], ["sparplan", "savings plan"], ["zinseszins", "compound interest"],
  ["streuung", "diversification"], ["diversifi", "diversification"], ["gebuhr", "fees"], ["kosten", "fees cost"], ["limit", "limit order"],
  ["verlust", "loss drawdown"], ["risiko", "risk"], ["schwankung", "volatility"], ["inflation", "inflation"], ["nachricht", "news headline"],
  ["borse", "market exchange"], ["kurs", "price"], ["depot", "portfolio"], ["girokonto", "current account"], ["verrechnungskonto", "trading account"],
  ["акци", "stock share"], ["облигац", "bond"], ["дивиденд", "dividend"], ["фонд", "etf fund"], ["индекс", "index etf"],
  ["диверсиф", "diversification"], ["корзин", "diversification basket"], ["сложн", "compound interest"], ["процент", "interest"],
  ["комисси", "fees"], ["спред", "spread bid ask"], ["лимит", "limit order"], ["рыночн", "market order"], ["стоп", "stop loss"],
  ["риск", "risk"], ["волатил", "volatility"], ["просадк", "drawdown"], ["инфляц", "inflation"], ["новост", "news headline signal noise"],
  ["шум", "noise"], ["сигнал", "signal"], ["слух", "rumor"], ["портфел", "portfolio"], ["ликвидн", "liquidity"], ["капитализац", "market cap"],
  ["ордер", "order"], ["заявк", "order"], ["сбережен", "savings"], ["накоплен", "savings plan"], ["кризис", "crash crisis"], ["обвал", "crash"],
] as [string, string][]).map(([k, en]): [string, string] => [tokenizeRaw(k)[0] ?? k, en]);

function tokenizeRaw(text: string): string[] {
  return text.toLowerCase().replace(/ё/g, "е").normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9%€а-я]+/).filter(Boolean);
}

function expandQuery(query: string): string[] {
  const base = tokenize(query);
  const raw = tokenizeRaw(query);
  const extra = raw.flatMap((t) => ALIASES.filter(([k]) => t.startsWith(k)).flatMap(([, en]) => tokenize(en)));
  return [...new Set([...base, ...extra])];
}

type Doc = { chunk: Chunk; tf: Map<string, number>; len: number };

const TITLE_WEIGHT = 3;
const K1 = 1.4;
/** Short definitions lose to long chapters that repeat a word; nudge the definitions up. */
const TYPE_PRIOR: Partial<Record<ChunkType, number>> = { concept: 1.35, card: 1.2 };
const B = 0.7;

function buildDocs(chunks: Chunk[]): { docs: Doc[]; df: Map<string, number>; avgLen: number } {
  const df = new Map<string, number>();
  const docs = chunks.map((chunk) => {
    const tokens = [...Array(TITLE_WEIGHT).fill(tokenize(chunk.title)).flat(), ...tokenize(`${chunk.id.split(":")[1]} ${chunk.text}`)];
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { chunk, tf, len: tokens.length };
  });
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
  return { docs, df, avgLen };
}

const CORPUS = buildDocs(INDEX.chunks);
const BY_ID = new Map(INDEX.chunks.map((c) => [c.id, c]));

export type Hit = { chunk: Chunk; score: number };

export function search(query: string, opts: { limit?: number; types?: ChunkType[] } = {}): Hit[] {
  const terms = expandQuery(query);
  if (!terms.length) return [];
  const N = CORPUS.docs.length;
  const hits: Hit[] = [];
  for (const d of CORPUS.docs) {
    if (opts.types?.length && !opts.types.includes(d.chunk.type)) continue;
    let score = 0;
    for (const t of terms) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = CORPUS.df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / CORPUS.avgLen));
    }
    if (score > 0) hits.push({ chunk: d.chunk, score: score * (TYPE_PRIOR[d.chunk.type] ?? 1) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 6);
}

export const getChunk = (id: string) => BY_ID.get(id);
export const allChunks = () => INDEX.chunks;
export const indexBuiltAt = () => INDEX.builtAt;

/** Layer 8: quiz answers and replay reveals only for learners who already earned them. */
export function unlocked(chunk: Chunk, learner: LearnerContext): boolean {
  const s = chunk.spoiler;
  if (!s) return false;
  if (s.unlockCard && learner.cards?.includes(s.unlockCard)) return true;
  if (s.unlockDone && learner.done?.includes(s.unlockDone)) return true;
  return false;
}

/** The text the agent is allowed to see for a chunk, given the learner's progress. */
export function renderChunk(chunk: Chunk, learner: LearnerContext): string {
  const spoiler = chunk.spoiler
    ? unlocked(chunk, learner)
      ? `\n[Unlocked for this learner]\n${chunk.spoiler.text}`
      : "\n[Hidden: quiz answers / reveal. The learner has not finished this yet. Do not reveal or guess them; help them think it through instead.]"
    : "";
  return `[${chunk.id}] ${chunk.title} (in the app: ${chunk.href})\n${chunk.text}${spoiler}`;
}

/** A compact id → title list for the system prompt, so the agent knows what exists without searching blindly. */
export function catalogue(): string {
  const groups = new Map<ChunkType, string[]>();
  for (const c of INDEX.chunks) {
    if (c.type === "company" || c.type === "life-event" || c.type === "lesson") continue;
    groups.set(c.type, [...(groups.get(c.type) ?? []), `${c.id} = ${c.title}`]);
  }
  return [...groups.entries()].map(([type, items]) => `${type}: ${items.join("; ")}`).join("\n");
}
