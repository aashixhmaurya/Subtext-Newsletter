const sections: { title: string; items: [string, React.ReactNode][] }[] = [
  {
    title: "Product",
    items: [
      ["Who it's for", "One editor at a small AI newsletter who reads forty things a week and ships one or two pieces. They are fluent in the subject and short on time. The reader they write for is a founder or operator who doesn't follow every launch."],
      ["The problem I chose", "Not summarising. Summaries are cheap now. The expensive part is deciding what the story is and being sure every claim in it is actually supported. So the brief is built around evidence: what the sources prove, what is only a vendor's claim, and what is our own inference."],
      ["Core workflow", "Clip or paste links → build a brief → pick an angle → draft beside the brief → run the editor pass → accept or dismiss each note → compare against the original. Research and writing share one desk, so the evidence stays in view while writing and the editor pass can check the draft against the same sources."],
      ["What I prioritised", "Citations that are mechanically verified against source text. A Writing Assistant that explains every suggestion and changes nothing on its own. Graceful handling of pages that won't load, because paywalls, bot blocks and JavaScript-only sites are routine. A bookmarklet and extension, so saving doesn't require leaving the page."],
      ["What I left out", "Accounts, a database, collaboration, publishing, scheduled feeds and PDF parsing. Everything is stored in the browser. That keeps the tool honest about its scope and lets it deploy anywhere with one environment variable."],
      ["How I'd know it's useful", "Time from first link to a publishable draft. The share of brief citations the editor clicks and keeps. The acceptance rate of editor-pass notes, split by kind: a kind with low acceptance is noise and should be cut. And whether editors keep clipping into it after the first week."],
    ],
  },
  {
    title: "Engineering",
    items: [
      ["Structure", "A single Next.js app. Three API routes do server work: extract (fetching and cleaning pages), brief, and review. The client holds state per issue in localStorage. The writing metrics and rule checks are plain TypeScript in lib/writing.ts and run on every keystroke with no network call."],
      ["AI vs. rules", "Gemini writes the brief and the editor pass, because both need judgment: what's a vendor claim, what's unexplained jargon to this reader, where the lead is buried. Rules handle everything that should be predictable and instant: long sentences, passive voice, filler and hype phrases, dense paragraphs, readability, and the word diff. Rules never call the model, and the model is told the rules exist so it doesn't duplicate them."],
      ["Failures", "Each source loads independently, so one bad link never blocks the brief. Blocked, 404, paywalled, timed-out, tweet and PDF cases each get a specific message and an inline box to paste the text. Thin pages are marked Partial rather than silently used. Model calls use a JSON schema, are retried once on malformed output, and return readable errors for rate limits and missing keys."],
      ["Keeping sources honest", "Every fact must cite a numbered source with a verbatim quote. The server checks that each quote actually appears in that source's text. Facts without a matched quote are demoted to 'unsupported' instead of being shown as fact. In the editor pass, a rewrite that drops a number or a citation marker like [2] is flagged before it can be accepted."],
      ["With another day", "Fuzzy quote matching, so a quote that differs only in punctuation still verifies. A server-side clip inbox so the extension works across devices. Readability-style extraction for messy sites. Streaming the brief section by section. An eval set of real drafts with editor-approved edits to measure the review prompt."],
    ],
  },
  {
    title: "Editorial judgment",
    items: [
      ["Clear and useful writing", "It says the specific thing early, gives a newcomer just enough context, keeps the numbers and the caveats, and leaves the reader with a decision or a question. Short sentences help, but they aren't the goal; precision is."],
      ["Does the assistant help?", "Blind comparison: editors rate the original against the assisted version for accuracy, clarity and voice without knowing which is which. Alongside that, track per-suggestion acceptance and check that accepted edits never change a fact against the sources. A tool that raises the readability score but loses a caveat has made the piece worse."],
      ["What it should never do on its own", "Change numbers, names, quotes or claims. Remove a technical term instead of explaining it. Smooth the author's voice into house style. Delete hedges that reflect real uncertainty. Rewrite whole paragraphs. That's why nothing is applied without a click, and the original is always one tab away."],
    ],
  },
  {
    title: "Assumptions",
    items: [
      ["", "Sources are public web pages or posts on X. One editor works per browser. Gemini Flash is good enough for both the brief and the review, and the model can be swapped with GEMINI_MODEL. The sample issue uses four real sources. Its brief and editor-pass notes are stored with it so the demo works without an API key, and its rough draft was written deliberately loose so the edits are easy to see. The rule-based checks on it run live."],
    ],
  },
];

export default function ProductNote() {
  return (
    <div className="space-y-9 text-[14px] leading-relaxed">
      {sections.map((s) => (
        <section key={s.title}>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{s.title}</h3>
          <dl className="space-y-4">
            {s.items.map(([k, v], i) => (
              <div key={i}>
                {k && <dt className="font-medium">{k}</dt>}
                <dd className="text-soft">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
