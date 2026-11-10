import { NextResponse } from "next/server";
import { db, storageError, validWorkspace } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = db();
  if (!supabase) return NextResponse.json({ enabled: false });
  const body = await req.json().catch(() => null);
  if (!validWorkspace(body?.workspace) || typeof body?.url !== "string" || !/^https?:\/\//i.test(body.url)) {
    return NextResponse.json({ error: "Invalid clip." }, { status: 400 });
  }

  const { error } = await supabase.from("clips").insert({
    workspace_id: body.workspace,
    url: body.url.slice(0, 2000),
    title: String(body.title ?? "").slice(0, 200),
    text: String(body.text ?? "").slice(0, 24000),
  });
  if (error) return NextResponse.json({ enabled: true, error: storageError(error) }, { status: 502 });
  return NextResponse.json({ enabled: true, ok: true });
}

export async function GET(req: Request) {
  const supabase = db();
  if (!supabase) return NextResponse.json({ enabled: false, clips: [] });
  const workspace = new URL(req.url).searchParams.get("workspace");
  if (!validWorkspace(workspace)) return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });

  const { data, error } = await supabase.from("clips").select("id, url, title, text").eq("workspace_id", workspace).order("created_at").limit(50);
  if (error) return NextResponse.json({ enabled: true, error: storageError(error) }, { status: 502 });
  if (data?.length) await supabase.from("clips").delete().in("id", data.map((c) => c.id));
  return NextResponse.json({ enabled: true, clips: data ?? [] });
}
