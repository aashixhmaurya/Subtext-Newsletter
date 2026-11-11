"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Desk, IssueKind, Source, Suggestion } from "@/lib/types";
import { applySuggestion, diffWords, highlights, metrics, ruleCheck, type Metrics } from "@/lib/writing";
import { published } from "@/lib/sample";
import { readJSON } from "./ResearchPanel";
import { Button, Segmented, Spinner } from "./ui";

type Update = (fn: (d: Desk) => Desk) => void;

const KIND_LABEL: Record<IssueKind, string> = {
  accuracy: "Check against sources",
  clarity: "Clarity",
  jargon: "Unexplained term",
  repetition: "Repetition",
  long: "Long sentence",
  passive: "Passive voice",
  filler: "Filler or hype",
  dense: "Dense paragraph",
};

const KIND_DOT: Record<IssueKind, string> = {
  accuracy: "#d2453a",
  clarity: "#e3897b",
  jargon: "#5fae74",
  repetition: "#9aa5b1",
  long: "#e6c873",
  passive: "#7ea6e0",
  filler: "#a996e0",
  dense: "#e6c873",
};

export default function EditorPanel({ desk, update, sources, narrow }: { desk: Desk; update: Update; sources: Source[]; narrow?: boolean }) {
  const [view, setView] = useState<"write" | "compare">("write");
  const [filter, setFilter] = useState<"all" | "editor" | "rules">("all");
  const [active, setActive] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [marks, setMarks] = useState(true);
  const area = useRef<HTMLTextAreaElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);

  const draft = desk.draft;

  const { suggestions, also } = useMemo(() => {
    const dismissed = new Set(desk.dismissed);
    const notes = desk.editorNotes.filter((n) => draft.includes(n.passage) && !dismissed.has(n.id));
    const rules = ruleCheck(draft).filter((r) => !dismissed.has(r.id));
    const also = new Map<string, IssueKind[]>();
    const covered = new Set<string>();
    for (const r of rules) {
      const owner = notes.find((n) => n.passage.includes(r.passage.trim()));
      if (!owner) continue;
      covered.add(r.id);
      also.set(owner.id, [...new Set([...(also.get(owner.id) ?? []), r.kind])]);
    }
    const seen = new Set<string>();
    const list = [...notes, ...rules]
      .filter((s) => !seen.has(s.id) && seen.add(s.id))
      .map((s) => ({ s, at: draft.indexOf(s.passage) }))
      .sort((a, b) => a.at - b.at || (a.s.origin === "editor" ? -1 : 1))
      .map(({ s }) => ({ ...s, covered: covered.has(s.id) }));
    return { suggestions: list, also };
  }, [draft, desk.editorNotes, desk.dismissed]);

  const shown = suggestions.filter((s) => (filter === "all" ? !s.covered : filter === "editor" ? s.origin === "editor" : s.origin === "rules"));
  const marked = useMemo(() => highlights(draft, shown), [draft, shown]);
  const stats = useMemo(() => metrics(draft), [draft]);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, view, narrow]);

  const setDraft = (next: string, record = true) => {
    if (record && next !== draft) setHistory((h) => [...h.slice(-49), draft]);
    update((d) => ({ ...d, draft: next, original: record ? d.original || d.draft : d.original }));
  };

  const accept = (s: Suggestion) => {
    setDraft(applySuggestion(draft, s));
    setActive(null);
  };

  const dismiss = (s: Suggestion) => update((d) => ({ ...d, dismissed: [...d.dismissed, s.id] }));

  const jump = (s: Suggestion) => {
    const el = area.current;
    const at = draft.indexOf(s.passage);
    if (!el || at === -1) return;
    el.focus();
    el.setSelectionRange(at, at + s.passage.length);
    setActive(s.id);
  };

  const focusCard = (id: string) => {
    setActive(id);
    backdrop.current?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const onCaret = () => {
    const pos = area.current?.selectionStart ?? -1;
    const hit = marked.find((h) => pos >= h.start && pos <= h.end);
    if (hit && hit.suggestion.id !== active) {
      setActive(hit.suggestion.id);
      document.getElementById(`card-${hit.suggestion.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  const review = async () => {
    setReviewing(true);
    setError("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, sources: sources.map((s, i) => ({ n: i + 1, title: s.title, text: s.text })) }),
      });
      const data = await readJSON(res);
      if (!res.ok || data.error) throw new Error(data.error);
      update((d) => ({ ...d, editorNotes: data.notes, original: d.original || d.draft }));
      if (!data.notes.length) setError("The editor pass found nothing worth changing.");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The editorial pass failed.");
    } finally {
      setReviewing(false);
    }
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (prev === undefined) return;
    setHistory((h) => h.slice(0, -1));
    update((d) => ({ ...d, draft: prev }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey && document.activeElement !== area.current && history.length) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const editorCount = suggestions.filter((s) => s.origin === "editor").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={view} onChange={setView} options={[{ value: "write", label: "Draft" }, { value: "compare", label: "Compare" }]} />
        <div className="flex items-center gap-2">
          {history.length > 0 && <Button variant="quiet" onClick={undo}>Undo</Button>}
          <CopyButton text={draft} />
          <Button variant="primary" onClick={review} disabled={reviewing || stats.words < 30}>
            {reviewing && <Spinner />}
            {reviewing ? "Reading your draft" : editorCount ? "Run editor pass again" : "Run editor pass"}
          </Button>
        </div>
      </div>
      {error && <p className="-mt-2 text-[13px] text-[#b3261e]">{error}</p>}

      {view === "write" && <MetricsBar now={stats} />}

      {view === "write" ? (
        <div className={narrow ? "space-y-6" : "space-y-6 md:grid md:grid-cols-[minmax(0,1fr)_290px] md:gap-6 md:space-y-0 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8"}>
          <div className="rounded-lg border border-line bg-sheet px-6 py-7 lg:px-12 lg:py-10">
            <div className="relative">
              <div ref={backdrop} aria-hidden className="prose-draft pointer-events-none absolute inset-0 text-transparent">
                {marks ? renderMarks(draft, marked, active) : draft}
                {"\n "}
              </div>
              <textarea
                ref={area}
                value={draft}
                onChange={(e) => setDraft(e.target.value, false)}
                onPaste={() => !draft.trim() && setTimeout(() => update((d) => ({ ...d, original: d.draft })), 0)}
                onSelect={onCaret}
                placeholder={"Headline\n\nPaste or write your draft here. Suggestions appear as you go."}
                spellCheck
                className="prose-draft relative block min-h-[420px] w-full resize-none overflow-hidden bg-transparent text-ink caret-ink placeholder:text-faint"
              />
            </div>
          </div>

          <aside className={narrow ? "" : "md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:self-start md:overflow-y-auto md:pr-1"}>
            <div className="mb-3 flex items-center justify-between">
              <Segmented
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[{ value: "all", label: `All ${suggestions.filter((s) => !s.covered).length}` }, { value: "editor", label: `Editor ${editorCount}` }, { value: "rules", label: `Rules ${suggestions.length - editorCount}` }]}
              />
              <button onClick={() => setMarks(!marks)} className="text-[12px] text-faint hover:text-ink">{marks ? "Hide marks" : "Show marks"}</button>
            </div>
            {shown.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line p-5 text-[14px] leading-relaxed text-faint">
                {stats.words < 30 ? "Write or paste at least a paragraph to see suggestions." : filter === "editor" && !editorCount ? "Run the editor pass for notes on clarity, jargon, and claims your sources don't support." : "Nothing flagged here. That doesn't mean it's finished; read it aloud once."}
              </p>
            ) : (
              <ul className="space-y-2">
                {shown.map((s) => (
                  <Card key={s.id} s={s} also={filter === "all" ? also.get(s.id) : undefined} active={active === s.id} onFocus={() => focusCard(s.id)} onAccept={() => accept(s)} onDismiss={() => dismiss(s)} onJump={() => jump(s)} />
                ))}
              </ul>
            )}
            {desk.dismissed.length > 0 && (
              <button onClick={() => update((d) => ({ ...d, dismissed: [] }))} className="mt-3 text-[12px] text-faint hover:text-ink">
                Bring back {desk.dismissed.length} dismissed
              </button>
            )}
          </aside>
        </div>
      ) : (
        <Compare desk={desk} now={stats} narrow={narrow} onRestore={() => setDraft(desk.original)} onBaseline={() => update((d) => ({ ...d, original: d.draft }))} onPublished={desk.id === "sample" ? () => setDraft(published) : undefined} />
      )}
    </div>
  );
}

function renderMarks(text: string, marks: ReturnType<typeof highlights>, active: string | null) {
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const h of marks) {
    if (h.start > at) out.push(text.slice(at, h.start));
    out.push(
      <mark key={h.suggestion.id} className="issue" data-id={h.suggestion.id} data-kind={h.suggestion.kind} data-active={active === h.suggestion.id}>
        {text.slice(h.start, h.end)}
      </mark>,
    );
    at = h.end;
  }
  out.push(text.slice(at));
  return out;
}

function Card({ s, also, active, onFocus, onAccept, onDismiss, onJump }: { s: Suggestion; also?: IssueKind[]; active: boolean; onFocus: () => void; onAccept: () => void; onDismiss: () => void; onJump: () => void }) {
  const preview = s.passage.trim().length > 140 ? `${s.passage.trim().slice(0, 140)}…` : s.passage.trim();
  return (
    <li id={`card-${s.id}`} onClick={onFocus} className={`cursor-pointer rounded-lg border bg-sheet p-4 transition-colors ${active ? "border-ink/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" : "border-line hover:border-ink/20"}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px] font-medium">
          <span className="h-2 w-2 rounded-full" style={{ background: KIND_DOT[s.kind] }} />
          {KIND_LABEL[s.kind]}
        </span>
        <span className="text-[11px] text-faint">{s.origin === "editor" ? "Editor pass" : "Rule"}</span>
      </div>
      {!(active && s.rewrite !== undefined) && <p className="mb-2 line-clamp-2 font-serif text-[14px] italic text-faint">{preview}</p>}
      <p className="text-[13.5px] leading-relaxed text-soft">{s.why}</p>
      {also && <p className="mt-2 text-[12px] text-faint">Also flagged by rules: {also.map((k) => KIND_LABEL[k].toLowerCase()).join(", ")}</p>}
      {active && s.rewrite !== undefined && (
        <div className="fade-in mt-3 rounded-md bg-canvas p-3 font-serif text-[14.5px] leading-relaxed">
          {diffWords(s.passage.trim(), s.rewrite.trim()).map((p, i) =>
            p.type === "same" ? <span key={i}>{p.text}</span> : p.type === "add" ? <ins key={i} className="diff">{p.text}</ins> : <del key={i} className="diff">{p.text}</del>,
          )}
        </div>
      )}
      <div className="mt-3 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {s.rewrite !== undefined ? (
          active ? (
            <Button variant="primary" onClick={onAccept}>Accept</Button>
          ) : (
            <Button variant="plain" onClick={onFocus}>Review rewrite</Button>
          )
        ) : (
          <Button variant="plain" onClick={onJump}>Edit it</Button>
        )}
        <Button variant="quiet" onClick={onDismiss}>Dismiss</Button>
      </div>
    </li>
  );
}

const METRIC_HELP = [
  ["Words", "Newsletter pieces tend to land at 300 to 500 words. Shorter often cuts the context a newcomer needs; longer gets skimmed."],
  ["Reading time", "At about 230 words a minute. Most people open a newsletter with two or three minutes to spare."],
  ["Avg. sentence", "Around 15 to 20 words reads comfortably. Variety matters more than the average: a short sentence after a long one lands harder."],
  ["Grade level", "Flesch–Kincaid estimates years of schooling from word and sentence length. It can't tell a precise technical term from a needless long word, so treat it as a smoke alarm, not a target. Grade 8 to 11 is typical of clear business writing."],
  ["Long sentences", "Sentences over 30 words. Some are fine. Several in a row usually aren't."],
];

function MetricsBar({ now, before }: { now: Metrics; before?: Metrics }) {
  const [help, setHelp] = useState(false);
  const items: [string, string, string?][] = [
    ["Words", now.words.toLocaleString(), now.words === 0 ? undefined : now.words < 300 ? "under target" : now.words > 500 ? "over target" : "on target"],
    ["Reading time", `${now.readingMinutes} min`],
    ["Avg. sentence", `${now.avgSentence} words`],
    ["Grade level", now.grade ? `${now.grade}` : "—"],
    ["Long sentences", `${now.longSentences}`],
  ];
  const prev: Record<string, number> | undefined = before && { Words: before.words, "Avg. sentence": before.avgSentence, "Grade level": before.grade, "Long sentences": before.longSentences, "Reading time": before.readingMinutes };
  const cur: Record<string, number> = { Words: now.words, "Avg. sentence": now.avgSentence, "Grade level": now.grade, "Long sentences": now.longSentences, "Reading time": now.readingMinutes };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        {items.map(([label, value, hint]) => (
          <div key={label}>
            <div className="text-[11px] uppercase tracking-[0.06em] text-faint">{label}</div>
            <div className="mt-0.5 text-[17px] tabular-nums tracking-[-0.01em]">
              {prev && prev[label] !== cur[label] && <span className="mr-1.5 text-[13px] text-faint line-through">{prev[label]}</span>}
              {value}
              {hint && <span className={`ml-1.5 text-[11px] ${hint === "on target" ? "text-faint" : "text-[#a86b00]"}`}>{hint}</span>}
            </div>
          </div>
        ))}
        <button onClick={() => setHelp(!help)} className="mb-0.5 text-[12px] text-faint hover:text-ink">{help ? "Hide" : "What these mean"}</button>
      </div>
      {help && (
        <dl className="fade-in mt-4 grid gap-x-8 gap-y-3 rounded-lg bg-mist p-5 text-[13px] leading-relaxed sm:grid-cols-2">
          {METRIC_HELP.map(([k, v]) => (
            <div key={k}>
              <dt className="font-medium">{k}</dt>
              <dd className="text-soft">{v}</dd>
            </div>
          ))}
          <p className="text-soft sm:col-span-2">None of these measure whether the piece is true, specific, or worth reading. Use them to spot problems, then trust your judgment.</p>
        </dl>
      )}
    </div>
  );
}

function Compare({ desk, now, narrow, onRestore, onBaseline, onPublished }: { desk: Desk; now: Metrics; narrow?: boolean; onRestore: () => void; onBaseline: () => void; onPublished?: () => void }) {
  const [style, setStyle] = useState<"inline" | "side">("inline");
  const before = useMemo(() => metrics(desk.original), [desk.original]);
  const parts = useMemo(() => diffWords(desk.original, desk.draft), [desk.original, desk.draft]);
  const changed = parts.some((p) => p.type !== "same");

  if (!desk.original.trim()) {
    return <p className="rounded-lg border border-dashed border-line p-8 text-center text-[14px] text-faint">The original is saved the first time you paste a draft or accept a suggestion. Nothing to compare yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented size="sm" value={style} onChange={setStyle} options={[{ value: "inline", label: "Changes" }, { value: "side", label: "Side by side" }]} />
        <div className="flex items-center gap-1">
          {onPublished && <Button variant="quiet" onClick={onPublished}>Load the published version</Button>}
          <Button variant="quiet" disabled={!changed} onClick={() => confirm("Replace the current draft with the original? You can undo this.") && onRestore()}>Restore original</Button>
          <Button variant="plain" disabled={!changed} onClick={onBaseline}>Keep changes as new original</Button>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-sheet p-5">
        <div className="mb-3 text-[11px] uppercase tracking-[0.06em] text-faint">Original → current</div>
        <MetricsBar now={now} before={before} />
      </div>

      {!changed ? (
        <p className="text-[14px] text-faint">No changes since the original.</p>
      ) : style === "inline" ? (
        <div className="prose-draft rounded-lg border border-line bg-sheet px-8 py-8 sm:px-12 sm:py-10">
          {parts.map((p, i) => (p.type === "same" ? <span key={i}>{p.text}</span> : p.type === "add" ? <ins key={i} className="diff">{p.text}</ins> : <del key={i} className="diff">{p.text}</del>))}
        </div>
      ) : (
        <div className={`grid gap-4 ${narrow ? "" : "grid-cols-2"}`}>
          {(["Original", "Current"] as const).map((label) => (
            <div key={label} className="rounded-lg border border-line bg-sheet p-6">
              <div className="mb-3 text-[11px] uppercase tracking-[0.06em] text-faint">{label}</div>
              <div className="prose-draft !text-[16px]">
                {parts.map((p, i) =>
                  p.type === "same" ? <span key={i}>{p.text}</span> : label === "Original" && p.type === "del" ? <del key={i} className="diff">{p.text}</del> : label === "Current" && p.type === "add" ? <ins key={i} className="diff">{p.text}</ins> : null,
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="quiet"
      disabled={!text.trim()}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied" : "Copy"}
    </Button>
  );
}
