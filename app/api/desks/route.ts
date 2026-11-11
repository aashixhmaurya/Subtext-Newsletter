import { NextResponse } from "next/server";
import { db, storageError, validWorkspace } from "@/lib/store";
import type { Desk } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 2_000_000;

export async function GET(req: Request) {
  const supabase = db();
  if (!supabase) return NextResponse.json({ enabled: false, desks: [] });
  const workspace = new URL(req.url).searchParams.get("workspace");
  if (!validWorkspace(workspace)) return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });

  const { data, error } = await supabase.from("desks").select("data").eq("workspace_id", workspace).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ enabled: true, error: storageError(error) }, { status: 502 });
  return NextResponse.json({ enabled: true, desks: (data ?? []).map((r) => r.data as Desk) });
}

export async function PUT(req: Request) {
  const supabase = db();
  if (!supabase) return NextResponse.json({ enabled: false });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "This space is too large to sync." }, { status: 413 });

  let body: { workspace?: unknown; desk?: Desk };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const { workspace, desk } = body;
  if (!validWorkspace(workspace) || !desk?.id || typeof desk.id !== "string") return NextResponse.json({ error: "Invalid workspace or space." }, { status: 400 });

  const { error } = await supabase
    .from("desks")
    .upsert({ workspace_id: workspace, id: desk.id, data: desk, updated_at: new Date(desk.updatedAt || Date.now()).toISOString() });
  if (error) return NextResponse.json({ error: storageError(error) }, { status: 502 });
  return NextResponse.json({ enabled: true, ok: true });
}

export async function DELETE(req: Request) {
  const supabase = db();
  if (!supabase) return NextResponse.json({ enabled: false });
  const params = new URL(req.url).searchParams;
  const workspace = params.get("workspace");
  const id = params.get("id");
  if (!validWorkspace(workspace) || !id) return NextResponse.json({ error: "Invalid workspace or space." }, { status: 400 });

  const { error } = await supabase.from("desks").delete().eq("workspace_id", workspace).eq("id", id);
  if (error) return NextResponse.json({ error: storageError(error) }, { status: 502 });
  return NextResponse.json({ enabled: true, ok: true });
}
