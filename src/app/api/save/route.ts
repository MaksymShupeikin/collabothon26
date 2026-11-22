import { cookies } from "next/headers";
import postgres from "postgres";

// shortcut: anonymous player id in a cookie, so progress follows the browser, not a person; key it on the comdirect login once one exists.
const COOKIE = "cd-edu-id";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 1_000_000;

let sql: postgres.Sql | undefined;
let ready: Promise<void> | undefined;
const db = async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  sql ??= postgres(process.env.DATABASE_URL, { max: 5 });
  ready ??= sql`create table if not exists saves (id uuid primary key, data jsonb not null, updated_at timestamptz not null default now())`
    .then(() => {}, (e) => { ready = undefined; throw e; });
  await ready;
  return sql;
};

async function playerId() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id && UUID.test(id)) return id;
  const fresh = crypto.randomUUID();
  jar.set(COOKIE, fresh, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 400, path: "/" });
  return fresh;
}

const fail = (e: unknown) => { console.error("save api:", e); return Response.json({ error: "storage unavailable" }, { status: 503 }); };

export async function GET() {
  try {
    const id = await playerId();
    const q = await db();
    const [row] = await q`select data from saves where id = ${id}`;
    return Response.json({ save: row?.data ?? null });
  } catch (e) { return fail(e); }
}

export async function PUT(req: Request) {
  const body = await req.text();
  if (body.length > MAX_BYTES) return Response.json({ error: "too large" }, { status: 413 });
  let save: unknown;
  try { save = JSON.parse(body); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  if (typeof save !== "object" || save === null || (save as { v?: unknown }).v !== 3) return Response.json({ error: "bad save" }, { status: 400 });
  try {
    const id = await playerId();
    const q = await db();
    await q`insert into saves (id, data) values (${id}, ${q.json(save as postgres.JSONValue)})
            on conflict (id) do update set data = excluded.data, updated_at = now()`;
    return new Response(null, { status: 204 });
  } catch (e) { return fail(e); }
}
