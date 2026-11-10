import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import type { Source } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type Extracted = Pick<Source, "url" | "title" | "site" | "kind" | "text" | "status" | "error">;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MAX_CHARS = 24000;
const THIN_WORDS = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.url === "string" ? body.url.trim() : "";
  const pasted = typeof body?.text === "string" ? body.text.trim() : "";

  if (!raw && pasted) return NextResponse.json(fromText(pasted, body?.title));

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json(failed(raw, "That doesn't look like a web address."));
  }
  if (isPrivate(url.hostname)) return NextResponse.json(failed(url.href, "Local and private addresses can't be fetched."));

  if (pasted) {
    return NextResponse.json({ ...fromText(pasted, body?.title), url: url.href, site: host(url), kind: isTweet(url) ? "tweet" : "article" });
  }

  try {
    return NextResponse.json(isTweet(url) ? await tweet(url) : await article(url));
  } catch (err) {
    const msg = err instanceof Error && err.name === "TimeoutError" ? "The site took too long to respond." : err instanceof Error ? err.message : "Couldn't read this page.";
    return NextResponse.json(failed(url.href, msg));
  }
}

function fromText(text: string, title?: string): Extracted {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").slice(0, MAX_CHARS);
  return {
    url: "",
    title: (title || clean.split("\n")[0]).slice(0, 140),
    site: "Pasted note",
    kind: "note",
    text: clean,
    status: wordCount(clean) < 20 ? "thin" : "ready",
  };
}

async function article(url: URL): Promise<Extracted> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401 || res.status === 403) throw new Error("The site blocked automated access. Open it and paste the text, or use the clipper.");
  if (res.status === 404 || res.status === 410) throw new Error("The page wasn't found (404).");
  if (res.status === 429) throw new Error("The site is rate-limiting requests. Try again shortly.");
  if (!res.ok) throw new Error(`The site returned an error (${res.status}).`);

  const type = res.headers.get("content-type") ?? "";
  if (type.includes("pdf")) throw new Error("PDFs aren't parsed yet. Paste the relevant section instead.");
  if (!type.includes("html") && !type.includes("text")) throw new Error(`Unsupported content type (${type.split(";")[0]}).`);

  const html = (await res.text()).slice(0, 3_000_000);
  const $ = cheerio.load(html);
  const meta = (name: string) => $(`meta[property="${name}"], meta[name="${name}"]`).attr("content")?.trim();

  const title = meta("og:title") || $("h1").first().text().trim() || $("title").text().trim() || host(url);
  const site = meta("og:site_name") || host(url);
  const description = meta("og:description") || meta("description") || "";

  $("script, style, noscript, svg, iframe, form, nav, header, footer, aside, button, figure figcaption, [role=navigation], [role=banner], [role=contentinfo], [aria-hidden=true]").remove();
  $("[class*=newsletter], [class*=subscribe], [class*=related], [class*=share], [class*=cookie], [class*=advert], [id*=comments]").remove();

  const root = ["article", "[itemprop=articleBody]", "main", "[role=main]", ".post-content", ".entry-content", "#content"]
    .map((sel) => $(sel).first())
    .find((el) => el.length && wordCount(el.text()) > 80) ?? $("body");

  const blocks: string[] = [];
  root.find("h1, h2, h3, p, li, blockquote, pre, td").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "li" && $(el).find("p").length) return;
    if (tag === "td" && $(el).closest("tr").index() > 40) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!text) return;
    if (/^h\d$/.test(tag)) blocks.push(`\n${text}`);
    else if (text.length > 30 || tag === "li") blocks.push(text);
  });

  let text = dedupe(blocks).join("\n\n").trim();
  if (wordCount(text) < THIN_WORDS && description) text = `${description}\n\n${text}`.trim();
  text = text.slice(0, MAX_CHARS);

  const words = wordCount(text);
  return {
    url: res.url || url.href,
    title: title.slice(0, 200),
    site,
    kind: "article",
    text,
    status: words < THIN_WORDS ? "thin" : "ready",
    error: words < THIN_WORDS ? "Only a little text came through, which usually means a paywall or a JavaScript-only page. Paste the article text to fill it in." : undefined,
  };
}

async function tweet(url: URL): Promise<Extracted> {
  const canonical = url.href.replace("://x.com", "://twitter.com").replace("://mobile.", "://");
  const res = await fetch(`https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(canonical)}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("This post couldn't be loaded. It may be private, deleted, or from a protected account.");
  const data = await res.json();
  const $ = cheerio.load(data.html ?? "");
  const text = $("blockquote p").map((_, el) => $(el).text().trim()).get().join("\n");
  const author = data.author_name ? `${data.author_name}` : "Post";
  return {
    url: url.href,
    title: `${author}: ${text.slice(0, 90)}${text.length > 90 ? "…" : ""}`,
    site: data.author_url ? `@${String(data.author_url).split("/").pop()} on X` : "X",
    kind: "tweet",
    text: `${author} wrote: ${text}`,
    status: text ? "ready" : "thin",
  };
}

function failed(url: string, error: string): Extracted {
  let site = url;
  try {
    site = host(new URL(url));
  } catch {}
  return { url, title: site || "Untitled", site, kind: "article", text: "", status: "failed", error };
}

const isTweet = (u: URL) => /(^|\.)(twitter|x)\.com$/i.test(u.hostname) && /\/status(es)?\/\d+/.test(u.pathname);
const host = (u: URL) => u.hostname.replace(/^www\./, "");
const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;

function dedupe(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((l) => {
    const k = l.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function isPrivate(hostname: string) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h === "0.0.0.0" || h === "[::1]") return true;
  const m = h.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
