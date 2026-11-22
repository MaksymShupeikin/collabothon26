import { cookies } from "next/headers";
import { normalizeSave } from "@/features/game/save";
import { isValidPlayerId, loadSave, storageKind, writeSave } from "@/features/mcp/storage";

// shortcut: anonymous player id in a cookie, so progress follows the browser, not a person; key it on the comdirect login once one exists.
const COOKIE = "cd-edu-id";
const MAX_BYTES = 1_000_000;

async function playerId() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (isValidPlayerId(id)) return id;
  const fresh = crypto.randomUUID();
  jar.set(COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 400,
    path: "/",
  });
  return fresh;
}

const fail = (e: unknown) => {
  console.error("save api:", e);
  return Response.json({ error: "storage unavailable" }, { status: 503 });
};

export async function GET() {
  try {
    const id = await playerId();
    const save = await loadSave(id);
    return Response.json({ save, playerId: id, storage: storageKind() });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: Request) {
  const body = await req.text();
  if (body.length > MAX_BYTES) return Response.json({ error: "too large" }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const save = normalizeSave(raw);
  if (!save) return Response.json({ error: "bad save" }, { status: 400 });
  try {
    const id = await playerId();
    await writeSave(id, save);
    return new Response(null, { status: 204 });
  } catch (e) {
    return fail(e);
  }
}
