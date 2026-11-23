// Layer 6 · knowledge base. Turns the app's own learning content into small, citable chunks.
// Runs only at index time (scripts/build-assistant-index.ts); the chat route reads the generated JSON.
import { CONCEPTS, WORLDS as CONCEPT_WORLDS } from "../learn/concepts.ts";
import { CARDS } from "../learn/cards.ts";
import { CHAPTERS, HISTORY, WORLDS as TOUR_WORLDS, type Chapter, type Step } from "../tour/chapters.ts";
import { REPLAYS, SIM_LESSONS } from "../market/scenarios.ts";
import { ALL_COMPANIES } from "../market/companies.ts";
import { PERSONAS } from "../game/personas.ts";
import { EVENTS } from "../invsim/events.ts";
import { newGame } from "../invsim/engine.ts";
import type { Chunk, ChunkType } from "./types.ts";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const lines = (...parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join("\n");
const quizText = (q: { q: string; options: string[] }) => `Quiz: ${q.q} Options: ${q.options.join(" / ")}`;

/** Text built from a function needs game state; call it with an empty stub and keep the result only if it works. */
function tryText(fn: unknown, stub: unknown): string {
  if (typeof fn === "string") return fn.trim();
  if (typeof fn !== "function") return "";
  try {
    const out = (fn as (a: unknown) => unknown)(stub);
    return typeof out === "string" ? out.trim() : "";
  } catch {
    return "";
  }
}

function chunk(type: ChunkType, id: string, title: string, href: string, text: string, extra: Partial<Chunk> = {}): Chunk {
  return { id: `${type}:${id}`, type, title, href, text: text.replace(/\s+\n/g, "\n").trim(), ...extra };
}

function concepts(): Chunk[] {
  const worldTitle = (n: number) => CONCEPT_WORLDS.find((w) => w.n === n)?.title ?? `World ${n}`;
  return CONCEPTS.map((c) =>
    chunk("concept", c.id, c.title, "/", lines(
      `${c.title} (learning world ${c.world}: ${worldTitle(c.world)})`,
      c.sentence,
      `Example: ${c.example}`,
      `Mini game: ${c.game}`,
      quizText(c.quiz),
    ), {
      world: c.world,
      spoiler: { text: `Quiz answer: ${c.quiz.options[c.quiz.answer]}`, unlockCard: c.id },
    }),
  );
}

function cards(): Chunk[] {
  return CARDS.map((c) =>
    chunk("card", c.id, c.title, "/", lines(
      `${c.title} (concept card, world ${c.world})`,
      c.front,
      `Example: ${c.example}`,
      quizText(c.quiz),
    ), {
      world: c.world,
      spoiler: { text: `Quiz answer: ${c.quiz.options[c.quiz.answer]}`, unlockCard: c.id },
    }),
  );
}

function stepText(s: Step): { text: string; answers: string[] } {
  const text = lines(
    str(s.title),
    tryText(s.text, null),
    tryText(s.task, null) && `Task: ${tryText(s.task, null)}`,
    s.quiz && quizText(s.quiz),
  );
  const answers = s.quiz ? [`${s.quiz.q} → ${s.quiz.options[s.quiz.answer]}. ${s.quiz.why}`] : [];
  return { text, answers };
}

function chapterChunk(ch: Chapter, history: boolean): Chunk {
  const steps = (ch.steps ?? []).map(stepText);
  const body = steps.map((s) => s.text).filter(Boolean).join("\n");
  const answers = steps.flatMap((s) => s.answers);
  const kind = history ? "History mode story" : ch.kind === "boss" ? "boss round" : ch.kind === "mission" ? "mission" : "chapter";
  const worldTitle = TOUR_WORLDS.find((w) => w.n === ch.world)?.title;
  // History stories end with the reveal (company and date). Keep that last step behind the spoiler gate.
  const lastIsReveal = history && /reveal/i.test(ch.steps?.at(-1)?.title ?? "");
  const publicBody = lastIsReveal ? steps.slice(0, -1).map((s) => s.text).join("\n") : body;
  const revealText = lastIsReveal ? steps.at(-1)!.text : "";
  return chunk("chapter", ch.id, `${history ? "Story" : `Module ${ch.n}`}: ${ch.title}`, history ? "/history" : "/", lines(
    `${ch.title}: ${kind}${worldTitle ? ` in module ${ch.world} (${worldTitle})` : ""}, on the ${ch.surface === "cabinet" ? "web cabinet" : "trading area / ProTrader"}.`,
    ch.blurb,
    ch.card?.length ? `Teaches concept cards: ${ch.card.join(", ")}` : "",
    publicBody,
  ), {
    world: ch.world,
    spoiler: answers.length || revealText ? { text: lines(revealText, ...answers.map((a) => `Answer: ${a}`)), unlockDone: ch.id } : undefined,
  });
}

function chapters(): Chunk[] {
  const worlds = TOUR_WORLDS.map((w) =>
    chunk("module", String(w.n), `Module ${w.n}: ${w.title}`, "/", lines(
      `Learning path module ${w.n}: ${w.title}. Played on: ${w.surface}.`,
      w.blurb,
      `Chapters: ${CHAPTERS.filter((c) => c.world === w.n).map((c) => `${c.n} ${c.title}`).join("; ")}`,
    ), { world: w.n }),
  );
  return [...worlds, ...CHAPTERS.map((c) => chapterChunk(c, false)), ...HISTORY.map((c) => chapterChunk(c, true))];
}

function replays(): Chunk[] {
  const historyChapter = (replayId: string) => HISTORY.find((h) => h.replay === replayId)?.id;
  return Object.values(REPLAYS).map((r) => {
    const headlines = r.universe.news.map((n) => `- ${n.headline}${n.explain ? ` (${n.kind}: ${n.explain})` : ""}`).join("\n");
    const bots = r.moves.map((m) => `- Bot ${m.bot} (${m.side}): "${m.say}"${m.spot ? ` → mistake: ${m.spot.options[m.spot.answer]}. ${m.spot.why}` : ""}`).join("\n");
    const unlock = historyChapter(r.id) ?? (r.boss ? undefined : undefined);
    return chunk("replay", r.id, r.sim ? `Simulated round: ${r.cover}` : `Historical replay: ${r.cover}`, r.sim ? "/" : "/history", lines(
      r.sim ? `A simulated boss round on the learning path about "${r.cover}".` : `A real historical market replay. The company is shown as "${r.cover}" until the reveal.`,
      `Concept: ${r.concept}. Rule to win: ${r.win}`,
      `Starting budget: ${r.budget} € play money.`,
      headlines && `Headlines:\n${headlines}`,
      bots && `Bot moves:\n${bots}`,
    ), {
      spoiler: r.sim ? undefined : { text: lines(r.reveal, r.after), unlockDone: unlock ?? `replay-${r.id}` },
    });
  });
}

function lessons(): Chunk[] {
  return Object.entries(SIM_LESSONS).map(([key, u]) =>
    chunk("lesson", key, `Simulated lesson: ${key}`, "/", lines(
      `A short simulated market lesson (${u.days} trading days, simulated newswire).`,
      ...u.news.filter((n) => n.major || n.explain).map((n) => `- ${n.headline} (${n.kind}: ${n.explain}; concept ${n.concept})`),
    )),
  );
}

function companies(): Chunk[] {
  return ALL_COMPANIES.map((c) =>
    chunk("company", c.sym, c.short, "/trade", lines(
      `${c.name} (${c.short}), ${c.type === "ETF" ? "ETF" : "stock"}, sector ${c.sector}.`,
      `WKN ${c.wkn}, ISIN ${c.isin}, ticker ${c.sym} in the sandbox.`,
      c.price ? `Sandbox start price about ${c.price} € (mock value, not live data); typical daily move about ${(c.vol * 100).toFixed(1)} %.` : "Used in historical replays only; prices there are mock values shaped like the real curve.",
    )),
  );
}

function personas(): Chunk[] {
  return Object.values(PERSONAS).map((p) =>
    chunk("persona", p.id, `Persona: ${p.label}`, "/start", lines(
      `${p.label}: ${p.who}. Goal: ${p.goal}. Horizon: ${p.horizon}.`,
      `Starts with ${p.start} € play money and a ${p.plan} €/month savings plan in module 4. Focus: ${p.focus}.`,
      `First mission: ${p.w1.text}`,
    )),
  );
}

function lifeEvents(): Chunk[] {
  const game = newGame(1, (g) => g); // a fresh life, so text that quotes numbers renders with start values
  return Object.values(EVENTS).map((e) => {
    const title = tryText(e.title, game) || e.id;
    const body = tryText(e.body, game);
    const choices = (e.choices ?? []).map((c) => `- ${c.label}: ${c.hint}${typeof c.note === "string" ? ` → ${c.note}` : ""}`).join("\n");
    return chunk("life-event", e.id, `Investor Simulator: ${title}`, "/invest", lines(
      `An event in the Investor Simulator (30 years of a life, one turn per year).`,
      title,
      body,
      e.concept && `Concept: ${e.concept}`,
      choices && `Choices:\n${choices}`,
    ));
  });
}

export function buildCorpus(): Chunk[] {
  const all = [...concepts(), ...cards(), ...chapters(), ...replays(), ...lessons(), ...companies(), ...personas(), ...lifeEvents()];
  const seen = new Set<string>();
  return all.filter((c) => c.text && !seen.has(c.id) && seen.add(c.id));
}
