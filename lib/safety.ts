export const NOT_SUPPORTED = "This site isn't supported in Subtext. Adult, gambling, and piracy sites are blocked.";

const DOMAINS = new Set([
  "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com", "redtube.com", "youporn.com", "tube8.com", "spankbang.com",
  "eporner.com", "txxx.com", "motherless.com", "brazzers.com", "onlyfans.com", "fansly.com", "chaturbate.com", "stripchat.com",
  "livejasmin.com", "bongacams.com", "cam4.com", "camsoda.com", "nhentai.net", "hanime.tv", "rule34.xxx", "e-hentai.org",
  "fapello.com", "erome.com", "4tube.com", "porntrex.com", "beeg.com", "hqporner.com", "porn.com", "sex.com", "playboy.com",
  "adultfriendfinder.com", "ashleymadison.com",
  "bet365.com", "stake.com", "1xbet.com", "betway.com", "pokerstars.com", "draftkings.com", "fanduel.com", "888casino.com",
  "dafabet.com", "parimatch.com", "melbet.com", "roobet.com", "bc.game",
  "thepiratebay.org", "1337x.to", "yts.mx", "rarbg.to", "fmovies.to", "123movies.com", "torrentgalaxy.to", "kickass.to",
]);

const TLDS = /\.(xxx|porn|sex|adult|casino|bet|poker)$/i;
const HOST_WORDS = /porn|xxx|hentai|xvideo|xhamster|camgirl|(^|[.-])sex([.-]|y|cams?|chat|shop|tube|videos?)|(^|[.-])nudes?[.-]/i;
const PAGE_WORDS = /\b(free porn|porn videos?|porno|xxx|sex videos?|sex cams?|live sex|hentai)\b/i;
const ADULT_LABEL = /RTA-5042-1996-1400-1577-RTA|<meta[^>]+name=["']?rating["']?[^>]+content=["']?(adult|mature)|<meta[^>]+content=["']?(adult|mature)["']?[^>]+name=["']?rating/i;

export function blockedSite(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (TLDS.test(host) || HOST_WORDS.test(host)) return true;
  const parts = host.split(".");
  return parts.some((_, i) => DOMAINS.has(parts.slice(i).join(".")));
}

export function blockedUrl(url: string) {
  try {
    return blockedSite(new URL(url).hostname);
  } catch {
    return false;
  }
}

export const blockedPage = (head: string, ...titles: (string | undefined)[]) => ADULT_LABEL.test(head) || PAGE_WORDS.test(titles.filter(Boolean).join(" \n "));
