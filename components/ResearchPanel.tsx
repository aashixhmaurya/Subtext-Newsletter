"use client";

import { useState } from "react";
import { blockedUrl } from "@/lib/safety";
import type { Angle, Brief, Citation, Desk, Source } from "@/lib/types";
import { Button, Spinner } from "./ui";

type Update = (fn: (d: Desk) => Desk) => void;

export async function extractSource(input: { url?: string; text?: string; title?: string }): Promise<Partial<Source>> {
  try {
    const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (res.status === 504) return { status: "failed", error: "The site took too long to respond. Try again in a moment, or paste the text." };
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { status: "failed", error: "Couldn't reach Subtext's reader. Check your connection and retry." };
  }
}

export async function readJSON(res: Response) {
  try {
    return await res.json();
  } catch {
    if (res.status === 504) return { error: "This took too long. Try again, or use fewer sources." };
    return { error: `Something went wrong on the server (${res.status}). Try again.` };
  }
}

const linkKey = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[/#]+$/, "");

export const newSource = (patch: Partial<Source>): Source => ({
  id: Math.random().toString(36).slice(2, 10),
  url: "",
  title: patch.url || "Untitled",
  site: "",
  kind: "article",
  text: "",
  status: "loading",
  addedAt: Date.now(),
  ...patch,
});

const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;

export default function ResearchPanel({ desk, update, onUseAngle, compact }: { desk: Desk; update: Update; onUseAngle: (a: Angle) => void; compact?: boolean }) {
  const [links, setLinks] = useState("");
  const [pasting, setPasting] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");

  const patchSource = (id: string, patch: Partial<Source>) =>
    update((d) => ({ ...d, sources: d.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const read = async (source: Source, input: { url?: string; text?: string; title?: string }) => {
    patchSource(source.id, { status: "loading", error: undefined });
    const result = await extractSource(input);
    patchSource(source.id, { ...result, id: source.id, url: result.url || source.url });
  };

  const addLinks = () => {
    const candidates = links
      .split(/\s+/)
      .map((l) => l.trim().replace(/^[<("']+|[>)"',.;]+$/g, ""))
      .filter((l) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+/i.test(l))
      .map((l) => (/^https?:\/\//i.test(l) ? l : `https://${l}`));
    const seen = new Set(desk.sources.filter((s) => s.url).map((s) => linkKey(s.url)));
    const fresh: Source[] = [];
    let blocked = 0;
    for (const url of candidates) {
      if (blockedUrl(url)) {
        blocked++;
        continue;
      }
      if (seen.has(linkKey(url))) continue;
      seen.add(linkKey(url));
      fresh.push(newSource({ url, title: url.replace(/^https?:\/\/(www\.)?/i, "") }));
    }
    if (!candidates.length) {
      setError("Those don't look like links. Paste full web addresses, one per line, or use Paste text instead.");
      return;
    }
    setError(
      blocked
        ? `${blocked === 1 ? "One link was" : `${blocked} links were`} skipped. Adult, gambling, and piracy sites aren't supported.`
        : fresh.length
          ? ""
          : "Those links are already in this space.",
    );
    update((d) => ({ ...d, sources: [...d.sources, ...fresh] }));
    fresh.forEach((s) => read(s, { url: s.url }));
    setLinks("");
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const s = newSource({ title: noteTitle || "Pasted note", kind: "note" });
    update((d) => ({ ...d, sources: [...d.sources, s] }));
    read(s, { text: noteText, title: noteTitle });
    setNoteText("");
    setNoteTitle("");
    setPasting(false);
  };

  const usable = desk.sources.filter((s) => s.text.trim() && s.status !== "loading");
  const loading = desk.sources.some((s) => s.status === "loading");

  const buildBrief = async () => {
    setBuilding(true);
    setError("");
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: usable.map(({ title, site, url, text }) => ({ title, site, url, text })) }),
      });
      const data = await readJSON(res);
      if (!res.ok || data.error) throw new Error(data.error);
      update((d) => ({ ...d, brief: data, briefSources: usable.map((s) => s.id) }));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The brief couldn't be generated.");
    } finally {
      setBuilding(false);
    }
  };

  const briefSources = (desk.briefSources ?? []).map((id) => desk.sources.find((s) => s.id === id)).filter(Boolean) as Source[];
  const cited = briefSources.length ? briefSources : usable;

  return (
    <div className={compact ? "space-y-10" : "space-y-14"}>
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Sources</h2>
          <span className="text-[12px] text-faint">{desk.sources.length} saved</span>
        </div>

        <div className="rounded-lg border border-line bg-sheet">
          {pasting ? (
            <div className="space-y-2 p-4">
              <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Title (optional)" className="w-full bg-transparent text-[15px] placeholder:text-faint" />
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={5} placeholder="Paste the article, thread, or notes" className="w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-faint" />
            </div>
          ) : (
            <textarea
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && addLinks()}
              rows={compact ? 2 : 3}
              placeholder="Paste links to articles, posts on X, or announcements. One per line."
              className="block w-full resize-none bg-transparent p-4 text-[14px] leading-relaxed placeholder:text-faint"
            />
          )}
          <div className="flex items-center justify-between border-t border-line bg-mist/40 px-4 py-2.5">
            <button onClick={() => setPasting(!pasting)} className="rounded-md px-2 py-1 text-[13px] text-soft hover:bg-sheet hover:text-ink">
              {pasting ? "Add links instead" : "Paste text instead"}
            </button>
            <Button variant="primary" onClick={pasting ? addNote : addLinks} disabled={pasting ? !noteText.trim() : !links.trim()}>
              Add to sources
            </Button>
          </div>
        </div>

        {desk.sources.length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-sheet">
            {desk.sources.map((s, i) => (
              <SourceRow
                key={s.id}
                source={s}
                n={cited.indexOf(s) + 1 || null}
                fallbackN={i + 1}
                onRemove={() => update((d) => ({ ...d, sources: d.sources.filter((x) => x.id !== s.id) }))}
                onRetry={() => read(s, { url: s.url })}
                onPaste={(text) => read(s, { url: s.url, text, title: s.title })}
              />
            ))}
          </ul>
        )}

        <div className="mt-5 flex items-center gap-4">
          <Button variant="primary" onClick={buildBrief} disabled={building || loading || !usable.length}>
            {building && <Spinner />}
            {building ? `Reading ${usable.length} sources` : desk.brief ? "Rebuild brief" : "Build research brief"}
          </Button>
          <span className="text-[13px] text-faint">
            {loading ? "Still reading some sources…" : usable.length < 3 ? "Three or more sources make a better brief." : `${usable.length} sources ready.`}
          </span>
        </div>
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
      </section>

      {desk.brief && <BriefView brief={desk.brief} sources={cited} onUseAngle={onUseAngle} compact={compact} />}
    </div>
  );
}

function SourceRow({ source: s, n, fallbackN, onRemove, onRetry, onPaste }: { source: Source; n: number | null; fallbackN: number; onRemove: () => void; onRetry: () => void; onPaste: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const needsHelp = s.status === "failed" || s.status === "thin";
  const label = { loading: "Reading", ready: `${wordCount(s.text).toLocaleString()} words`, thin: "Partial", failed: "Couldn't read" }[s.status];

  return (
    <li className="group px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-6 shrink-0 text-[12px] tabular-nums text-faint">S{n ?? fallbackN}</span>
        <div className="min-w-0 flex-1">
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer" className="line-clamp-1 text-[15px] hover:text-link">{s.title}</a>
          ) : (
            <span className="line-clamp-1 text-[15px]">{s.title}</span>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-faint">
            <span>{s.site || "—"}</span>
            {s.kind !== "article" && <span>· {s.kind === "tweet" ? "Post" : "Note"}</span>}
            <span>·</span>
            <span className={s.status === "failed" ? "text-danger" : s.status === "thin" ? "text-warn" : ""}>
              {s.status === "loading" && <Spinner />} {label}
            </span>
          </div>
          {needsHelp && s.error && <p className="mt-1.5 text-[13px] text-soft">{s.error}</p>}
          {needsHelp && (
            <div className="mt-2">
              {open ? (
                <div className="rounded-md border border-line bg-canvas p-3">
                  <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Paste the article text here" className="w-full resize-none bg-transparent text-[14px] leading-relaxed placeholder:text-faint" />
                  <div className="flex justify-end gap-2">
                    <Button variant="quiet" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="plain" disabled={!text.trim()} onClick={() => { onPaste(text); setOpen(false); }}>Use this text</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 text-[13px]">
                  <button onClick={() => setOpen(true)} className="text-link hover:underline">Paste text</button>
                  {s.url && <button onClick={onRetry} className="text-soft hover:text-ink">Try again</button>}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={onRemove} className="text-[13px] text-faint transition-opacity hover:text-ink focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100" aria-label="Remove source">
          Remove
        </button>
      </div>
    </li>
  );
}

function BriefView({ brief, sources, onUseAngle, compact }: { brief: Brief; sources: Source[]; onUseAngle: (a: Angle) => void; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(briefMarkdown(brief, sources));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const unverified = brief.facts.reduce((n, f) => n + f.citations.filter((c) => !c.verified).length, 0);

  return (
    <article className="fade-in space-y-12">
      <header className="flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Research brief</h2>
        <div className="flex items-center gap-4 text-[13px] text-faint">
          <span>{new Date(brief.generatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          <button onClick={copy} className="text-soft hover:text-ink">{copied ? "Copied" : "Copy as Markdown"}</button>
        </div>
      </header>

      <Section label="What happened">
        <p className={`font-serif ${compact ? "text-[19px]" : "text-[22px]"} leading-[1.5] tracking-[-0.005em]`}>{brief.whatHappened}</p>
        <ul className="mt-6 space-y-3">
          {brief.perSource.map((p) => (
            <li key={p.source} className="flex gap-3 text-[15px] leading-relaxed text-soft">
              <SourceLink n={p.source} sources={sources} />
              <span>{p.takeaway}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Why it matters">
        <p className="text-[17px] leading-relaxed">{brief.whyItMatters}</p>
        <div className={`mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line ${compact ? "" : "sm:grid-cols-3"}`}>
          {(["founders", "builders", "operators"] as const).map((k) => (
            <div key={k} className="bg-sheet p-4">
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">For {k}</div>
              <p className="text-[14px] leading-relaxed text-soft">{brief.audiences[k]}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section label="What the sources support" note={unverified ? `${unverified} quote${unverified > 1 ? "s" : ""} couldn't be matched to source text` : "Every quote matched to source text"}>
        <ul className="space-y-4">
          {brief.facts.map((f, i) => <Claim key={i} text={f.text} citations={f.citations} sources={sources} />)}
          {!brief.facts.length && <p className="text-[14px] text-faint">No claims could be tied to a verbatim quote. Treat everything below as unconfirmed.</p>}
        </ul>
      </Section>

      <Section label="Treat with care" note="Vendor claims, analysis and speculation">
        <ul className="space-y-4">
          {brief.speculation.map((s, i) => (
            <Claim key={i} text={s.text} citations={s.citations} sources={sources} tag={s.unverified ? "unsupported" : s.kind} />
          ))}
        </ul>
      </Section>

      <Section label="Angles worth a story">
        <div className="space-y-3">
          {brief.angles.map((a, i) => (
            <div key={i} className="rounded-lg border border-line bg-sheet p-5">
              <h3 className="font-serif text-[21px] leading-snug tracking-[-0.01em]">{a.headline}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-soft">{a.thesis}</p>
              <p className="mt-3 text-[14px] leading-relaxed"><span className="text-faint">Reader takeaway · </span>{a.readerTakeaway}</p>
              <div className="mt-4">
                <Button variant="plain" onClick={() => onUseAngle(a)}>Start a draft from this angle</Button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {brief.openQuestions.length > 0 && (
        <Section label="Check before publishing">
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-soft marker:text-faint">
            {brief.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{label}</h3>
        {note && <span className="text-right text-[12px] text-faint">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Claim({ text, citations, sources, tag }: { text: string; citations: Citation[]; sources: Source[]; tag?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="text-[15px] leading-relaxed">
      <p>
        {tag && <span className={`mr-2 inline-block rounded px-1.5 py-0.5 align-[1px] text-[10px] font-semibold uppercase tracking-[0.06em] ${tag === "unsupported" ? "bg-danger-soft text-danger" : "bg-mist text-soft"}`}>{tag}</span>}
        {text}
        {citations.map((c, i) => (
          <button key={i} onClick={() => setOpen(!open)} title={c.verified ? "Show the supporting quote" : "Quote not found verbatim in the source"} className={`ml-1.5 text-[12px] tabular-nums ${c.verified ? "text-link" : "text-warn"} hover:underline`}>
            [S{c.source}]
          </button>
        ))}
      </p>
      {open && (
        <div className="fade-in mt-2 space-y-2 border-l-2 border-line pl-4">
          {citations.map((c, i) => {
            const s = sources[c.source - 1];
            return (
              <figure key={i} className="text-[14px]">
                <blockquote className="font-serif italic text-soft">“{c.quote}”</blockquote>
                <figcaption className="mt-1 text-[12px] text-faint">
                  {c.verified ? "Found in" : "Not found verbatim in"}{" "}
                  {s?.url ? <a href={s.url} target="_blank" rel="noreferrer" className="text-link hover:underline">{s.site || s.title}</a> : s?.title ?? `source ${c.source}`}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </li>
  );
}

function SourceLink({ n, sources }: { n: number; sources: Source[] }) {
  const s = sources[n - 1];
  const cls = "shrink-0 text-[12px] leading-[24px] tabular-nums";
  return s?.url ? (
    <a href={s.url} target="_blank" rel="noreferrer" title={s.title} className={`${cls} text-link hover:underline`}>S{n}</a>
  ) : (
    <span title={s?.title} className={`${cls} text-faint`}>S{n}</span>
  );
}

export function briefMarkdown(b: Brief, sources: Source[]) {
  const ref = (cs: Citation[]) => cs.map((c) => `[S${c.source}]`).join("");
  return [
    "## What happened",
    b.whatHappened,
    ...b.perSource.map((p) => `- [S${p.source}] ${p.takeaway}`),
    "",
    "## Why it matters",
    b.whyItMatters,
    `- **Founders:** ${b.audiences.founders}`,
    `- **Builders:** ${b.audiences.builders}`,
    `- **Operators:** ${b.audiences.operators}`,
    "",
    "## What the sources support",
    ...b.facts.map((f) => `- ${f.text} ${ref(f.citations)}`),
    "",
    "## Treat with care",
    ...b.speculation.map((s) => `- *${s.unverified ? "unsupported" : s.kind}:* ${s.text} ${ref(s.citations)}`),
    "",
    "## Angles",
    ...b.angles.map((a) => `- **${a.headline}** — ${a.thesis} _Takeaway: ${a.readerTakeaway}_`),
    "",
    "## Sources",
    ...sources.map((s, i) => `- [S${i + 1}] ${s.title}${s.url ? ` — ${s.url}` : ""}`),
  ].join("\n");
}
