"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";
import { useRouter } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import {
  // TrendingUp / TrendingDown / Minus left with the sentiment chip. An arrow
  // is the house pointing; the row now says which way the SENTENCE leaned.
  ExternalLink, Filter,
  Brain, BarChart2, AlertCircle, Zap, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { selectHeadlineLean, type HeadlineLean } from "@/lib/experience/selectHeadlineLean";
import { HeadlineLeanBand } from "@/components/experience/HeadlineLeanBand";
import { ChartCompanion } from "@/components/experience/ChartCompanion";
import { headlineNames, newsTermsFor } from "@/lib/news/newsTermsFor";
import { matchCuratedSymbols } from "@/lib/marketData/curatedSymbolCatalog";
import { isPersonalAdviceColumn } from "@/lib/news/marketRelevance";
import { keyActivates } from "@/lib/a11y/keyActivates";
import { DialogBehaviour } from "@/components/ui/DialogFrame";
import { plainSummary } from "./plainSummary";
import { WM } from "@/lib/design/wmTokens";
import { dayAwareStamp } from "@/lib/time/dayAwareStamp";

/* ── Types ─────────────────────────────────────────────── */
/** "JUST NOW" / "12m ago" / "3h ago" / "2d ago", from the publish time and a live clock. */
function ageLabel(publishedMs: number, nowMs: number): string {
  const ageMs = nowMs - publishedMs;
  const ageMin = Math.floor(ageMs / 60_000);
  const ageHr = Math.floor(ageMs / 3_600_000);
  return ageMin < 1 ? "JUST NOW" : ageMin < 60 ? `${ageMin}m ago` : ageHr < 24 ? `${ageHr}h ago` : `${Math.floor(ageMs / 86_400_000)}d ago`;
}

interface NewsItem {
  id:        number;
  time:      string;
  ageMs:     number;
  /** When the wire published it (epoch ms) — the age is read from this at render. */
  publishedMs: number;
  source:    string;
  sourceIcon:string;
  sym:       string;
  impact:    "high" | "medium" | "low";
  title:     string;
  summary:   string;
  url?:      string;
  tags:      string[];
  /**
   * WHICH WAY THE HEADLINE'S WORDS LEANED — a tally, compiled once.
   *
   * This replaced `sentiment: { score, label, keywordHits }`, which was a 0–100
   * number built by counting two word lists at ±6 a term and then adding a
   * further ±12 for `bullish` — a field derived from THOSE SAME WORDS by
   * `detectBullish`. One observation admitted through two doors.
   *
   * `bullish` is gone from this type because nothing else ever read it. It
   * existed only to be counted a second time.
   *
   * Null means the headline was never read, which is not the same as reading it
   * and finding no sentiment vocabulary. See selectHeadlineLean.
   */
  lean:      HeadlineLean | null;
  breaking?: boolean;
}

/* ── Real Finnhub news fetcher (via server proxy — no key in browser) ── */
// WM-SEC-P0-03: this page used to read NEXT_PUBLIC_FINNHUB_KEY and call
// finnhub.io directly, shipping the key in the client bundle. All Finnhub
// calls now route through /api/finnhub which holds the server-only
// FINNHUB_KEY.

const SOURCE_ICONS: Record<string, string> = {
  "CNBC": "📺", "Reuters": "🔴", "Bloomberg": "🔵", "WSJ": "📰",
  "MarketWatch": "📊", "Seeking Alpha": "🔍", "Yahoo Finance": "📈",
  "Benzinga": "📡", "The Motley Fool": "🃏", "Business Insider": "💼",
  "Forbes": "💰", "Financial Times": "🗞️", "AP": "📰", "SEC Filing": "🏛️",
  "TipRanks": "📊", "CoinDesk": "₿", "Decrypt": "₿", "The Block": "🔗",
  "default": "📰",
};

function getSourceIcon(source: string): string {
  for (const [k, v] of Object.entries(SOURCE_ICONS)) {
    if (source.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return SOURCE_ICONS.default;
}

function extractSymbol(related: string, headline: string): string {
  // Use related field first (comma-separated tickers)
  if (related) {
    const syms = related.split(",").map(s => s.trim()).filter(s => s.length > 0 && s.length <= 5);
    if (syms.length > 0) return syms[0];
  }
  // Detect from headline
  const cryptos = ["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "BNB"];
  for (const c of cryptos) {
    if (headline.toUpperCase().includes(c)) return c;
  }
  const match = headline.match(/\b([A-Z]{2,5})\b/);
  return match ? match[1] : "MARKET";
}

function classifyImpact(item: { category: string; headline: string; summary: string }): "high" | "medium" | "low" {
  const text = `${item.headline} ${item.summary}`.toLowerCase();
  const highWords = ["fed", "fomc", "rate", "cpi", "gdp", "inflation", "earnings", "beats", "record", "crash", "surge", "plunge", "breaking", "alert", "emergency"];
  const medWords  = ["upgrade", "downgrade", "guidance", "revenue", "profit", "loss", "deal", "acquisition", "merger"];
  if (highWords.some(w => text.includes(w))) return "high";
  if (medWords.some(w => text.includes(w)))  return "medium";
  return "low";
}

/*
  THE WORD LISTS LEFT THIS FILE, AND SO DID THE SECOND READER.

  BULLISH_WORDS and BEARISH_WORDS lived here with TWO functions walking them:
  `detectBullish`, which returned a verdict, and `scoreSentiment`, which counted
  the same lists again at ±6 a term AND added ±12 for `detectBullish`'s answer.
  A headline with three bullish words collected +18 for those words and then +12
  more because of those same words.

  Vocabulary with two readers is vocabulary that will eventually be counted
  twice. It now has exactly one reader, in selectHeadlineLean, and this room
  cannot reach the words at all.

  `detectBullish` is gone rather than migrated: its only consumer was the double
  count. It also carried an invisible threshold — `bull > bear + 1` — so two
  bullish terms against one bearish reported NEUTRAL, which is not what the
  headline said.
*/

function detectTags(item: { category: string; related: string; headline: string }): string[] {
  const tags: string[] = [];
  const text = `${item.headline} ${item.related}`.toLowerCase();
  if (text.includes("fed") || text.includes("fomc") || text.includes("rate") || text.includes("macro") || text.includes("cpi") || text.includes("gdp")) tags.push("Macro");
  if (text.includes("btc") || text.includes("eth") || text.includes("crypto") || text.includes("bitcoin") || text.includes("ethereum")) tags.push("Crypto");
  if (text.includes("earnings") || text.includes("revenue") || text.includes("profit")) tags.push("Earnings");
  if (text.includes("whale") || text.includes("million shares") || text.includes("billion")) tags.push("Whale");
  if (text.includes("ai") || text.includes("artificial intelligence")) tags.push("AI");
  if (text.includes("upgrade") || text.includes("downgrade") || text.includes("analyst")) tags.push("Analyst");
  if (item.related) tags.push(...item.related.split(",").slice(0, 2).map(s => s.trim()).filter(s => s && s.length <= 5));
  return [...new Set(tags)].slice(0, 5);
}

type FinnhubRaw = {
  id: number; datetime: number; headline: string; summary: string;
  source: string; related: string; category: string; image: string; url: string;
};

/* ── User-supplied API keys (stored in localStorage `wm_api_keys`) ────────── */
type ApiKeys = { newsapi?: string; xbearer?: string };
function readApiKeys(): ApiKeys {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("wm_api_keys") || "{}") as ApiKeys; }
  catch { return {}; }
}

// The publisher RSS read takes ~9 s on the Worker (measured 2026-10-03) and
// the page used to wait for it before showing anything. The wires answer in
// well under a second, so they paint first and RSS merges in when it lands.
async function fetchFinnhubNews(onFirst?: (items: NewsItem[]) => void): Promise<NewsItem[]> {
  try {
    const keys = readApiKeys();
    const rssHeaders: Record<string, string> = {};
    if (keys.newsapi) rssHeaders["x-newsapi-key"] = keys.newsapi;
    if (keys.xbearer) rssHeaders["x-x-bearer"]    = keys.xbearer;
    // Finnhub's "general" feed only carries Reuters/CNBC/Bloomberg. Pulling the
    // other categories (crypto, forex, merger) brings in CoinDesk, MarketWatch,
    // SEC-style filings and more, so the source filter actually has data to show.
    const cats = ["general", "crypto", "forex", "merger"];
    const finnhubP = Promise.all(
        cats.map(c =>
          fetch(`/api/finnhub?type=news&category=${encodeURIComponent(c)}`, { cache: "no-store" })
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then((j: { items?: FinnhubRaw[] }) => j.items ?? [])
            .catch(() => [])
        )
      );
    // Real publisher RSS feeds (WSJ, MarketWatch, CNBC, CoinDesk, Seeking
      // Alpha, Benzinga, WatcherGuru, SEC, Reuters, Bloomberg) so every curated
      // source button actually loads live content, not just the Finnhub wires.
    const rssP = fetch(`/api/news-rss`, { cache: "no-store", headers: rssHeaders })
        .then(r => (r.ok ? r.json() : { items: [] }))
        .then((j: { items?: { id: string; source: string; headline: string; summary: string; url: string; datetime: number }[] }) =>
          (j.items ?? []).map(it => ({
            id: it.id, datetime: it.datetime, headline: it.headline,
            summary: it.summary, source: it.source, related: "", category: "", image: "", url: it.url,
          }) as unknown as FinnhubRaw))
        .catch(() => [] as FinnhubRaw[]);

    const finnhubArrs = await finnhubP;
    if (onFirst) {
      const first = buildNewsItems(finnhubArrs as FinnhubRaw[][]);
      if (first.length) onFirst(first);
    }
    const rssRaw = await rssP;
    const all = buildNewsItems([...(finnhubArrs as FinnhubRaw[][]), rssRaw]);
    if (all.length === 0) throw new Error("News feed failed");
    return all;
  } catch {
    return [];
  }
}

/* One publisher, one name: Finnhub writes "SeekingAlpha" where the curated
   button (and the RSS feed) say "Seeking Alpha", so the button never showed
   the wire's stories (measured 2026-10-03: 9 hidden). */
const SOURCE_ALIASES: Record<string, string> = {
  SeekingAlpha: "Seeking Alpha",
  "Seekingalpha": "Seeking Alpha",
  Marketwatch: "MarketWatch",
  "Wall Street Journal": "WSJ",
};
const canonicalSource = (s: string) => SOURCE_ALIASES[s.trim()] ?? s.trim();

function buildNewsItems(arrs: FinnhubRaw[][]): NewsItem[] {
    // Merge Finnhub + RSS, dedupe by id (fall back to url/headline).
    const seen = new Set<string>();
    const raw: FinnhubRaw[] = [];
    for (const arr of arrs) {
      for (const item of arr) {
        const key = String(item.id || item.url || item.headline);
        if (seen.has(key)) continue;
        seen.add(key);
        raw.push(item);
      }
    }
    raw.sort((a, b) => b.datetime - a.datetime);

    const now = Date.now();
    return raw.slice(0, 120).map((item, i) => {
      const ageMs = now - item.datetime * 1000;
      const ageMin = Math.floor(ageMs / 60_000);
      const ageHr  = Math.floor(ageMs / 3_600_000);
      const ageDay = Math.floor(ageMs / 86_400_000);
      const timeStr = ageMin < 1 ? "JUST NOW" : ageMin < 60 ? `${ageMin}m ago` : ageHr < 24 ? `${ageHr}h ago` : `${ageDay}d ago`;

      const impact  = classifyImpact(item);
      const sym     = extractSymbol(item.related ?? "", item.headline);
      const summary = plainSummary(item.summary) || item.headline;
      return {
        id:         item.id || i,
        source:     canonicalSource(item.source || "News"),
        sourceIcon: getSourceIcon(canonicalSource(item.source || "")),
        time:       timeStr,
        title:      item.headline,
        summary,
        url:        item.url || undefined,
        sym,
        impact,
        tags:       detectTags(item),
        breaking:   impact === "high" && ageMin < 30,
        ageMs,
        publishedMs: item.datetime * 1000,
        // Read ONCE, from the text, and never touched again. In particular
        // `impact` is not folded in: the old scorer pushed a high-impact
        // headline further in whichever direction it already leaned, which
        // answered "how market-moving is this" and "which way does it read"
        // with a single number. They are two questions and they keep two
        // answers — §24.
        lean:       selectHeadlineLean(`${item.headline} ${summary}`),
      };
    }).sort((a, b) => a.ageMs - b.ageMs);
}

/*
  DEAD ON ARRIVAL, AND REMOVED WITH THE SCORER.

  `BASE_NEWS` (two "Loading…" placeholders) and `hydrate` lived here and nothing
  called either. `hydrate` was BASE_NEWS's only consumer, and no one called
  `hydrate`. Worth recording because of what they would have done if anyone had
  wired them back up: hydrate ran every placeholder through `scoreSentiment`, so
  the headline "Loading real-time market news…" would have been given a
  half-full sentiment meter reading 50. The house would have been scoring its
  own loading message.

  `scoreSentiment` is gone entirely. Its replacement is selectHeadlineLean, and
  the four things it did that this room no longer can:
    - counted the same vocabulary twice (±6 a word, then ±12 for a verdict
      derived from those words)
    - started at 50, so NO EVIDENCE rendered as a half-full bar
    - collapsed "found nothing" and "found both" into one word and one number
    - folded `impact` into direction
*/

/* ── The feed's lean, as a tally ─────────────────────────── */
/*
  THE GAUGE IS GONE.

  It drew a red→gold→green gradient with a dot at `left: ${avg - 6}%` and the
  text `{avg}/100` beside it. Three separate defects in one control:

    §15  "/100" is a score. There is no hundred. The number was a mean of
         per-headline scores that were themselves fabricated from keyword
         tallies, so the gauge was an average of inventions.

    §9   the gradient ran to green at one end. Green is the house saying safe,
         and a bullish news feed is not safe — it is a news feed that used
         more bullish words today.

    H1   `?? 50` inside the mean. Every headline the compiler could not read
         was silently entered as a neutral 50 and pulled the average toward
         the middle, so a feed that failed to load looked calm.

  What replaces it is a COUNT of headlines per direction. A count has a real
  denominator — the number of headlines — and it cannot be an average of
  anything. Headlines that were never read are their own line rather than
  being folded in at 50, because "we could not read it" is a fact about the
  house and not a fact about the market.
*/
function FeedLeanTally({ news }: { news: NewsItem[] }) {
  const count = (d: HeadlineLean["direction"]) =>
    news.filter(n => n.lean?.direction === d).length;

  const bullish   = count("BULLISH");
  const bearish   = count("BEARISH");
  const conflicted = count("CONFLICTED");
  const quiet     = count("NO_VOCABULARY");
  // Not folded into any of the above. See H1 in the note.
  const unread    = news.filter(n => n.lean === null).length;

  // §Silence Is A Feature. No headlines is not a calm feed; it is no feed.
  if (news.length === 0) return null;

  const LINES: readonly (readonly [string, number, string])[] = [
    ["lean bullish", bullish, "More bullish than bearish keywords matched."],
    ["lean bearish", bearish, "More bearish than bullish keywords matched."],
    ["say both", conflicted, "Bullish AND bearish keywords matched — the headline argues with itself."],
    ["say neither", quiet, "Read, and no sentiment keywords matched. Not a neutral reading — no reading."],
    ["unread", unread, "The house could not read these headlines at all."],
  ];

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-wm-dark border-b border-wm-border shrink-0">
      <div className="flex items-center gap-2">
        <Brain size={13} style={{ color: WM.text.muted }} />
        <span className="text-[10px] font-semibold text-wm-text-muted uppercase tracking-wider">
          Headline keyword lean
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap" data-testid="news-feed-tally">
        {LINES.filter(([, n]) => n > 0).map(([word, n, why]) => (
          <span
            key={word}
            className="text-[10px]"
            style={{ color: WM.text.body }}
            title={why}
          >
            <span style={{ color: WM.text.hero }}>{n}</span> {word}
          </span>
        ))}
        <span className="text-[10px]" style={{ color: WM.text.muted }}>
          of {news.length} headlines
        </span>
      </div>

      <span
        className="ml-auto text-[9px] italic"
        style={{ color: WM.text.muted }}
        title="The word lists include 'lead', 'clear', 'top', 'signal' and 'narrow', all of which appear innocently in headlines."
      >
        keyword tally over the headline text — not a prediction
      </span>
    </div>
  );
}

/* ── Constants ──────────────────────────────────────────── */
const SOURCES = [
  "All Sources", "Bloomberg", "Reuters", "WSJ", "MarketWatch",
  "X / Twitter", "WatcherGuru", "TipRanks", "CoinDesk", "Benzinga",
  "Seeking Alpha", "Truth Social", "SEC Filing",
];
/*
  "Neutral" became "Says both".

  The old filter promised one thing and delivered two: `label === "Neutral"`
  matched headlines the scorer found NOTHING in and headlines it found BOTH in,
  because the score landed near 50 either way. A trader filtering for Neutral
  got a pile of quiet regulatory filings with the genuinely conflicted headlines
  buried among them — and the conflicted ones were the only reason to look.

  Those are now separate directions, and the filter names the useful one.
*/
const FILTERS = ["All", "Breaking", "High Impact", "Bullish", "Bearish", "Says both", "Macro", "Crypto", "Earnings", "Whales"];

/* Case-insensitive, substring-tolerant source match so a filter button like
   "X / Twitter" or "WSJ" still matches feed values like "twitter.com" or
   "The Wall Street Journal". */
function sourceMatches(source: string, filter: string): boolean {
  const s = source.toLowerCase();
  const f = filter.toLowerCase();
  if (s === f || s.includes(f) || f.includes(s)) return true;
  const aliases: Record<string, string[]> = {
    "wsj": ["wall street", "wsj"],
    "x / twitter": ["twitter", "x.com", "@"],
    "sec filing": ["sec", "filing", "edgar"],
    "marketwatch": ["marketwatch", "market watch"],
    "seeking alpha": ["seeking", "alpha"],
    "truth social": ["truth"],
    "coindesk": ["coindesk", "coin desk"],
  };
  return (aliases[f] ?? []).some(a => s.includes(a));
}

/* ── Live stream channel config ─────────────────────────── */
const LIVE_STREAMS = [
  { label:"Stocked Up",    icon:"📊", color:"#00D4AA", channelId:"UC0jLMq-d_xJOQWZfemiJ0Pg", fallback:"https://www.youtube.com/@StockedUp/videos" },
  { label:"Bloomberg TV",  icon:"🔵", color:"#1DA1F2", channelId:"UCrM7B7SL_g1edFOnmj-SDKg", fallback:"https://www.bloomberg.com/live" },
  { label:"Yahoo Finance", icon:"📈", color:"#720e9e", channelId:"UCEAZeUIeJs0IjQiqTCdVSIg", fallback:"https://finance.yahoo.com/live" },
  { label:"CNBC",          icon:"💹", color:"#005594", channelId:"UCvJJ_dzjViJCoLf5uKUTwoA", fallback:"https://www.cnbc.com/live-tv/" },
  { label:"Fox Business",  icon:"🦊", color:"#c8102e", channelId:"UC7_YxT-KID8kRbqZo7MyscQ", fallback:"https://www.foxbusiness.com/live" },
];

const STOCKED_UP_CHANNEL = "UC0jLMq-d_xJOQWZfemiJ0Pg";

interface RecentVideo { videoId: string; title: string; published: string; thumbnail: string; }

/* ── Live News Player ───────────────────────────────────── */
function LiveNewsPlayer() {
  const [activeIdx,     setActiveIdx]     = useState(0);
  const [minimized,     setMinimized]     = useState(false);
  const [videoIds,      setVideoIds]      = useState<Record<string, string | null>>({});
  const [loadingIds,    setLoadingIds]    = useState(true);
  // A failed check is UNKNOWN, not "offline" (garden pass 2026-10-04).
  const [idsFailed,     setIdsFailed]     = useState(false);
  const [muted,         setMuted]         = useState(true);
  const [recentVideos,  setRecentVideos]  = useState<RecentVideo[]>([]);
  const [selectedRecent,setSelectedRecent]= useState<string | null>(null);

  useEffect(() => {
    const allChannels = LIVE_STREAMS.map(s => s.channelId).join(",");
    async function fetchIds() {
      setLoadingIds(true);
      try {
        const res  = await fetch(`/api/youtube-live?channels=${allChannels}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json() as Record<string, string | null>;
        setVideoIds(data);
        setIdsFailed(false);
      } catch { setIdsFailed(true); /* keep previous answers; unknown ones say so */ }
      finally { setLoadingIds(false); }
    }
    fetchIds();
    const id = setInterval(fetchIds, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch Stocked Up recent videos
  useEffect(() => {
    fetch(`/api/youtube-recent?channelId=${STOCKED_UP_CHANNEL}&days=5`)
      .then(r => r.json()).then(setRecentVideos).catch(() => {});
  }, []);

  const stream   = LIVE_STREAMS[activeIdx];
  const liveId   = videoIds[stream.channelId];
  // For Stocked Up: if not live but a recent video is selected, show that
  const videoId  = liveId ?? (stream.channelId === STOCKED_UP_CHANNEL && selectedRecent ? selectedRecent : null);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&modestbranding=1&iv_load_policy=3`
    : null;
  const isStockedUpOffline = stream.channelId === STOCKED_UP_CHANNEL && !liveId;

  return (
    <div className="shrink-0 border-b border-wm-border bg-wm-dark" style={{ height: minimized ? 36 : 300 }}>
      {/* Header */}
      {/*
        PHONE REACHABILITY. This bar was a plain `flex` with no wrap and no
        scroll. At 390px the stream rail pushed Mute and Minimize past the
        viewport edge and there was no gesture that brought them back — the
        controls were not small or awkward, they were GONE. The rail is the
        part that should give way, so it scrolls; the controls are pinned with
        `shrink-0` so they cannot be pushed out again. `min-w-0` is what
        actually permits the scroll: without it a flex child refuses to shrink
        below its content and overflows the parent instead.
      */}
      <div className="flex items-center gap-2 px-3 min-h-9 border-b border-wm-border shrink-0">
        {/* LIVE only when a channel is actually live now (garden pass
            2026-10-04: a pulsing "LIVE NEWS" showed while loading, with every
            channel offline, and when the check itself failed). */}
        {Object.values(videoIds).some(Boolean) ? <>
          <span className="w-1.5 h-1.5 rounded-full bg-wm-red animate-pulse shrink-0" />
          <span className="text-[10px] font-black text-wm-red uppercase tracking-wider shrink-0">LIVE NEWS</span>
        </> : (
          <span className="text-[10px] font-black text-wm-text-muted uppercase tracking-wider shrink-0">{loadingIds ? "NEWS · CHECKING" : idsFailed ? "NEWS · STATUS UNKNOWN" : "NEWS · NONE LIVE"}</span>
        )}
        <div className="flex gap-1 ml-2 min-w-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {LIVE_STREAMS.map((s, i) => (
            <button key={s.label} onClick={() => setActiveIdx(i)} aria-pressed={activeIdx === i}
              className={clsx(
                "flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold transition-all border shrink-0 whitespace-nowrap",
                activeIdx === i
                  ? "bg-wm-red/20 text-wm-red border-wm-red/40"
                  : "text-wm-text-dim border-transparent hover:text-wm-text"
              )}>
              <span>{s.icon}</span> {s.label}
              {!loadingIds && videoIds[s.channelId] && (
                <span className="w-1 h-1 rounded-full bg-wm-red animate-pulse ml-0.5" />
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {embedUrl && (
            <button onClick={() => setMuted(m => !m)}
              className="text-[9px] text-wm-text-dim hover:text-wm-text px-2 py-0.5 rounded hover:bg-wm-surface transition-colors border border-wm-border/30">
              {muted ? "🔇 Unmute" : "🔊 Mute"}
            </button>
          )}
          <button onClick={() => setMinimized(m => !m)}
            className="text-[10px] text-wm-text-dim hover:text-wm-text px-2 py-0.5 rounded hover:bg-wm-surface transition-colors">
            {minimized ? "▲ Expand" : "▼ Minimize"}
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex" style={{ height: 261 }}>
          {/* Main video */}
          <div className="flex-1 relative bg-black">
            {loadingIds ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-2 animate-pulse">{stream.icon}</div>
                  <p className="text-[10px] text-wm-text-dim">Finding live stream…</p>
                </div>
              </div>
            ) : embedUrl ? (
              <iframe
                key={`${activeIdx}-${videoId}-${muted}`}
                src={embedUrl}
                className="w-full h-full"
                style={{ border: "none" }}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                title={stream.label}
              />
            ) : isStockedUpOffline && recentVideos.length > 0 ? (
              /*
                ONE OS: this pane no longer paints its own fill. It is one of
                three mutually exclusive contents of the video letterbox above,
                which is ALREADY `bg-black` — the honest surface for a video
                well. The `#0D1117` it used to carry was a second opinion about
                that surface, and a GitHub-dark one at that: not a WM token, one
                shade off the letterbox it sat inside, and full-extent, which is
                the exact shape the sanctuary law is written about.
              */
              <div className="w-full h-full flex flex-col">
                <div className="px-3 py-2 border-b border-wm-border/40 flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-black text-wm-green uppercase tracking-wider">📊 Stocked Up — Recent Videos (Last 5 Days)</span>
                </div>
                {/* Rows are max-content: inside this fixed-height well the auto rows were
                    squeezed to 66px, so each card showed a 66px sliver of its
                    thumbnail and no title (serving /news at 1440, 2026-10-07).
                    Wider wells carry more columns so a card stays well-sized. */}
                <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 content-start" style={{ scrollbarWidth:"thin", gridAutoRows:"max-content" }}>
                  {recentVideos.map(v => (
                    <button key={v.videoId} onClick={() => setSelectedRecent(v.videoId)}
                      className="text-left rounded-lg overflow-hidden border border-wm-border/30 hover:border-wm-green/40 transition-all group">
                      <div className="relative" style={{ paddingTop:"56.25%" }}>
                        <img src={v.thumbnail} alt={v.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-wm-green/90 flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="white"><path d="M2 1L9 5L2 9V1Z"/></svg>
                          </div>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <p className="text-[9px] font-semibold text-wm-text leading-tight line-clamp-2">{v.title}</p>
                        <p className="text-[9px] text-wm-text-dim mt-0.5">{new Date(v.published).toLocaleDateString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /*
                Same letterbox, same cure. This is the "Not live right now"
                state, and it used to fill itself with a 135° gradient between
                two near-black stops. A gradient does not exempt a slab: both
                ends were opaque and near-black, so the result was a full-extent
                plane with a soft edge sitting on top of an already-black video
                well. The icon and the two lines of copy are the content; the
                well underneath is the surface.
              */
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">{stream.icon}</span>
                <div className="text-center">
                  <p className="text-sm font-bold text-wm-text">{stream.label}</p>
                  <p className="text-[10px] text-wm-text-dim mt-1">Not live right now</p>
                </div>
                <a href={stream.fallback} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-wm-border text-wm-text-muted hover:text-wm-text transition-all">
                  <ExternalLink size={10} /> Watch on {stream.label}
                </a>
              </div>
            )}
          </div>

          {/* Channel picker sidebar */}
          <div className="w-28 shrink-0 border-l border-wm-border flex flex-col bg-wm-dark">
            {LIVE_STREAMS.map((s, i) => {
              const live = !!videoIds[s.channelId];
              return (
                <button key={s.label} onClick={() => setActiveIdx(i)}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-1 py-3 border-b border-wm-border/30 transition-all flex-1",
                    activeIdx === i ? "bg-wm-surface" : "hover:bg-wm-surface/50"
                  )}>
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[9px] font-bold text-wm-text text-center leading-tight px-1">{s.label}</span>
                  {!loadingIds && (
                    <span className={clsx(
                      "text-[9px] font-bold px-1 py-0.5 rounded",
                      live ? "bg-wm-red/20 text-wm-red" : "text-wm-text-dim"
                    )}>
                      {live ? "● LIVE" : idsFailed && !(s.channelId in videoIds) ? "unknown" : "offline"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Connect API Keys modal ─────────────────────────────────
   Users paste their OWN keys here. Stored locally in the browser
   (localStorage `wm_api_keys`) and sent only to this app's own
   /api/news-rss proxy. We never see, log, or transmit them anywhere
   else. NewsAPI.org (free 100 req/day) unlocks full WSJ / Bloomberg /
   Reuters / etc.; an X (Twitter) Bearer token unlocks raw cashtag
   timelines. */
function ApiKeysModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const dlgRef = useRef<HTMLDivElement>(null);
  const [newsapi, setNewsapi] = useState("");
  const [xbearer, setXbearer] = useState("");

  useEffect(() => {
    if (!open) return;
    const k = readApiKeys();
    setNewsapi(k.newsapi || "");
    setXbearer(k.xbearer || "");
  }, [open]);

  if (!open) return null;

  const save = () => {
    const payload: ApiKeys = {};
    if (newsapi.trim()) payload.newsapi = newsapi.trim();
    if (xbearer.trim()) payload.xbearer = xbearer.trim();
    localStorage.setItem("wm_api_keys", JSON.stringify(payload));
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        ref={dlgRef}
        className="w-full max-w-md rounded-2xl border border-wm-border bg-wm-dark p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <DialogBehaviour targetRef={dlgRef} label="Connect API keys" onClose={onClose} />
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-wm-text">Connect API Keys</h2>
          <button onClick={onClose} className="text-wm-text-dim hover:text-wm-text text-lg leading-none">×</button>
        </div>
        <p className="text-[11px] text-wm-text-muted leading-relaxed mb-4">
          Add your own keys to unlock personalized, full-text news. Keys are stored
          only in <span className="font-mono text-wm-text">this browser</span> and sent
          only to this app&apos;s own news proxy — never shared or logged.
        </p>

        <label className="block text-[11px] font-semibold text-wm-text-muted mb-1">
          NewsAPI.org key <span className="text-wm-text-dim font-normal">— unlocks WSJ, Bloomberg, Reuters &amp; more</span>
        </label>
        <input
          value={newsapi}
          onChange={e => setNewsapi(e.target.value)}
          type="password"
          placeholder="Paste your NewsAPI.org key"
          className="w-full mb-1 bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-[12px] text-wm-text outline-none focus:border-wm-gold/50"
        />
        <a href="https://newsapi.org/register" target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-wm-blue hover:underline">Get a free key (100 req/day) →</a>

        <label className="block text-[11px] font-semibold text-wm-text-muted mt-4 mb-1">
          X (Twitter) Bearer token <span className="text-wm-text-dim font-normal">— unlocks live X market chatter</span>
        </label>
        <input
          value={xbearer}
          onChange={e => setXbearer(e.target.value)}
          type="password"
          placeholder="Paste your X API Bearer token"
          className="w-full mb-1 bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-[12px] text-wm-text outline-none focus:border-wm-gold/50"
        />
        <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-wm-blue hover:underline">Get an X API token →</a>

        <div className="flex items-center gap-2 mt-5">
          <button onClick={save}
            className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold bg-wm-gold/20 text-wm-gold border border-wm-gold/40 hover:bg-wm-gold/30 transition-all">
            Save Keys
          </button>
          <button
            onClick={() => { localStorage.removeItem("wm_api_keys"); setNewsapi(""); setXbearer(""); onSaved(); }}
            className="px-3 py-2 rounded-lg text-[12px] font-semibold text-wm-text-muted border border-wm-border hover:text-wm-text transition-all">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  /*
    A ROOM WITH NO FEED SAYS SO, RATHER THAN STAYING SILENT.

    `compileFeedStanding` renders an unpublished standing as FEED UNKNOWN in
    the masthead and SOURCE UNKNOWN in the provenance footer. That is the right
    reading for a room that has not spoken yet. It is the WRONG reading for a
    room with no market pipeline of any kind: it prints an open question about
    a feed that does not exist, and sends a reader to diagnose nothing.

    Silence is only earned by a POSITIVE declaration — silence and "I have
    nothing to report" look identical in the source and mean opposite things on
    the screen. Hence one line per room rather than a heuristic.
  */
  usePublishOsStanding({ surface: "News", feed: FEEDLESS_SURFACE });

  const [showKeys,     setShowKeys]     = useState(false);
  const [news,         setNews]         = useState<NewsItem[]>([]);
  // The ages tick: they were written once at fetch, so with auto-refresh off
  // (or a refresh that brought nothing) "JUST NOW" stayed forever (garden
  // pass 2026-10-05, SPOILED_STOCK).
  const [clockMs, setClockMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClockMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const [showSetAside, setShowSetAside] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [tagFilter,    setTagFilter]    = useState("All");
  const [search,       setSearch]       = useState("");
  const [liveMode,     setLiveMode]     = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [feedsDown,    setFeedsDown]    = useState(false);
  const [expandedId,   setExpandedId]   = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const { setActiveSymbol } = useActiveSymbol();
  // Garden 18 §VIII: the chart's NEWS / RESEARCH entry lands here scoped to its instrument (?q=SYMBOL).
  // A catalogued instrument also becomes the room's symbol, so the Chart
  // Companion beside the feed reads the same market (2026-10-02: ?q=TSLA
  // showed NQ1! in the companion). Free text ("Fed") never moves the symbol.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    setSearch(q);
    const up = q.trim().toUpperCase();
    if (matchCuratedSymbols(up, 1)[0]?.sym.toUpperCase() === up) setActiveSymbol(up);
  }, [setActiveSymbol]);
  const goToChart = useCallback((sym: string) => {
    if (!sym || sym === "MARKET") return;
    setActiveSymbol(sym);
    router.push(`/charts?symbol=${encodeURIComponent(sym)}`);
  }, [setActiveSymbol, router]);

  /* Fetch real news from Finnhub on mount + every 2 minutes */
  const loadNews = useCallback(async () => {
    const real = await fetchFinnhubNews(first => { setNews(first); setLoading(false); });
    if (real.length > 0) {
      setNews(real);
      setFeedsDown(false);
    } else {
      // Every wire answered nothing (garden pass 2026-10-04: the skeletons
      // pulsed forever and the empty state could never appear). Say so; the
      // two-minute refresh keeps trying.
      setFeedsDown(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  useEffect(() => {
    if (!liveMode) return;
    const interval = setInterval(loadNews, 120_000); // refresh every 2 min only when AUTO-REFRESH is on
    return () => clearInterval(interval);
  }, [liveMode, loadNews]);

  // ALWAYS show the full curated source list (user requirement: restore every
  // source, never silently drop a publisher). We still append any live feed
  // sources that aren't covered by a curated label so nothing is missed.
  const liveSources = Array.from(new Set(news.map(n => n.source).filter(Boolean)));
  const extras = liveSources.filter(ls => !SOURCES.some(c => c !== "All Sources" && sourceMatches(ls, c)));
  const sourceButtons = [...SOURCES, ...extras];
  // Track which curated sources actually have ≥1 live article, so we can dim
  // (not remove) the ones the free feed isn't currently carrying.
  const sourcesWithArticles = new Set(
    SOURCES.filter(c => c === "All Sources" || news.some(n => sourceMatches(n.source, c)))
  );

  // §XCIII: personal-advice columns are set aside by default — counted, one tap back.
  const setAside = news.filter(n => isPersonalAdviceColumn(n)).length;
  const searchTerms = useMemo(() => newsTermsFor(search), [search]);
  const filtered = news.filter(n => {
    if (!showSetAside && isPersonalAdviceColumn(n)) return false;
    if (sourceFilter !== "All Sources" && !sourceMatches(n.source, sourceFilter)) return false;
    if (tagFilter === "Breaking"   && !n.breaking)                    return false;
    if (tagFilter === "High Impact"&& n.impact !== "high")            return false;
    if (tagFilter === "Bullish"    && n.lean?.direction !== "BULLISH")    return false;
    if (tagFilter === "Bearish"    && n.lean?.direction !== "BEARISH")    return false;
    if (tagFilter === "Says both"  && n.lean?.direction !== "CONFLICTED") return false;
    if (tagFilter === "Macro"      && !n.tags.includes("Macro"))      return false;
    if (tagFilter === "Crypto"     && !["BTC","ETH","SOL","Crypto"].some(t => n.tags.includes(t) || n.sym === t)) return false;
    if (tagFilter === "Earnings"   && !n.tags.includes("Earnings"))   return false;
    if (tagFilter === "Whales"     && !n.tags.includes("Whale"))      return false;
    // The instrument's NAMES, not just the typed text (2026-10-02: ?q=TSLA
    // matched no "Tesla" headline; NQ1! matched nothing). Free text still
    // matches as typed.
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) &&
        !n.sym.toLowerCase().includes(search.toLowerCase()) &&
        !n.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) &&
        !headlineNames(searchTerms, n.title, n.sym, n.tags)) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <ApiKeysModal open={showKeys} onClose={() => setShowKeys(false)} onSaved={loadNews} />

      {/* ── Topbar ── WM atmosphere: warm-gold hairline, serif hero,
           tabular indicator. Belongs to the same OS as /command-deck
           and /nectar. ─────────────────────────────────────────── */}
      {/*
        PHONE REACHABILITY (the other half of the same defect as the LIVE NEWS
        bar above). This topbar was a single non-wrapping flex row holding the
        identity block, a fixed `w-40` search field and an `ml-auto` action
        group. At 390px the search field and the whole action group — AUTO
        REFRESH, Connect API Keys, every source filter — were cut off by the
        viewport edge with no scroll and no wrap to bring them back.

        The cure is `flex-wrap`: this bar has a `minHeight`, not a fixed
        height, so it is allowed to become two lines on a narrow screen where
        the LIVE NEWS bar (fixed 300px parent) was not. The search field
        becomes `min-w-0` + `flex-1` so it gives up width instead of forcing
        overflow, and the action group wraps rather than being pushed off.
      */}
      <div
        className="flex flex-wrap items-center gap-y-2 gap-3 px-4 py-1.5 shrink-0"
        style={{
          minHeight: 44,
          borderBottom: "1px solid rgba(139,106,41,0.15)",
          background: "linear-gradient(180deg, #0b0b0d 0%, rgba(11,11,13,0.6) 100%)",
        }}
      >
        <div className="flex items-center gap-3 shrink-0">
          <span
            aria-hidden="true"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 12, letterSpacing: 0.32,
              color: WM.gold.mark,
              textTransform: "uppercase",
              fontWeight: 400,
            }}
          >
            WM
          </span>
          <div style={{ width: 1, height: 16, background: "rgba(139,106,41,0.35)" }} aria-hidden="true" />
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 14, fontWeight: 400,
              color: WM.text.hero, letterSpacing: -0.1,
              margin: 0,
            }}
          >
            Market Intelligence
          </h1>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 8px", borderRadius: 999,
              border: "1px solid rgba(92,184,92,0.35)",
              background: "rgba(92,184,92,0.08)",
              color: WM.state.ok,
              fontSize: 9, letterSpacing: 0.32, fontWeight: 800,
              textTransform: "uppercase",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {/* Was an unconditional pulsing "LIVE · Sentiment": the wires poll
                every 2 min only with AUTO-REFRESH on, and the lean is a headline
                word tally, not a sentiment model (2026-10-04). */}
            <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 999, background: liveMode ? WM.state.ok : WM.text.muted }} className={liveMode ? "animate-pulse" : undefined} />
            {liveMode ? "Refreshing · every 2 min" : "Headline word lean"}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-wm-surface border border-wm-border rounded-lg px-2 py-1 min-w-0 flex-1 basis-40">
          <Search size={11} className="text-wm-text-dim shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search news and symbols"
            placeholder="Search news, symbols..."
            className="bg-transparent text-[11px] text-wm-text outline-none w-full min-w-0 placeholder-wm-text-dim"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button
            onClick={() => setLiveMode(l => !l)}
            className={clsx(
              "flex items-center gap-1 px-2 h-6 rounded text-[10px] font-semibold border transition-all",
              liveMode
                ? "bg-wm-green/15 text-wm-green border-wm-green/40"
                : "bg-wm-surface border-wm-border text-wm-text-muted"
            )}
          >
            <Zap size={10} /> {liveMode ? "AUTO-REFRESH" : "PAUSED"}
          </button>

          <button
            onClick={() => setShowKeys(true)}
            className="flex items-center gap-1 px-2 h-6 rounded text-[10px] font-semibold border border-wm-gold/40 bg-wm-gold/10 text-wm-gold hover:bg-wm-gold/20 transition-all"
          >
            🔑 Connect API Keys
          </button>

          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTagFilter(f)}
              aria-pressed={tagFilter === f}
              className={clsx(
                "px-2 py-1 rounded text-[10px] font-medium transition-all",
                tagFilter === f
                  // Canon sweep 2026-10-06: the house selected state (gold), as
                  // the source row below already wears — not a lone blue.
                  ? "bg-wm-gold/15 text-wm-gold border border-wm-gold/30"
                  : "text-wm-text-muted hover:text-wm-text"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Sentiment Overview ───────────────────────────── */}
      <FeedLeanTally news={news} />

      {/* ── Source filter ───────────────────────────────────── */}
      <div className="flex gap-1.5 px-4 py-2 border-b border-wm-border overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
        {sourceButtons.map(s => {
          const hasArticles = sourcesWithArticles.has(s) || !SOURCES.includes(s);
          // Sources that a user API key can unlock (NewsAPI or X token).
          const keyUnlockable = ["WSJ", "Bloomberg", "Reuters", "X / Twitter", "TipRanks"].includes(s);
          return (
            <button
              key={s}
              onClick={() => hasArticles ? setSourceFilter(s) : setShowKeys(true)}
              aria-pressed={hasArticles ? sourceFilter === s : undefined}
              title={hasArticles ? undefined : keyUnlockable ? `Connect your API key to unlock ${s}` : `Limited access — no live ${s} articles right now`}
              className={clsx(
                "px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all border shrink-0 flex items-center gap-1",
                sourceFilter === s
                  ? "bg-wm-gold/15 text-wm-gold border-wm-gold/30"
                  : hasArticles
                    ? "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-text"
                    : "bg-wm-surface/40 border-wm-border/40 text-wm-text-dim hover:text-wm-text-muted"
              )}
            >
              {s}
              {hasArticles && s !== "All Sources" && (
                <span className="w-1 h-1 rounded-full bg-wm-green" />
              )}
              {!hasArticles && keyUnlockable && (
                <span className="text-[9px]" title="Connect API key">🔑</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Live News Video Player ──────────────────────────── */}
      <LiveNewsPlayer />

      {/* ── News feed + FL-04 Chart Companion ─────────────────
           The Companion is the plate-mandated right column that holds
           the SAME decision camera as /charts (symbol, price owner,
           canvas verdict, session truth) so leaving the chart for the
           news room never drops the market. It renders nothing below
           lg — MobileSessionPill already owns the camera on phones. */}
      <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl border border-wm-border bg-wm-dark p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-wm-surface shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-wm-surface rounded w-3/4" />
                    <div className="h-2 bg-wm-surface rounded w-full" />
                    <div className="h-2 bg-wm-surface rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && setAside > 0 ? (
          <button type="button" data-testid="news-set-aside" onClick={() => setShowSetAside(v => !v)}
            className="mx-3 my-1 self-start rounded border border-wm-border px-2 py-0.5 text-[10px] text-wm-text-dim hover:text-wm-text">
            {showSetAside ? `Hide ${setAside} personal-finance column${setAside === 1 ? "" : "s"}` : `${setAside} personal-finance column${setAside === 1 ? "" : "s"} set aside — not market news · show`}
          </button>
        ) : null}
        <AnimatePresence initial={false}>
          {!loading && filtered.map((item, idx) => {
            /*
              §9. THE ROW STOPPED TAKING A SIDE.

              `sentColor` was green for bullish and red for bearish, and it was
              spent THREE times on every card: a 3px left border, a background
              heat gradient, and the direction chip. A keyword tally decided how
              a whole card looked, and green told the reader a bullish headline
              was the good kind.

              It is now one ivory hairline on every row. Direction is carried by
              the band, where it is read from WHICH SIDE has more marks — a fact
              about the picture that no colourblind reader is cut out of, and
              one that cannot imply approval.
            */
            const DIRECTION_WORD: Record<HeadlineLean["direction"], string> = {
              BULLISH: "leans bullish",
              BEARISH: "leans bearish",
              CONFLICTED: "says both",
              NO_VOCABULARY: "says neither",
            };

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.18, delay: idx * 0.02 }}
              >
                <div role="button" tabIndex={0} onKeyDown={keyActivates}
                  className="glass rounded-xl p-4 hover:border-wm-border/80 transition-all cursor-pointer group relative overflow-hidden"
                  style={{ borderLeft: "3px solid rgba(237,230,211,0.18)" }}
                  onClick={() => setExpandedId(id => id === item.id ? null : item.id)}
                >
                  {/*
                    The background heat gradient is GONE, not recoloured. It was
                    the third spend of one keyword tally on a single card, and a
                    card that is tinted by its own reading has had the reading
                    made for it before it is read.
                  */}

                  {/* Breaking badge */}
                  {item.breaking && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-wm-red/20 border border-wm-red/40 text-wm-red text-[9px] font-black uppercase tracking-wider">
                        <AlertCircle size={8} /> BREAKING
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="text-xl shrink-0">{item.sourceIcon}</div>
                    <div className="flex-1 min-w-0">
                      {/* Meta row */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/*
                          EDITORIAL BYLINE (house pass 2026-10-10). A wire row
                          names WHO said it and WHEN, as an instant every reader
                          shares: the wall-clock stamp carries its zone (and its
                          date once it is not today) through the one time owner,
                          `dayAwareStamp`. "12m ago" alone could not be checked
                          against a chart, a calendar print or another desk.
                        */}
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: WM.text.body }} data-testid="news-row-source">{item.source}</span>
                        <time
                          dateTime={new Date(item.publishedMs).toISOString()}
                          className="text-[10px] tabular-nums"
                          style={{ color: WM.text.muted }}
                          data-testid="news-row-stamp"
                        >
                          {dayAwareStamp(item.publishedMs, clockMs)} · {ageLabel(item.publishedMs, clockMs)}
                        </time>
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                          item.impact === "high"   ? "bg-wm-red/20 text-wm-red" :
                          item.impact === "medium" ? "bg-wm-gold/15 text-wm-gold" :
                          "bg-wm-surface text-wm-text-dim"
                        )} data-testid="news-row-impact">
                          {item.impact} impact
                        </span>
                        {/*
                          No arrow and no hue. An arrow is a direction the HOUSE
                          is pointing; the word says which way the SENTENCE
                          leaned, and the band beside it shows by how little.
                          A headline that was never read gets no chip at all.
                        */}
                        {item.lean && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ color: WM.text.body, background: "rgba(192,184,160,0.10)" }}
                          >
                            {DIRECTION_WORD[item.lean.direction]}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-wm-surface text-wm-blue text-[10px] font-mono font-bold">
                          {item.sym}
                        </span>
                        <span className="ml-auto text-[9px] text-wm-text-dim">
                          {expandedId === item.id ? "▲ Collapse" : "▼ Expand"}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-wm-text leading-snug mb-1 group-hover:text-white transition-colors">
                        {item.title}
                      </h3>

                      {/* Summary — always show a snippet; full text when expanded */}
                      <p className="text-xs text-wm-text-muted leading-relaxed">
                        {expandedId === item.id
                          ? item.summary
                          : item.summary.length > 160
                            ? item.summary.slice(0, 160) + "…"
                            : item.summary}
                      </p>

                      {/* Expanded: read more link */}
                      {expandedId === item.id && item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 mt-2 text-[10px] text-wm-blue hover:underline font-semibold"
                        >
                          Read full article <ExternalLink size={9} />
                        </a>
                      )}

                      {/* Which way the headline leaned — a tally, drawn outward
                          from a centre. Null lean draws nothing at all. */}
                      <div className="mt-1.5">
                        <HeadlineLeanBand lean={item.lean} testId={`news-lean-${item.id}`} />
                      </div>

                      {/* Tags + confidence */}
                      <div className="flex items-center gap-2 mt-2">
                        {item.tags.slice(0, 4).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-wm-surface border border-wm-border text-[9px] text-wm-text-dim">
                            #{t}
                          </span>
                        ))}
                        {/*
                          The keyword count USED to be restated here, beside the
                          bar that already drew it. Two printings of one tally is
                          how two tallies eventually appear. It is said once now,
                          by the band — in its tooltip and to a screen reader —
                          together with the disclaimer that it is a keyword match
                          and not a prediction.
                        */}
                        <span className="ml-auto" />
                        {item.sym && item.sym !== "MARKET" && (
                          <button
                            onClick={e => { e.stopPropagation(); goToChart(item.sym); }}
                            className="ml-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-wm-blue/15 text-wm-blue border border-wm-blue/30 hover:bg-wm-blue/25 transition-all"
                          >
                            <BarChart2 size={8} /> {item.sym}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Filter size={32} className="text-wm-text-dim mb-3" />
            <p className="text-sm text-wm-text-muted">
              {feedsDown && news.length === 0
                ? "The news wires did not answer just now. This room checks again every two minutes."
                : search
                ? `No headline in the last ${news.length} names ${search}${searchTerms.words.length ? ` (${searchTerms.words.slice(0, 2).join(", ")})` : ""} right now.`
                : "No news matches your filters."}
            </p>
            <button
              onClick={() => { setTagFilter("All"); setSourceFilter("All Sources"); setSearch(""); }}
              className="mt-3 text-xs text-wm-blue hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      <ChartCompanion />
      </div>
    </div>
  );
}
