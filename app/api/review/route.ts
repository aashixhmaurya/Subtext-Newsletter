import { NextResponse } from "next/server";
import { askJSON, EditorialError } from "@/lib/gemini";
import { hashId } from "@/lib/writing";
import type { IssueKind, Suggestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS: IssueKind[] = ["clarity", "jargon", "repetition", "accuracy", "passive", "filler", "long"];

const schema = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: KINDS },
          passage: { type: "string", description: "Exact, verbatim text from the draft: a full sentence or a short run of sentences" },
          why: { type: "string", description: "One or two sentences on what the reader loses and why the change helps" },
          rewrite: { type: "string", description: "Replacement for the passage. Empty string if no rewrite should be offered." },
        },
        required: ["kind", "passage", "why", "rewrite"],
      },
    },
  },
  required: ["issues"],
};

const system = `You are a senior editor at "This Week in AI", a newsletter for founders, builders and operators.
You review drafts the way a good human editor does: few notes, each one worth acting on.

What to look for, in priority order:
1. accuracy: a sentence that overstates, misstates, or drops an important caveat compared with the provided sources. Quote what the source actually supports in "why".
2. clarity: buried leads, sentences that carry two or three ideas, vague claims ("this matters a lot") that should show why, headlines that state the generic trend instead of the actual story.
3. jargon: technical terms a smart non-specialist operator would not know, used without explanation. Do not delete the term; add a few words of context. Leave terms like "API" or "token" alone unless the point depends on them.
4. repetition: repeated words or ideas, hedges and intensifiers ("basically", "really") that soften a precise point.

Rules for rewrites:
- Preserve the author's meaning, voice, numbers, names, and citation markers like [2]. Never invent facts.
- Do not flatten technical nuance to shorten a sentence. Longer is fine if it is clearer.
- If a passage is a matter of taste, leave it alone.
- passage must be copied exactly from the draft so it can be found and replaced.
- Give 4 to 10 notes. Skip simple passive voice and filler unless it genuinely hurts the sentence; a rules engine already flags those.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const draft = typeof body?.draft === "string" ? body.draft : "";
  if (draft.trim().split(/\s+/).length < 30) return NextResponse.json({ error: "The draft is too short to review. Write at least a paragraph." }, { status: 400 });

  const sources: { n: number; title: string; text: string }[] = Array.isArray(body?.sources) ? body.sources : [];
  const evidence = sources.length
    ? `\n\nSOURCES the draft is based on (use these to check accuracy):\n\n${sources.map((s) => `[${s.n}] ${s.title}\n${String(s.text).slice(0, 5000)}`).join("\n\n---\n\n")}`
    : "\n\n(No sources were provided, so skip accuracy checks.)";

  try {
    const raw = await askJSON<{ issues: { kind: IssueKind; passage: string; why: string; rewrite: string }[] }>({
      system,
      schema,
      prompt: `DRAFT:\n\n${draft}${evidence}`,
      temperature: 0.4,
    });
    const notes: Suggestion[] = [];
    for (const issue of raw.issues ?? []) {
      const passage = locate(draft, issue.passage);
      if (!passage || !KINDS.includes(issue.kind)) continue;
      let why = issue.why.trim();
      let rewrite: string | undefined = issue.rewrite?.trim() || undefined;
      if (rewrite) {
        const lost = [...tokens(passage, /\$?\d[\d,.]*%?/g), ...tokens(passage, /\[\d+\]/g)].filter((t) => !rewrite!.includes(t));
        if (lost.length) why += ` Check before accepting: the rewrite drops ${lost.join(", ")}.`;
        if (rewrite === passage) rewrite = undefined;
      }
      notes.push({ id: hashId("editor", issue.kind, passage), kind: issue.kind, passage, why, rewrite, origin: "editor" });
    }
    return NextResponse.json({ notes });
  } catch (err) {
    const e = err instanceof EditorialError ? err : new EditorialError("The editorial check failed. Try again.");
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}

function locate(draft: string, passage: string) {
  const p = passage?.trim();
  if (!p) return null;
  if (draft.includes(p)) return p;
  const pattern = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+").replace(/['’]/g, "['’]").replace(/["“”]/g, '["“”]');
  const m = draft.match(new RegExp(pattern));
  return m ? m[0] : null;
}

const tokens = (s: string, re: RegExp) => [...new Set(s.match(re) ?? [])].map((t) => t.replace(/[.,]$/, ""));
