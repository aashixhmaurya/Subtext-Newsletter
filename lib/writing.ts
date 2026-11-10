import type { Suggestion } from "./types";

export interface Span {
  text: string;
  start: number;
  end: number;
}

const ABBREVIATIONS = /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|vs|etc|e\.g|i\.e|U\.S|approx|No)\.)$/i;

export function sentences(text: string): Span[] {
  const out: Span[] = [];
  const re = /[^\n]*?(?:[.!?]+["'”’)\]]*(?=\s|$)|\n|$)/g;
  let pending: Span | null = null;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    if (!raw) continue;
    const start = m.index!;
    const piece: Span = pending ? { text: text.slice(pending.start, start + raw.length), start: pending.start, end: start + raw.length } : { text: raw, start, end: start + raw.length };
    if (ABBREVIATIONS.test(piece.text.trimEnd()) && !piece.text.endsWith("\n")) {
      pending = piece;
      continue;
    }
    pending = null;
    const lead = piece.text.length - piece.text.trimStart().length;
    const trimmed = piece.text.trim();
    if (countWords(trimmed) > 0) out.push({ text: trimmed, start: piece.start + lead, end: piece.start + lead + trimmed.length });
  }
  if (pending) {
    const trimmed = pending.text.trim();
    if (trimmed) out.push({ text: trimmed, start: pending.start, end: pending.start + trimmed.length });
  }
  return out;
}

export function paragraphs(text: string): Span[] {
  const out: Span[] = [];
  for (const m of text.matchAll(/[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g)) {
    const trimmed = m[0].trim();
    if (trimmed) out.push({ text: trimmed, start: m.index! + m[0].indexOf(trimmed), end: m.index! + m[0].indexOf(trimmed) + trimmed.length });
  }
  return out;
}

const LINK = /https?:\/\/\S+/g;
const wordsOf = (text: string) => text.replace(LINK, "").match(/[A-Za-z0-9][A-Za-z0-9'’.,-]*[A-Za-z0-9]|[A-Za-z0-9]/g) ?? [];
export const countWords = (text: string) => wordsOf(text).length;

function syllables(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) ?? []).length);
}

export interface Metrics {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentence: number;
  longSentences: number;
  readingMinutes: number;
  grade: number;
}

export function metrics(text: string): Metrics {
  const words = wordsOf(text).length;
  const sents = sentences(text).filter((s) => isProse(s.text, text));
  const proseWords = sents.reduce((n, s) => n + countWords(s.text), 0);
  const syll = sents.reduce((n, s) => n + wordsOf(s.text).reduce((k, w) => k + syllables(w), 0), 0);
  const avg = sents.length ? proseWords / sents.length : 0;
  const grade = sents.length && proseWords ? 0.39 * avg + 11.8 * (syll / proseWords) - 15.59 : 0;
  return {
    words,
    sentences: sents.length,
    paragraphs: paragraphs(text).filter((p) => isProse(p.text, text)).length,
    avgSentence: Math.round(avg * 10) / 10,
    longSentences: sents.filter((s) => countWords(s.text) > LONG).length,
    readingMinutes: Math.max(words ? 1 : 0, Math.round(words / 230)),
    grade: Math.max(0, Math.round(grade * 10) / 10),
  };
}

function isProse(passage: string, text: string) {
  if (/https?:\/\//.test(passage) || /^\s*(?:\[\d+\]|sources?:?$)/i.test(passage)) return false;
  const isLine = text.split("\n").some((l) => l.trim() === passage);
  return !(isLine && !/[.!?:"”]$/.test(passage) && countWords(passage) <= 14);
}

const LONG = 30;
const VERY_LONG = 42;
const DENSE = 120;

interface Filler {
  re: RegExp;
  to?: string | ((m: string) => string);
  why: string;
}

const inflect = (base: string) => (m: string) => {
  const l = m.toLowerCase();
  if (l.endsWith("ing")) return base === "use" ? "using" : base + "ing";
  if (l.endsWith("ed")) return base === "use" ? "used" : base + "ed";
  if (l.endsWith("es") || l.endsWith("s")) return base + "s";
  return base;
};

const FILLERS: Filler[] = [
  { re: /\bit(?:'s|’s| is) (?:worth noting|important to note|interesting to note) that\s*/gi, to: "", why: "Throat-clearing. If it is worth noting, the sentence already says so by existing." },
  { re: /\bit goes without saying that\s*/gi, to: "", why: "If it goes without saying, cut the preamble and say it." },
  { re: /\bneedless to say,?\s*/gi, to: "", why: "Announces the point instead of making it." },
  { re: /\bat the end of the day,?\s*/gi, to: "", why: "A verbal habit that adds no meaning." },
  { re: /\bmoving forward,?\s*/gi, to: "", why: "Corporate filler. The future tense already carries this." },
  { re: /\bin today's (?:rapidly |fast-)?(?:evolving|changing|paced|moving) (?:world|landscape|environment)(?: of [a-z]+)?,?\s*/gi, to: "", why: "A stock opener readers skip. Start with the news." },
  { re: /\b(?:rapidly|ever-|constantly )evolving\s+/gi, to: "", why: "Cliché in AI writing. Every field is evolving; say what changed." },
  { re: /\bin order to\b/gi, to: "to", why: "\"To\" does the same work in fewer words." },
  { re: /\bdue to the fact that\b/gi, to: "because", why: "Wordy way of saying \"because\"." },
  { re: /\bat this point in time\b/gi, to: "now", why: "Wordy way of saying \"now\"." },
  { re: /\b(?:has|have) the ability to\b/gi, to: "can", why: "\"Can\" is shorter and more direct." },
  { re: /\b(?:is|are) able to\b/gi, to: "can", why: "\"Can\" is shorter and more direct." },
  { re: /\ba (?:wide|broad|diverse) (?:range|variety|array) of\b/gi, to: "many", why: "Vague quantity. \"Many\" is shorter; a number is better." },
  { re: /\ba (?:large |significant )?number of\b/gi, to: "several", why: "Vague quantity. Use a number if the source gives one." },
  { re: /\bin the realm of\b/gi, to: "in", why: "Ornamental phrasing." },
  { re: /\bleverag(?:e|es|ed|ing)\b/gi, to: inflect("use"), why: "Jargon for \"use\". Plain verbs read faster." },
  { re: /\butili[sz](?:e|es|ed|ing)\b/gi, to: inflect("use"), why: "\"Use\" means the same thing." },
  { re: /\bdelv(?:e|es|ed|ing) into\b/gi, to: (m) => (/ing/i.test(m) ? "looking at" : /es\b/i.test(m) ? "looks at" : /ed\b/i.test(m) ? "looked at" : "look at"), why: "Overused in machine-written prose; readers notice it." },
  { re: /\b(?:basically|essentially|literally|actually),?\s+/gi, to: "", why: "Intensifier that rarely changes the meaning. Cut it unless it does." },
  { re: /\bseamless(?:ly)?\s*/gi, to: "", why: "Marketing language. Describe what actually got easier." },
  { re: /\bgame[- ]chang(?:ing|er)s?\b/gi, why: "Hype word. Say what changes, for whom, and by how much." },
  { re: /\brevolutioni[sz](?:e|es|ed|ing)\b/gi, why: "Hype word. Describe the concrete change instead." },
  { re: /\bparadigm shift\b/gi, why: "Abstract and overused. Name the specific shift." },
  { re: /\bplays? an? (?:crucial|key|vital|pivotal|critical) role in\b/gi, why: "Vague. What does it actually do?" },
  { re: /\bunlock(?:s|ed|ing)? (?:new |the )?(?:possibilities|potential|value)\b/gi, why: "Says nothing concrete. Name the possibility." },
];

const PARTICIPLE = /\b(am|is|are|was|were|be|been|being|is being|was being|has been|have been|had been|will be)\s+(?:(?:\w+ly|not|also|now|still)\s+)?([a-z]+ed|built|made|done|given|taken|shown|known|seen|written|held|led|sold|told|found|brought|bought|kept|left|paid|run|sent|spent|won|chosen|driven|grown|drawn|begun|trained|released|announced|hidden|shipped)\b/i;
const NOT_PARTICIPLE = new Set(["need", "seed", "speed", "feed", "indeed", "hundred", "bed", "red", "shed", "based", "interested", "excited", "concerned", "tired", "pleased", "supposed", "used", "detailed", "advanced", "limited", "skilled", "talented", "worried", "aged", "biased", "complicated", "dedicated", "sophisticated", "naked", "wicked", "rugged", "sacred", "crowded"]);

export function hashId(...parts: string[]) {
  let h = 5381;
  for (const ch of parts.join("|")) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

function tidy(sentence: string) {
  let s = sentence.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/,\s*,/g, ",").replace(/^[,\s]+/, "");
  s = s.replace(/^(["“'(]?)([a-z])/, (_, q, c) => q + c.toUpperCase());
  return s;
}

export function ruleCheck(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  const push = (s: Omit<Suggestion, "id" | "origin">) => out.push({ ...s, origin: "rules", id: hashId(s.kind, s.passage) });

  for (const s of sentences(text)) {
    if (!isProse(s.text, text)) continue;
    const n = countWords(s.text);
    if (n > LONG) {
      push({
        kind: "long",
        passage: s.text,
        why: n > VERY_LONG
          ? `${n} words. Readers lose the subject before reaching the verb. Look for a natural break, usually at "and", "which", or a semicolon.`
          : `${n} words. Not wrong, but check whether it carries one idea or two. Long sentences work best after a short one.`,
      });
    }

    let rewritten = s.text;
    const reasons: string[] = [];
    let changed = false;
    for (const f of FILLERS) {
      f.re.lastIndex = 0;
      if (!f.re.test(rewritten)) continue;
      f.re.lastIndex = 0;
      const hit = rewritten.match(f.re)![0].trim();
      reasons.push(`"${hit.replace(/[,\s]+$/, "")}": ${f.why}`);
      if (f.to !== undefined) {
        const to = f.to;
        rewritten = rewritten.replace(f.re, (m) => (typeof to === "function" ? to(m) : to));
        changed = true;
      }
    }
    if (reasons.length) {
      push({ kind: "filler", passage: s.text, why: reasons.join(" "), rewrite: changed ? tidy(rewritten) : undefined });
    }

    const pm = s.text.match(PARTICIPLE);
    if (pm && !NOT_PARTICIPLE.has(pm[2].toLowerCase()) && !/\bby\s+(?:the\s+)?way\b/i.test(s.text)) {
      const byActor = /\bby\b/i.test(s.text.slice(pm.index! + pm[0].length));
      push({
        kind: "passive",
        passage: s.text,
        why: byActor
          ? `"${pm[0]}" puts the actor at the end of the sentence. Try leading with whoever did it.`
          : `"${pm[0]}" hides who did it. Fine if the actor is unknown or beside the point; otherwise name them.`,
      });
    }
  }

  for (const p of paragraphs(text)) {
    const n = countWords(p.text);
    if (n > DENSE && isProse(p.text, text)) {
      push({
        kind: "dense",
        passage: p.text,
        why: `${n} words in one block. On a phone that's a full screen of unbroken text. Split where the idea turns.`,
      });
    }
  }
  return out;
}

export function applySuggestion(draft: string, s: Suggestion) {
  if (s.rewrite === undefined) return draft;
  const at = draft.indexOf(s.passage);
  if (at === -1) return draft;
  return draft.slice(0, at) + s.rewrite + draft.slice(at + s.passage.length);
}

export interface Highlight {
  start: number;
  end: number;
  suggestion: Suggestion;
}

export function highlights(text: string, list: Suggestion[]): Highlight[] {
  const found: Highlight[] = [];
  for (const s of list) {
    if (s.kind === "dense") continue;
    const at = text.indexOf(s.passage);
    if (at !== -1) found.push({ start: at, end: at + s.passage.length, suggestion: s });
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Highlight[] = [];
  let edge = -1;
  for (const h of found) {
    if (h.start >= edge) {
      out.push(h);
      edge = h.end;
    }
  }
  return out;
}

export type DiffPart = { type: "same" | "add" | "del"; text: string };

export function diffWords(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  const n = a.length;
  const m = b.length;
  const dp = new Int32Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[at(i, j)] = a[i] === b[j] ? dp[at(i + 1, j + 1)] + 1 : Math.max(dp[at(i + 1, j)], dp[at(i, j + 1)]);
    }
  }
  const parts: DiffPart[] = [];
  const add = (type: DiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      add("same", a[i]);
      i++;
      j++;
    } else if (dp[at(i + 1, j)] >= dp[at(i, j + 1)]) add("del", a[i++]);
    else add("add", b[j++]);
  }
  while (i < n) add("del", a[i++]);
  while (j < m) add("add", b[j++]);
  return tidyDiff(tidyDiff(parts));
}

function tidyDiff(parts: DiffPart[]): DiffPart[] {
  const isShort = (p: DiffPart) => !p.text.includes("\n") && countWords(p.text) <= 2;
  const out: DiffPart[] = [];
  let del = "";
  let add = "";
  const flush = () => {
    if (del) out.push({ type: "del", text: del });
    if (add) out.push({ type: "add", text: add });
    del = add = "";
  };
  parts.forEach((p, k) => {
    const between = p.type === "same" && k > 0 && k < parts.length - 1 && parts[k - 1].type !== "same" && parts[k + 1].type !== "same";
    if (p.type === "del") del += p.text;
    else if (p.type === "add") add += p.text;
    else if (between && isShort(p)) {
      del += p.text;
      add += p.text;
    } else {
      flush();
      out.push(p);
    }
  });
  flush();
  return out;
}
