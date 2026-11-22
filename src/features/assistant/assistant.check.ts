// Layer 8 · checks for the study buddy that need no API key: retrieval finds the right lesson, spoilers stay hidden,
// and only retrieved ids become citations. Run: npm run check
import assert from "node:assert/strict";
import { allChunks, getChunk, renderChunk, search } from "./retrieval.ts";
import { citedSources } from "./agent.ts";

// Control questions: the query the agent sends (or the learner's own words) → the chunk that must be in the top 3.
const CASES: [string, string][] = [
  ["what is an etf basket of companies", "concept:etf"],
  ["limit order price", "concept:limit-order"],
  ["why diversify eggs one basket", "concept:diversification"],
  ["compound interest snowball", "concept:compound"],
  ["bid ask spread cost", "concept:spread"],
  ["stop loss sell automatically", "concept:stop-loss"],
  ["fees TER yearly fund cost", "concept:fees"],
  ["drawdown fell from highest point", "concept:drawdown"],
  ["transfer money to trading account photoTAN", "chapter:1.2"],
  ["payments company auditor cash cannot be confirmed", "replay:wirecard"],
  ["emission tests carmaker headline signal", "chapter:h-vw"],
  ["SAP", "company:SAP"],
  ["crash sell everything hold keep paying in", "life-event:crash"],
  // German and Russian learner wording (the alias safety net)
  ["Was ist ein Sparplan und Zinseszins?", "concept:compound"],
  ["Warum Streuung statt einer Aktie?", "concept:diversification"],
  ["Что такое ETF?", "concept:etf"],
  ["Зачем нужна диверсификация портфеля?", "concept:diversification"],
  ["Что такое лимитный ордер?", "concept:limit-order"],
];

let passed = 0;
for (const [query, expected] of CASES) {
  assert.ok(getChunk(expected), `index has no chunk ${expected} (rebuild with npm run index:assistant?)`);
  const top = search(query, { limit: 3 }).map((h) => h.chunk.id);
  assert.ok(top.includes(expected), `"${query}" → expected ${expected} in top 3, got ${top.join(", ") || "nothing"}`);
  passed++;
}

// Spoilers: a quiz answer or a replay's reveal only shows once the learner has earned it.
const wirecard = getChunk("replay:wirecard")!;
assert.ok(!wirecard.text.includes("Wirecard"), "replay text must not name the hidden company");
assert.ok(!renderChunk(wirecard, {}).includes("Wirecard"), "reveal hidden for a new learner");
assert.ok(renderChunk(wirecard, { done: ["h-wirecard"] }).includes("Wirecard"), "reveal shown after the story is done");
const etf = getChunk("concept:etf")!;
assert.ok(!renderChunk(etf, {}).includes("Quiz answer"), "quiz answer hidden before the card is collected");
assert.ok(renderChunk(etf, { cards: ["etf"] }).includes("Quiz answer: Barely moves"), "quiz answer shown after collecting the card");
for (const c of allChunks().filter((c) => c.type === "chapter" && c.href === "/history")) {
  assert.ok(!/The reveal:/.test(c.text), `${c.id}: the reveal step belongs behind the spoiler gate`);
}

// Citations: unknown or unretrieved ids are dropped, duplicates collapse.
const sources = citedSources("ETFs spread risk [concept:etf]. Also [concept:etf] and [concept:made-up] and [card:fees].", new Set(["concept:etf", "concept:made-up"]));
assert.deepEqual(sources.map((s) => s.id), ["concept:etf"]);

console.log(`assistant.check: ${passed}/${CASES.length} retrieval cases, spoiler and citation checks passed (${allChunks().length} chunks)`);
