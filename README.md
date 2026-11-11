# Subtext Newsletter

An editorial desk for AI newsletters. Clip what you are reading, get a research brief that separates proven facts from speculation, then edit the draft with notes you can accept or dismiss.

Built for the This Week in AI Forward Deployed Engineer Intern assignment.

**Live:** [subtext-newsletter.vercel.app](https://subtext-newsletter.vercel.app)

---

## Quick start

```bash
npm install
cp .env.example .env.local
# add GEMINI_API_KEY (and optional Supabase keys)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The built-in example works without any keys.

### Environment

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | For live brief / editor pass | Google AI Studio |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `SUPABASE_URL` | No | Enables cloud sync |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server only. Never use `NEXT_PUBLIC_` |

Keep secrets in `.env.local`. Do not commit them.

### Optional Supabase sync

Without Supabase, everything stays in the browser. To sync stories and clips:

1. Create a project at [supabase.com](https://supabase.com)
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor
3. Put the project URL and `service_role` key in `.env.local`
4. Restart the app — the header badge should say **Synced**

The browser never talks to Supabase. Server routes use the service role, and RLS stays on with no public policies. Each browser gets an anonymous workspace ID (see **Clipper → Workspace**).

### Deploy

Host as a normal Next.js app (Vercel works). Set the same env vars on the host.

---

## Walkthrough

1. The site opens on a blank story. Use the story menu at the top left, or **Open example**, to load **Testing and Example** — four real sources, a finished brief, a rough draft, and editor notes. Your own stories sit at the top of that menu, newest first, and the example stays at the bottom.
2. **Research** — what happened, why it matters (founders / builders / operators), verified facts with quotes, speculation tagged separately, story angles.
3. **Write** — rule checks run live; editor notes are loaded. Accept or dismiss each card. **Compare → Load the published version** for before/after.
4. **Product note** — product, engineering, and editorial judgment.
5. **Clipper** — bookmarklet and Chrome extension.
6. Back in your own story: paste 3+ URLs, build a brief, draft, run the editor pass.

---

## Product decisions

**Who it is for:** one editor at a small AI newsletter who reads a lot and ships one or two pieces a week for founders and operators.

**Problem:** not summarising. Summaries are cheap. The hard part is finding the story and knowing which claims the sources actually support.

**Flow:** clip or paste links → research brief → pick an angle → draft beside the brief → editor pass → accept / dismiss → compare with the original.

**Priorities:** citation checks against source text, writer stays in control, graceful failure on blocked pages, safe link handling, Pocket-style clipper.

**Left out:** accounts, collaboration, publishing, PDFs, scheduled feeds.

More detail lives in-app under **Product note**.

---

## Assignment mapping

### Part A — Research
Paste URLs, tweets, or notes, or use the bookmarklet / Chrome extension. Brief covers what happened, per-source takeaways, why it matters, audiences, facts with source links and quotes, speculation tags, angles, and open questions. The server checks each fact quote against the extracted source text and demotes unmatched claims. Unreadable, login-walled, and restricted links are reported with a clear reason (see [Source safety](#source-safety)).

### Part B — Writing
Rule checks for long sentences, passive voice, filler, and dense paragraphs. LLM pass for clarity, jargon, repetition, and accuracy vs sources. Each note shows the passage, why it matters, and an optional rewrite. Accept / dismiss, original kept, Compare with a word diff. Metrics include words, reading time, average sentence length, grade level, and long-sentence count, with short explanations.

### Part C — Sample
Rough draft → eight editor notes → published version (~469 words). Average sentence length moves from 18.8 → 15.5 and grade from 8.7 → 7.2.

### Part D — Decisions
Covered in **Product note** and this README.

---

## Sample editorial (Part C)

**Headline:** The cheap end of AI is collapsing. The top end isn't.

The cheapest useful AI models got dramatically cheaper this week. The most capable ones did not.

On November 10, Meta launched Muse Ember at $0.10 per million input tokens and $0.50 per million output tokens, with a 1-million-token context window. Meta says Ember matches the best performance recorded by Claude Haiku 5.5 at about a third of the cost. It is built for the repetitive steps that fill most of an AI agent's day: fetching data, sorting inquiries, running tests.

A day earlier, Meituan published the weights of LongCat-2.5 under an MIT license. It is a mixture-of-experts model: 1.6 trillion parameters in total, but only about 48 billion do work on any given token. On Meituan's own benchmarks it nearly matches frontier models on one agent test, while trailing on a harder variant. Hosted access is $0.30 per million input tokens during a launch window.

Bertrande counted 24 price cuts and 24 increases in early November. Anthropic's newest models listed at $40 per million output tokens. Cheap models are becoming a commodity while frontier models hold or rise. The practical move is model routing: a cheap model for most steps, a frontier model only when needed. Measure cost per task, not cost per token — and treat vendor benchmarks with care.

**Sources**
1. [Meta launches Muse Ember (Zee Business)](https://www.zeebiz.com/technology/news-meta-launches-muse-ember-ai-model-at-lower-cost-how-it-challenges-openais-gpt-6-luna-and-anthropics-claude-haiku-55-405351)
2. [Meituan LongCat-2.5 (Emergent)](https://emergent.sh/news/meituan-open-weights-1-6t-longcat-2-5-agent)
3. [AI API prices November 2026 (Bertrande)](https://bertrande.com/en/reports/2026-11/)
4. [Open model API prices (GPUwerk)](https://gpuwerk.com/blog/open-model-api-prices/)

### Before → after

| | Original | Published |
|---|---|---|
| Words | 461 | 469 |
| Avg sentence | 18.8 | 15.5 |
| Grade level | 8.7 | 7.2 |
| Long sentences | 3 | 1 |

Open **Write → Compare → Load the published version** in the app for the full diff.

---

## Layout

```
app/page.tsx              Research | Split | Write
app/capture/page.tsx      clipper landing page
app/api/extract           URL / tweet / pasted text
app/api/brief             research brief + citation checks
app/api/review            editorial pass
app/api/desks, clips      optional Supabase storage
components/               panels and shared UI
lib/writing.ts            metrics, rules, word diff
lib/sample.ts             example story
lib/store.ts, sync.ts     Supabase + browser sync
lib/safety.ts             blocked site categories
supabase/schema.sql       desks and clips tables
extension/                Chrome MV3 clipper
```

AI is used for the brief and the editor pass. Extraction cleanup, citation matching, writing rules, metrics, and the diff are deterministic.

---

## Clipper

1. Open **Clipper** in the header
2. Drag the bookmarklet to the bookmarks bar, or
3. Chrome → `chrome://extensions` → Developer mode → Load unpacked → select `extension/` → set the Subtext URL

Clips go to Supabase when configured, otherwise into a local inbox for the open story.

---

## Source safety

Subtext reads pages on the server, so every link is checked before anything is fetched.

- **Public web pages only.** Links must be `http` or `https`. Local, private, and cloud-metadata addresses are refused, including disguised forms such as numeric IPs and hostnames that resolve to private ranges.
- **Redirects are re-checked.** Every hop is validated again, with a limit of six redirects, so a public link can't bounce the server somewhere it shouldn't go.
- **Restricted categories are refused.** Adult, gambling, and piracy sites are blocked using a maintained domain list, hostname patterns, and the content-rating labels such sites publish in their own page headers. Blocked links are never fetched or stored.
- **Same rules everywhere.** The link box, the bookmarklet, the Chrome extension, and the clip storage API all apply the same check, and the user sees a short, neutral message explaining why a link was skipped.
- **Bounded reads.** Each page gets a fixed time budget with one retry, and only the first 24,000 characters of text are kept. PDFs, media files, and login-walled pages are reported clearly instead of half-read.

---

## Tools used

- Cursor / AI coding assistant for scaffolding and iteration
- Gemini (`gemini-2.5-flash`) for brief and editor pass
- Next.js, React, Tailwind, cheerio
- Supabase for optional story and clip storage

I designed the workflow, citation grounding, hybrid rules + LLM editor, and the sample editorial, and checked extract → brief → review → accept/dismiss → compare end to end.

---

## Limits

- No accounts. A workspace ID works like a private link — anyone with it can open that workspace.
- Sync is last-write-wins per story.
- Some sites block automated fetch; paste text or use the clipper.
- Category blocking covers well-known sites and clearly labelled pages, not every site on the web.
- There is no per-user rate limit on brief and review requests yet.
- Gemini can rate-limit or overload; the UI retries and shows a clear message.
- Not production-hardened, by design for the assignment.
