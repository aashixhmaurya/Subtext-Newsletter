import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import type { Source } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Extracted = Pick<Source, "url" | "title" | "site" | "kind" | "text" | "status" | "error">;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MAX_CHARS = 24000;
const THIN_WORDS = 120;
const ATTEMPT_TIMEOUT = 18000;
const WALL = /^(log ?in|sign ?in|sign ?up|just a moment|attention required|access denied|are you a robot|verify you are human|security check|please wait)|log ?in or sign ?up|captcha/i;

class Unreadable extends Error {}

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
  if (isPrivateName(url.hostname)) return NextResponse.json(failed(url.href, "Local and private addresses can't be fetched."));
  if (!url.hostname.includes(".") && !isIP(url.hostname.replace(/^\[|\]$/g, ""))) return NextResponse.json(failed(raw, "That doesn't look like a web address."));

  if (pasted) {
    return NextResponse.json({ ...fromText(pasted, body?.title), url: url.href, site: host(url), kind: isTweet(url) ? "tweet" : "article" });
  }

  try {
    return NextResponse.json(await withRetry(() => (isTweet(url) ? tweet(url) : article(url))));
  } catch (err) {
    return NextResponse.json(failed(url.href, reason(err)));
  }
}

async function withRetry<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (err) {
    if (err instanceof Unreadable || !transient(err)) throw err;
    await new Promise((r) => setTimeout(r, 800));
    return read();
  }
}

function transient(err: unknown) {
  if (!(err instanceof Error)) return false;
  if (err.name === "TimeoutError" || err.name === "AbortError") return true;
  const c = code(err);
  return err instanceof TypeError && !["ENOTFOUND", "EAI_AGAIN", "ENODATA"].includes(c) && !/CERT|SSL|TLS/i.test(c);
}

const code = (err: Error) => String((err as { code?: string }).code ?? (err.cause as { code?: string } | undefined)?.code ?? "");

function reason(err: unknown) {
  if (err instanceof Unreadable) return err.message;
  if (!(err instanceof Error)) return "Couldn't read this page.";
  if (err.name === "TimeoutError" || err.name === "AbortError") return "The site took too long to respond. Try again in a moment, or paste the text.";
  const c = code(err);
  if (c === "ENOTFOUND" || c === "EAI_AGAIN" || c === "ENODATA") return "That site couldn't be found. Check the address.";
  if (/CERT|SSL|TLS/i.test(c)) return "The site's security certificate couldn't be verified.";
  if (c.startsWith("HTTP_")) return `The site returned an error (${c.slice(5)}). Try again later, or paste the text.`;
  return "Couldn't connect to the site. Try again, or paste the text.";
}

async function get(start: URL, accept: string) {
  const signal = AbortSignal.timeout(ATTEMPT_TIMEOUT);
  let url = start;
  for (let hop = 0; hop < 6; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "manual",
      signal,
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      await res.body?.cancel();
      url = new URL(next, url);
      continue;
    }
    if (res.status >= 500 && res.status !== 501) {
      await res.body?.cancel();
      throw Object.assign(new TypeError(`Server error ${res.status}`), { cause: { code: `HTTP_${res.status}` } });
    }
    return { res, url };
  }
  throw new Unreadable("The page redirected too many times.");
}

async function assertPublic(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Unreadable("Only web pages can be read.");
  if (isPrivateName(url.hostname)) throw new Unreadable("Local and private addresses can't be fetched.");
  const name = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(name) ? [name] : (await lookup(name, { all: true })).map((a) => a.address);
  if (addresses.some(isPrivateAddress)) throw new Unreadable("Local and private addresses can't be fetched.");
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

async function article(start: URL): Promise<Extracted> {
  const { res, url } = await get(start, "text/html,application/xhtml+xml");
  if (res.status === 401 || res.status === 403) throw new Unreadable("The site blocked automated access. Open it and paste the text, or use the clipper.");
  if (res.status === 404 || res.status === 410) throw new Unreadable("The page wasn't found (404).");
  if (res.status === 429) throw new Unreadable("The site is rate-limiting requests. Try again shortly.");
  if (!res.ok) throw new Unreadable(`The site returned an error (${res.status}).`);

  const type = res.headers.get("content-type") ?? "";
  if (type.includes("pdf")) throw new Unreadable("PDFs aren't parsed yet. Paste the relevant section instead.");
  if (type && !type.includes("html") && !type.includes("text")) throw new Unreadable(`Unsupported content type (${type.split(";")[0]}).`);

  const html = (await res.text()).slice(0, 3_000_000);
  const $ = cheerio.load(html);
  const meta = (name: string) => $(`meta[property="${name}"], meta[name="${name}"]`).attr("content")?.trim();

  const pageTitle = $("title").first().text().trim();
  const title = meta("og:title") || $("h1").first().text().trim() || pageTitle || host(url);
  if (WALL.test(pageTitle) || WALL.test(title)) {
    throw new Unreadable("This page is behind a login or a bot check. Open it in your browser and use the clipper, or paste the text.");
  }
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
    url: url.href,
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
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Unreadable("This post couldn't be loaded. It may be private, deleted, or from a protected account.");
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

function isPrivateName(hostname: string) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  return isIP(h) ? isPrivateAddress(h) : false;
}

function isPrivateAddress(ip: string) {
  const v4 = ip.match(/^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/i);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("::ffff:");
}
