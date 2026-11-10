import type { Brief, Desk, Source, Suggestion } from "./types";

const t = Date.parse("2026-11-10T18:00:00Z");

const sources: Source[] = [
  {
    id: "s-ember",
    url: "https://www.zeebiz.com/technology/news-meta-launches-muse-ember-ai-model-at-lower-cost-how-it-challenges-openais-gpt-6-luna-and-anthropics-claude-haiku-55-405351",
    title: "Meta Launches Muse Ember AI Model: How it challenges OpenAI's GPT-6 Luna and Anthropic's Claude Haiku 5.5",
    site: "zeebiz.com",
    kind: "article",
    status: "ready",
    addedAt: t,
    text: `Meta has launched Muse Ember, a cost-efficient AI model designed for complex reasoning, coding subtasks and automated workflows. Priced at $0.10 per million input tokens, the model features a 1-million-token context window and supports text, images, audio and video.

The company is marketing the new model as an intelligent yet affordable solution for repetitive high-volume workloads that don't necessarily need the capabilities of a large frontier model.

According to Meta, the model can match the best performance recorded by Claude Haiku 5.5 at approximately one-third of the cost while outperforming all tested GPT-6 Luna reasoning configurations.

While larger models have been mainly created for tricky reasoning tasks, Muse Ember is designed for smaller operations, which make up a large part of the working day of an AI agent.

For example, an AI business assistant could have to fetch customer data, review paperwork, make updates, categorize inquiries, and interact with a variety of software programs.

Meta suggests Ember for more complex development projects along with its more complex Muse Wonder model. In this scenario, Wonder will do the planning and more complex reasoning, with Ember doing the repetitive aspects of execution and less coding.

The pricing model for standard prompts with up to 200,000 tokens is: Input Tokens: 10 cents per million tokens. Any tokens that are "cached" will be charged at $0.004 per million tokens. Output tokens: $0.50/million tokens.

According to the evaluation methodology of Artificial Analysis, Muse Ember costs around $0.14 per task. This price might be of special interest to businesses that have thousands of repetitive tasks that involve AI agents.`,
  },
  {
    id: "s-longcat",
    url: "https://emergent.sh/news/meituan-open-weights-1-6t-longcat-2-5-agent",
    title: "Meituan Open-Weights 1.6T LongCat-2.5 Agent Model Under MIT",
    site: "emergent.sh",
    kind: "article",
    status: "ready",
    addedAt: t,
    text: `Meituan, the Chinese food delivery and e-commerce platform, published the full open weights of LongCat-2.5 on Hugging Face on November 9, 2026, one week after introducing the model. The release carries an MIT license that permits commercial use and modification without restriction. The 1.8-terabyte checkpoint contains 1.6 trillion total parameters operating under mixture-of-experts routing, with roughly 48 billion parameters active per token during inference.

The model posts 88.4 on Terminal Bench v2.1, 64.6 on DeepSWE v1.1, and 78.6 on Vision2Web according to Meituan's published benchmarks. Against current closed frontier models, LongCat-2.5 lands within one point of GPT-5.6 Sol and Claude Opus 5 on Terminal Bench v2.1 but trails Claude Opus 5 on the v4.0 variant at 38.5 to 53.9 and falls behind DeepSeek-V4.1-Flash on DeepSWE at 74.2.

Meituan is offering hosted inference during a limited-time launch window at $0.30 per million uncached input tokens and $1.20 per million output tokens. Cached input tokens drop to $0.006 per million.

The release arrives amid growing scrutiny in Washington over Chinese AI models entering U.S. government and contractor workflows. Many involving open-weights releases where compute costs are low but procurement and compliance overhead can become the primary friction point for enterprise buyers.

The MIT license removes legal barriers to modification and commercial use, but teams in regulated sectors will need to account for export control and procurement policy before deployment.`,
  },
  {
    id: "s-bertrande",
    url: "https://bertrande.com/en/reports/2026-11/",
    title: "AI API prices in November 2026: what changed",
    site: "bertrande.com",
    kind: "article",
    status: "ready",
    addedAt: t,
    text: `In November 2026 (month to date, as of 10 November 2026), 48 headline prices moved between the start and the end of the month, across 28 offers from 3 sellers: 24 cuts and 24 increases. 35 new offers were first read from sellers we already followed, 4 of them sold by the model's own vendor. 36 offers stopped being listed.

Largest price cuts: DeepSeek V4.1 Flash 1017 on OpenRouter, input, $0.150 to $0.006, -96.0%. Nemotron 3 Super on OpenRouter, output, $2.40 to $0.400, -83.3%. Llama 3.1 8B Instruct on OpenRouter, input, $0.050 to $0.020, -60.0%.

Largest price increases: Llama 4 Maverick on OpenRouter, input, $0.1875 to $0.350, +86.7%. Llama 3.1 70B Instruct on OpenRouter, input, $0.400 to $0.720, +80.0%. Kimi K2.5 on OpenRouter, output, $2.50 to $3.325, +33.0%.

New offers sold by the model's own vendor: Claude Fable 5.2, Anthropic, $40.00 output. Claude Mythos 5.2, Anthropic, $40.00 output. kimi-k3.1-pro, Moonshot AI, $10.00 output.

A price counts as moved only if it differs between the start and the end of the month and at least one real movement was confirmed in between; prices that bounce back are left out.`,
  },
  {
    id: "s-gpuwerk",
    url: "https://gpuwerk.com/blog/open-model-api-prices/",
    title: "Open model API prices per million tokens, November 2026, and when a rented GPU beats them",
    site: "gpuwerk.com",
    kind: "article",
    status: "ready",
    addedAt: t,
    text: `On 7 November 2026, gpt-oss-120b cost $0.015 per million input tokens and $0.057 per million output tokens at its cheapest listing (PrimeIntellect on OpenRouter, FP4) and $0.15 and $0.60 at Together, Fireworks and Groq. At those prices a rented DGX Spark at $0.79 an hour beats the cheapest API only for some models, and only when kept about half busy or more; a rented RTX 5090 serving one user never does.

Output tokens decide most bills. Verda's inference page states that reasoning tokens are billed as output tokens, which is the norm, so a model that thinks for 2,000 tokens before a 300-token answer is billed for 2,300 output tokens.

Four reasons, visible in the listings. First, quantization. Second, speed: Cerebras and Groq price for tokens per second, not per token. Third, discounts and snapshots. Fourth, caching and batch tiers.

An API endpoint can swap snapshots, as DeepSeek's V4.1-Flash and V4.1-Flash-1017 listings show, or change quantization between providers.

My verdict: for prototyping and spiky traffic on any model in the table, use the API, and pick the provider by output price and quantization, not by brand. Rent a Spark when you have a sparse model, a steady queue that keeps it at least half busy, or a data rule that forbids shared endpoints.`,
  },
];

const cite = (source: number, quote: string) => ({ source, quote, verified: true });

const brief: Brief = {
  generatedAt: t,
  whatHappened:
    "In the same week, two cheap, capable models arrived: Meta's Muse Ember ($0.10 / $0.50 per million tokens) and Meituan's open-weight LongCat-2.5, released under MIT with hosted access at $0.30 / $1.20. But price trackers show the market is not simply getting cheaper. Bertrande counted as many price increases as cuts in early November, and Anthropic's newest models list at $40 per million output tokens.",
  perSource: [
    { source: 1, takeaway: "Meta's Muse Ember targets the repetitive, high-volume steps of agent work at $0.10 / $0.50 per million tokens, and Meta pitches it as the executor beneath its larger Muse Wonder planner." },
    { source: 2, takeaway: "Meituan's LongCat-2.5 is a 1.6T-parameter mixture-of-experts model under MIT that nearly matches frontier models on one agent benchmark, but trails them on a harder variant." },
    { source: 3, takeaway: "Across tracked sellers, November so far has 24 price cuts and 24 increases. The cheap end is falling; new frontier offers launch at $40 output." },
    { source: 4, takeaway: "Self-hosting open models rarely beats the cheapest API unless the hardware stays at least half busy. Output and reasoning tokens drive the bill." },
  ],
  whyItMatters:
    "Inference cost is splitting into two markets. Routine agent steps are becoming close to free, while frontier reasoning is holding or rising in price. Products whose margins assume every model gets cheaper together need a routing strategy, not a single model choice.",
  audiences: {
    founders: "Unit economics now depend on what share of your calls truly needs a frontier model. Pricing built on falling frontier costs may not hold.",
    builders: "Model routing (a cheap executor plus an expensive planner) is now explicitly recommended by a model vendor. Cost per task, not per token, is the number to benchmark.",
    operators: "Cheap models make high-volume automation like ticket triage and document extraction viable. Open-weight models from Chinese labs may need procurement review first.",
  },
  facts: [
    { text: "Muse Ember costs $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 200,000 tokens, with a 1-million-token context window.", citations: [cite(1, "Priced at $0.10 per million input tokens, the model features a 1-million-token context window"), cite(1, "Output tokens: $0.50/million tokens")] },
    { text: "LongCat-2.5 is released under MIT, with 1.6 trillion total parameters and roughly 48 billion active per token.", citations: [cite(2, "The release carries an MIT license that permits commercial use and modification without restriction."), cite(2, "1.6 trillion total parameters operating under mixture-of-experts routing, with roughly 48 billion parameters active per token")] },
    { text: "Hosted LongCat-2.5 inference costs $0.30 / $1.20 per million tokens during a limited-time launch window.", citations: [cite(2, "Meituan is offering hosted inference during a limited-time launch window at $0.30 per million uncached input tokens and $1.20 per million output tokens.")] },
    { text: "Between November 1 and 10, Bertrande recorded 24 price cuts and 24 price increases across tracked offers.", citations: [cite(3, "48 headline prices moved between the start and the end of the month, across 28 offers from 3 sellers: 24 cuts and 24 increases.")] },
    { text: "Anthropic's Claude Fable 5.2 and Claude Mythos 5.2 list at $40 per million output tokens.", citations: [cite(3, "Claude Fable 5.2, Anthropic, $40.00 output. Claude Mythos 5.2, Anthropic, $40.00 output.")] },
    { text: "A rented DGX Spark beats the cheapest API only for some models, and only at roughly half utilisation or more.", citations: [cite(4, "a rented DGX Spark at $0.79 an hour beats the cheapest API only for some models, and only when kept about half busy or more")] },
    { text: "Reasoning tokens are billed as output tokens at the providers that disclose it.", citations: [cite(4, "Verda's inference page states that reasoning tokens are billed as output tokens, which is the norm")] },
  ],
  speculation: [
    { kind: "vendor claim", text: "Meta says Ember matches Claude Haiku 5.5's best recorded performance at about a third of the cost. This is not independently verified.", citations: [cite(1, "According to Meta, the model can match the best performance recorded by Claude Haiku 5.5 at approximately one-third of the cost")] },
    { kind: "vendor claim", text: "LongCat-2.5's near-frontier scores come from Meituan's own published benchmarks, and it trails Opus 5 by about 15 points on Terminal Bench v4.0.", citations: [cite(2, "according to Meituan's published benchmarks"), cite(2, "trails Claude Opus 5 on the v4.0 variant at 38.5 to 53.9")] },
    { kind: "analysis", text: "The cheap and frontier tiers are diverging in price. Two weeks of tracker data is suggestive, not a trend.", citations: [cite(3, "24 cuts and 24 increases")] },
    { kind: "speculation", text: "The launch price for LongCat-2.5 may rise after the promotional window ends.", citations: [cite(2, "limited-time launch window")] },
  ],
  angles: [
    {
      headline: "The cheap end of AI is collapsing. The top end isn't.",
      thesis: "Prices are splitting, not falling uniformly. The winning architecture routes routine steps to near-free models and saves frontier spend for the few steps that need it.",
      readerTakeaway: "Audit your agent: which steps genuinely need a frontier model? Measure cost per task, not per token.",
    },
    {
      headline: "Don't buy the GPU yet",
      thesis: "With open models this cheap on shared APIs, self-hosting only pays when utilisation is high or data rules force it.",
      readerTakeaway: "Before self-hosting, estimate your daily output tokens and compare against the cheapest listing.",
    },
    {
      headline: "A free model with a procurement bill",
      thesis: "MIT-licensed frontier-class weights remove the license barrier, but compliance review becomes the real cost for enterprise buyers.",
      readerTakeaway: "Check contract and export terms before adopting open weights from Chinese labs in regulated work.",
    },
  ],
  openQuestions: [
    "Do independent evaluations confirm Ember's Haiku-level claim?",
    "What will LongCat-2.5 cost after the launch window?",
    "Is the frontier price rise a durable pattern or a few new launches?",
  ],
};

const original = `AI Models Are Getting Cheaper

In today's rapidly evolving landscape of AI, it is worth noting that the price of AI models is basically falling through the floor, and this week there were a number of announcements that show this trend is continuing in a big way for anyone building products.

Meta launched Muse Ember on November 10. It is priced at $0.10 per million input tokens and $0.50 per million output tokens, and it has a 1-million-token context window. According to Meta, the model can match the best performance recorded by Claude Haiku 5.5 at approximately one-third of the cost. Ember is designed to be used for the repetitive steps that make up most of an agent's working day, like fetching data, categorizing inquiries and running tests [1].

A day earlier, Meituan released the weights of LongCat-2.5 under an MIT license. It is a 1.6T-parameter MoE with 48B active parameters. Meituan's benchmarks put it within one point of GPT-5.6 Sol and Claude Opus 5 on Terminal Bench v2.1, which is a game-changing result for open models, and hosted inference is being offered at $0.30 per million input tokens during a limited-time launch window [2].

But the story is not just that everything is getting cheaper. Bertrande, which tracks API prices across sellers, counted 24 price cuts and 24 price increases in the first ten days of November. Anthropic's new Claude Fable 5.2 and Claude Mythos 5.2 were listed at $40 per million output tokens [3]. The cheap tier is being commoditized while the frontier tier is holding its price or going up, and this matters a lot because founders who assumed that all inference costs would fall at the same rate may need to rethink their margins, their pricing and the way they architect their products.

Meta itself is pointing to the way to leverage this. It suggests pairing Ember with its bigger Muse Wonder model, where Wonder does the planning and Ember does the execution. This is basically model routing. A cheap model handles most of the calls and an expensive one is used only when it is really needed.

Self-hosting is also not automatically the answer. GPUwerk's analysis found that a rented DGX Spark beats the cheapest API only for some models, and only when it is kept about half busy or more. Output tokens decide most bills, and reasoning tokens are billed as output [4].

So what should you do? It is important to note that you should look at your agent and figure out which steps actually need a frontier model. Most of them probably don't. Measure cost per task, not cost per token. And be careful about benchmark claims, since most of the numbers above come from the vendors themselves.

Sources
[1] ${sources[0].url}
[2] ${sources[1].url}
[3] ${sources[2].url}
[4] ${sources[3].url}`;

const note = (id: string, kind: Suggestion["kind"], passage: string, why: string, rewrite?: string): Suggestion => ({ id, kind, passage, why, rewrite, origin: "editor" });

const editorNotes: Suggestion[] = [
  note(
    "ed-headline",
    "clarity",
    "AI Models Are Getting Cheaper",
    "The headline states the generic trend, and your own sources complicate it: Bertrande shows as many increases as cuts. Lead with the tension, because that is the story.",
    "The cheap end of AI is collapsing. The top end isn't.",
  ),
  note(
    "ed-lede",
    "clarity",
    "In today's rapidly evolving landscape of AI, it is worth noting that the price of AI models is basically falling through the floor, and this week there were a number of announcements that show this trend is continuing in a big way for anyone building products.",
    "The opening spends 45 words before saying anything specific, and its claim (\"prices are falling\") is the half of the story that is not new. Put the contrast up front.",
    "The cheapest useful AI models got dramatically cheaper this week. The most capable ones did not.",
  ),
  note(
    "ed-moe",
    "jargon",
    "It is a 1.6T-parameter MoE with 48B active parameters.",
    "\"MoE\" and \"active parameters\" are unexplained, and an operator won't know why they matter. Keep the numbers and add one clause on what they mean for cost.",
    "It is a mixture-of-experts model: 1.6 trillion parameters in total, but only about 48 billion do work on any given token, which is what keeps it cheap to run.",
  ),
  note(
    "ed-bench",
    "clarity",
    "Meituan's benchmarks put it within one point of GPT-5.6 Sol and Claude Opus 5 on Terminal Bench v2.1, which is a game-changing result for open models, and hosted inference is being offered at $0.30 per million input tokens during a limited-time launch window [2].",
    "This sentence carries a vendor benchmark, a hype word, and a price. It also leaves out the source's caveat: LongCat trails Opus 5 by 15 points on the harder v4.0 test. Separate the claim from the price and keep the caveat.",
    "On Meituan's own benchmarks, it lands within one point of GPT-5.6 Sol and Claude Opus 5 on Terminal Bench v2.1, though it trails Opus 5 by 15 points on the harder v4.0 version. Hosted access costs $0.30 per million input tokens, a limited-time launch price [2].",
  ),
  note(
    "ed-pivot",
    "clarity",
    "The cheap tier is being commoditized while the frontier tier is holding its price or going up, and this matters a lot because founders who assumed that all inference costs would fall at the same rate may need to rethink their margins, their pricing and the way they architect their products.",
    "This is the thesis of the piece, but it is buried at the end of a paragraph inside a 48-word sentence. Give it its own short paragraph. \"This matters a lot\" tells the reader it matters instead of showing why.",
    "\n\nCheap models are turning into a commodity while frontier models hold their price or rise. Founders who assumed every inference bill would shrink at the same rate should recheck their margins and pricing.",
  ),
  note(
    "ed-routing",
    "repetition",
    "This is basically model routing. A cheap model handles most of the calls and an expensive one is used only when it is really needed.",
    "\"Basically\" and \"really\" soften a precise idea. Name the technique once and define it in the same breath.",
    "Engineers call this model routing: a cheap model handles most calls, and the expensive one runs only when a step needs it.",
  ),
  note(
    "ed-tokens",
    "jargon",
    "Output tokens decide most bills, and reasoning tokens are billed as output [4].",
    "\"Reasoning tokens\" will be opaque to many readers, and it is the most practical point in the paragraph. Explain it in plain terms.",
    "And watch output tokens, which decide most bills: when a reasoning model \"thinks\" before answering, those hidden tokens are billed as output too [4].",
  ),
  note(
    "ed-close",
    "clarity",
    "It is important to note that you should look at your agent and figure out which steps actually need a frontier model. Most of them probably don't.",
    "\"Most of them probably don't\" is an unsupported claim. Tie it to the evidence you have (Meta's own positioning) and make the action concrete.",
    "List every step your agent takes and mark the ones that genuinely need a frontier model. If Meta's pitch for Ember is right, that list is shorter than your bill suggests.",
  ),
];

export const published = `The cheap end of AI is collapsing. The top end isn't.

The cheapest useful AI models got dramatically cheaper this week. The most capable ones did not.

On November 10, Meta launched Muse Ember at $0.10 per million input tokens and $0.50 per million output tokens, with a 1-million-token context window. Meta says Ember matches the best performance recorded by Claude Haiku 5.5 at about a third of the cost. It's built for the repetitive steps that fill most of an AI agent's day: fetching data, sorting inquiries, running tests [1].

A day earlier, Meituan published the weights of LongCat-2.5 under an MIT license, so anyone can run or modify it commercially. It is a mixture-of-experts model: 1.6 trillion parameters in total, but only about 48 billion do work on any given token, which is what keeps it cheap to run. On Meituan's own benchmarks, it lands within one point of GPT-5.6 Sol and Claude Opus 5 on Terminal Bench v2.1, though it trails Opus 5 by 15 points on the harder v4.0 version. Hosted access costs $0.30 per million input tokens, a limited-time launch price [2].

The easy headline is "AI keeps getting cheaper." The data says something more useful. Bertrande, which tracks API prices across sellers, counted 24 price cuts and 24 price increases in the first ten days of November. Anthropic's new Claude Fable 5.2 and Claude Mythos 5.2 arrived at $40 per million output tokens [3].

Cheap models are turning into a commodity while frontier models hold their price or rise. Founders who assumed every inference bill would shrink at the same rate should recheck their margins and pricing.

Meta is already describing the workaround. It suggests pairing Ember with its larger Muse Wonder model: Wonder plans, Ember executes. Engineers call this model routing: a cheap model handles most calls, and the expensive one runs only when a step needs it.

Owning the hardware is not an automatic escape, either. GPUwerk found that a rented DGX Spark beats the cheapest API only for some models, and only when kept about half busy or more. And watch output tokens, which decide most bills: when a reasoning model "thinks" before answering, those hidden tokens are billed as output too [4].

What to do this week: list every step your agent takes and mark the ones that genuinely need a frontier model. If Meta's pitch for Ember is right, that list is shorter than your bill suggests. Then measure cost per task, not cost per token. And treat the benchmark numbers above with care. Most of them come from the vendors selling the models.

Sources
[1] Zee Business, Meta launches Muse Ember: ${sources[0].url}
[2] Emergent, Meituan open-weights LongCat-2.5: ${sources[1].url}
[3] Bertrande, AI API prices in November 2026: ${sources[2].url}
[4] GPUwerk, Open model API prices and when a rented GPU beats them: ${sources[3].url}`;

export const sampleDesk: Desk = {
  id: "sample",
  name: "Issue 47 · Inference prices",
  sources,
  brief,
  briefSources: sources.map((s) => s.id),
  original,
  draft: original,
  editorNotes,
  dismissed: [],
  updatedAt: t,
};
