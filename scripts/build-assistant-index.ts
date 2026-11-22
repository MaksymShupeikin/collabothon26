// Rebuilds the assistant's knowledge index from the app's own content.
// Run after changing lessons, cards, chapters, replays or companies:  npm run index:assistant
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildCorpus } from "../src/features/assistant/corpus.ts";
import type { KnowledgeIndex } from "../src/features/assistant/types.ts";

const out = fileURLToPath(new URL("../src/features/assistant/knowledge-index.json", import.meta.url));
const chunks = buildCorpus();
const index: KnowledgeIndex = { version: 1, builtAt: new Date().toISOString().slice(0, 10), chunks };
writeFileSync(out, JSON.stringify(index, null, 1) + "\n");

const byType = chunks.reduce<Record<string, number>>((m, c) => ({ ...m, [c.type]: (m[c.type] ?? 0) + 1 }), {});
console.log(`assistant index: ${chunks.length} chunks →`, byType);
