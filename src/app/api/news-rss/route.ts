/**
 * /api/news-rss — Aggregates real publisher RSS/Atom feeds so the news page
 * source buttons (WSJ, MarketWatch, CNBC, CoinDesk, Seeking Alpha, Benzinga,
 * WatcherGuru, SEC filings, Reuters, Bloomberg) actually load live content.
 *
 * Finnhub's free feed only carries a couple of wire sources; these feeds fill
 * in every curated publisher that exposes a public feed. Sources WITHOUT any
 * free feed (X/Twitter, Truth Social, TipRanks) are intentionally omitted —
 * we never fabricate articles.
 *
 * GET /api/news-rss  →  { items: NormalizedNewsItem[] }
 */

import { NextResponse } from "next/server";

export const revalidate = 0;

// SEC EDGAR requires a descriptive UA with contact info, otherwise it 403s.
const UA = "WealthyMindsets/1.0 (contact: dhill5711@gmail.com; +https://wealthymindsets-pro.vercel.app)";

type Feed = { source: string; url: string };

// Each entry verified to return items server-side (see audit). Google-News
// proxy feeds cover publishers that killed their own RSS (Reuters, Bloomberg).
const FEEDS: Feed[] = [
  { source: "WSJ",            url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml" },
  { source: "MarketWatch",    url: "https://www.marketwatch.com/rss/topstories" },
  { source: "CNBC",           url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { source: "CoinDesk",       url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "Seeking Alpha",  url: "https://seekingalpha.com/feed.xml" },
  { source: "Benzinga",       url: "https://www.benzinga.com/feed" },
  { source: "WatcherGuru",    url: "https://watcherguru.com/feed" },
  // SEC EDGAR is free; just needs a descriptive User-Agent (set in fetchFeed).
  { source: "SEC Filing",     url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&output=atom" },
  // Google-News proxies for publishers that block datacenter IPs or have no
  // public feed. Surfaces real, freely-indexed articles from each source.
  { source: "Reuters",        url: "https://news.google.com/rss/search?q=when:2d%20site:reuters.com&hl=en-US&gl=US&ceid=US:en" },
  { source: "Bloomberg",      url: "https://news.google.com/rss/search?q=when:2d%20site:bloomberg.com&hl=en-US&gl=US&ceid=US:en" },
  { source: "WSJ",            url: "https://news.google.com/rss/search?q=when:2d%20site:wsj.com&hl=en-US&gl=US&ceid=US:en" },
  { source: "TipRanks",       url: "https://news.google.com/rss/search?q=when:7d%20TipRanks%20stock&hl=en-US&gl=US&ceid=US:en" },
  // X/Twitter & Truth Social have no free article API — these proxy real,
  // freely-indexed market chatter referencing each platform. A user-supplied
  // X Bearer token (Settings → Connect API Keys) unlocks raw timelines.
  { source: "X / Twitter",    url: "https://news.google.com/rss/search?q=when:1d%20(stock%20OR%20market%20OR%20crypto)%20twitter&hl=en-US&gl=US&ceid=US:en" },
  { source: "Truth Social",   url: "https://news.google.com/rss/search?q=when:2d%20%22Truth%20Social%22&hl=en-US&gl=US&ceid=US:en" },
];

export type NormalizedNewsItem = {
  id: string;
  source: string;
  headline: string;
  summary: string;
  url: string;
  datetime: number; // seconds
};

/* ── Tiny dependency-free RSS/Atom parser ─────────────────────────────── */
function decode(s: string): string {
  // ORDER MATTERS. Google-News RSS descriptions arrive with HTML-ESCAPED markup
  // (e.g. "&lt;a href=...&gt;Title&lt;/a&gt;"). If we strip tags first, those
  // escaped tags are still entities — they only turn into "<a href=...>" AFTER
  // entity-decoding, so they survived as raw visible junk in the news cards.
  // Fix: unwrap CDATA → decode entities → THEN strip ALL tags (real + now-
  // unescaped) → decode &amp; last → collapse whitespace.
  let t = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  t = t
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Generic numeric entities: decimal (&#8230;) and hex (&#x2019;).
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
  // Now strip every tag (originally-real markup AND the just-unescaped ones).
  t = t.replace(/<[^>]+>/g, " ");
  // &amp; decoded last so we never re-introduce a live entity mid-pipeline.
  t = t.replace(/&amp;/g, "&");
  return t.replace(/\s+/g, " ").trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

function atomLink(block: string): string {
  const m = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
  return m ? m[1] : "";
}

function parseFeed(xml: string, source: string): NormalizedNewsItem[] {
  const out: NormalizedNewsItem[] = [];
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const blocks = xml.split(isAtom ? /<entry[\s>]/i : /<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const block = (isAtom ? "<entry " : "<item ") + raw;
    const headline = tag(block, "title");
    if (!headline) continue;
    const url = isAtom ? atomLink(block) : tag(block, "link");
    const summary = tag(block, "description") || tag(block, "summary") || tag(block, "content") || headline;
    const dateStr = tag(block, "pubDate") || tag(block, "updated") || tag(block, "published");
    const t = dateStr ? Date.parse(dateStr) : Date.now();
    const datetime = Math.floor((isNaN(t) ? Date.now() : t) / 1000);
    // Google-News headlines often suffix " - Publisher"; keep as-is.
    out.push({
      id: `${source}:${url || headline}`,
      source,
      headline,
      summary: summary.slice(0, 400),
      url,
      datetime,
    });
  }
  return out.slice(0, 25);
}

async function fetchFeed(feed: Feed): Promise<NormalizedNewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*" },
      cache: "no-store",
      // Follow redirects (MarketWatch/CoinDesk/WatcherGuru 301/308).
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, feed.source);
  } catch {
    return [];
  }
}

/* ── Optional user-API-key feeds ──────────────────────────────────────────
 * Users paste their OWN keys in Settings → Connect API Keys. The browser sends
 * them to THIS route (our own server) via headers; we never log or persist
 * them. A NewsAPI.org key unlocks full WSJ/Bloomberg/Reuters/etc. articles; an
 * X (Twitter) Bearer token unlocks raw market-cashtag timelines. */
async function fetchNewsAPI(key: string): Promise<NormalizedNewsItem[]> {
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=50&apiKey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!res.ok) return [];
    const json = await res.json() as { articles?: { title?: string; description?: string; url?: string; publishedAt?: string; source?: { name?: string } }[] };
    return (json.articles ?? []).map(a => {
      const t = a.publishedAt ? Date.parse(a.publishedAt) : Date.now();
      return {
        id: `NewsAPI:${a.url || a.title}`,
        source: a.source?.name || "NewsAPI",
        headline: a.title || "",
        summary: (a.description || a.title || "").slice(0, 400),
        url: a.url || "",
        datetime: Math.floor((isNaN(t) ? Date.now() : t) / 1000),
      };
    }).filter(i => i.headline);
  } catch { return []; }
}

async function fetchXTimeline(bearer: string): Promise<NormalizedNewsItem[]> {
  try {
    const q = encodeURIComponent("($SPY OR $BTC OR $NVDA OR stocks OR market) -is:retweet lang:en");
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${q}&max_results=40&tweet.fields=created_at`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` }, cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!res.ok) return [];
    const json = await res.json() as { data?: { id: string; text: string; created_at?: string }[] };
    return (json.data ?? []).map(tw => {
      const t = tw.created_at ? Date.parse(tw.created_at) : Date.now();
      return {
        id: `X:${tw.id}`,
        source: "X / Twitter",
        headline: tw.text.slice(0, 140),
        summary: tw.text.slice(0, 400),
        url: `https://twitter.com/i/web/status/${tw.id}`,
        datetime: Math.floor((isNaN(t) ? Date.now() : t) / 1000),
      };
    }).filter(i => i.headline);
  } catch { return []; }
}

export async function GET(request: Request) {
  const newsApiKey = request.headers.get("x-newsapi-key")?.trim();
  const xBearer    = request.headers.get("x-x-bearer")?.trim();

  const all = await Promise.all([
    ...FEEDS.map(fetchFeed),
    newsApiKey ? fetchNewsAPI(newsApiKey) : Promise.resolve([]),
    xBearer    ? fetchXTimeline(xBearer)  : Promise.resolve([]),
  ]);
  const merged = all.flat();
  // Dedupe by url/headline, newest first.
  const seen = new Set<string>();
  const items = merged
    .filter(i => {
      const k = i.url || i.headline;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 150);
  return NextResponse.json({ items });
}
