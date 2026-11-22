// Shared shapes for the assistant. No runtime imports: safe on the server, the client and in node scripts.

export type ChunkType = "concept" | "card" | "module" | "chapter" | "replay" | "lesson" | "company" | "persona" | "life-event";

export type Chunk = {
  id: string; // "concept:etf", stable across rebuilds
  type: ChunkType;
  title: string;
  href: string; // where it lives in the app
  text: string; // what retrieval indexes and the agent may quote
  world?: number;
  /** Quiz answers and replay reveals. Shown only when the learner's progress unlocks them. */
  spoiler?: { text: string; unlockCard?: string; unlockDone?: string };
};

export type KnowledgeIndex = {
  version: 1;
  builtAt: string;
  chunks: Chunk[];
};

/** What the browser sends about the learner (layer 7). Never trusted for anything but personalisation. */
export type LearnerContext = {
  path?: string;
  lang?: "en" | "de";
  persona?: string | null;
  cards?: string[];
  done?: string[];
  xp?: number;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type Source = { id: string; title: string; href: string; type: ChunkType };

/** NDJSON events the chat route streams to the panel. */
export type ChatEvent =
  | { type: "status"; text: string }
  | { type: "text"; delta: string }
  | { type: "sources"; items: Source[] }
  | { type: "error"; code: "not_configured" | "bad_request" | "rate_limited" | "upstream" | "refused"; message: string }
  | { type: "done" };
