import { NextResponse } from "next/server";
import { askJSON, EditorialError, normalise } from "@/lib/gemini";
import type { Brief, Citation } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InSource {
  title: string;
  site: string;
  url: string;
  text: string;
}

const PER_SOURCE = 14000;

const citations = {
  type: "array",
  items: {
    type: "object",
    properties: {
      source: { type: "integer", description: "Source number, e.g. 2 for [S2]" },
      quote: { type: "string", description: "A short verbatim excerpt (8-30 words) copied exactly from that source" },
    },
    required: ["source", "quote"],
  },
};

const schema = {
  type: "object",
  properties: {
    whatHappened: { type: "string" },
    perSource: { type: "array", items: { type: "object", properties: { source: { type: "integer" }, takeaway: { type: "string" } }, required: ["source", "takeaway"] } },
    whyItMatters: { type: "string" },
    audiences: {
      type: "object",
      properties: { founders: { type: "string" }, builders: { type: "string" }, operators: { type: "string" } },
      required: ["founders", "builders", "operators"],
    },
    facts: { type: "array", items: { type: "object", properties: { text: { type: "string" }, citations }, required: ["text", "citations"] } },
    speculation: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, kind: { type: "string", enum: ["analysis", "speculation", "vendor claim"] }, citations },
        required: ["text", "kind", "citations"],
      },
    },
    angles: {
      type: "array",
      items: { type: "object", properties: { headline: { type: "string" }, thesis: { type: "string" }, readerTakeaway: { type: "string" } }, required: ["headline", "thesis", "readerTakeaway"] },
    },
    openQuestions: { type: "array", items: { type: "string" } },
  },
  required: ["whatHappened", "perSource", "whyItMatters", "audiences", "facts", "speculation", "angles", "openQuestions"],
};

const system = `You are the research desk for "This Week in AI", a newsletter for founders, builders and business operators.
Your job is not to summarise. It is to help an editor find the story worth telling, and to be strict about evidence.

Rules:
- Use only the numbered sources provided. Never add facts from memory. If sources disagree, say so.
- "facts" are things a source states as verifiable: numbers, prices, dates, releases, quotes. Each needs at least one citation.
- A claim made by a company about its own product (benchmarks it ran, "best", "fastest") is a "vendor claim", not a fact.
- Your own inferences go in "speculation" with kind "analysis" (reasoned from the evidence) or "speculation" (forward-looking or uncertain).
- Every citation quote must be copied character for character from the cited source. Keep it short. Do not paraphrase inside a quote.
- Write plainly. No hype words (revolutionary, game-changing, unlock). Explain technical terms in a few words the first time.
- whatHappened: 2-4 sentences across all sources. perSource: one sentence per source.
- audiences: one or two concrete sentences each on what this changes for that reader.
- angles: 2-3 newsletter angles. Prefer tension, a non-obvious connection between sources, or a practical decision the reader faces. A good headline is specific, not clickbait.
- openQuestions: what the editor should verify or chase before publishing.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sources: InSource[] = Array.isArray(body?.sources) ? body.sources.filter((s: InSource) => s?.text?.trim()) : [];
  if (!sources.length) return NextResponse.json({ error: "None of the sources have readable text yet." }, { status: 400 });

  const prompt = sources
    .map((s, i) => `[S${i + 1}] ${s.title}\nPublisher: ${s.site}\nURL: ${s.url || "pasted by editor"}\n\n${s.text.slice(0, PER_SOURCE)}`)
    .join("\n\n---\n\n");

  try {
    const raw = await askJSON<Omit<Brief, "generatedAt">>({
      system,
      schema,
      prompt: `Build a research brief from these ${sources.length} sources.\n\n${prompt}`,
    });
    return NextResponse.json(ground(raw, sources));
  } catch (err) {
    const e = err instanceof EditorialError ? err : new EditorialError("Something went wrong while writing the brief.");
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}

function ground(raw: Omit<Brief, "generatedAt">, sources: InSource[]): Brief {
  const haystacks = sources.map((s) => normalise(s.text));
  const check = (list: { source: number; quote: string }[] = []): Citation[] =>
    list
      .filter((c) => Number.isInteger(c.source) && c.source >= 1 && c.source <= sources.length)
      .map((c) => ({ source: c.source, quote: c.quote.trim(), verified: contains(haystacks[c.source - 1], c.quote) }));

  const facts = (raw.facts ?? []).map((f) => ({ text: f.text, citations: check(f.citations) }));
  const grounded = facts.filter((f) => f.citations.some((c) => c.verified));
  const ungrounded = facts.filter((f) => !f.citations.some((c) => c.verified));

  return {
    whatHappened: raw.whatHappened ?? "",
    perSource: (raw.perSource ?? []).filter((p) => p.source >= 1 && p.source <= sources.length),
    whyItMatters: raw.whyItMatters ?? "",
    audiences: raw.audiences ?? { founders: "", builders: "", operators: "" },
    facts: grounded,
    speculation: [
      ...(raw.speculation ?? []).map((s) => ({ ...s, citations: check(s.citations) })),
      ...ungrounded.map((f) => ({ text: f.text, kind: "analysis" as const, citations: f.citations, unverified: true })),
    ],
    angles: (raw.angles ?? []).slice(0, 3),
    openQuestions: raw.openQuestions ?? [],
    generatedAt: Date.now(),
  };
}

function contains(haystack: string, quote: string) {
  const q = normalise(quote).replace(/^["'.…\s]+|["'.…\s]+$/g, "");
  if (q.length < 12) return false;
  if (haystack.includes(q)) return true;
  const parts = q.split(/\s*(?:\.\.\.|…)\s*/).filter((p) => p.length >= 12);
  return parts.length > 1 && parts.every((p) => haystack.includes(p));
}
