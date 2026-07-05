"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import {
  TrendingUp, TrendingDown, Minus, ExternalLink, Filter,
  Brain, BarChart2, AlertCircle, Zap, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

/* ── Types ─────────────────────────────────────────────── */
interface NewsItem {
  id:        number;
  time:      string;
  ageMs:     number;
  source:    string;
  sourceIcon:string;
  sym:       string;
  impact:    "high" | "medium" | "low";
  bullish:   boolean | null;
  title:     string;
  summary:   string;
  url?:      string;
  tags:      string[];
  sentiment: { score: number; label: "Bullish" | "Bearish" | "Neutral"; confidence: number };
  breaking?: boolean;
}

/* ── Real Finnhub news fetcher ───────────────────────────── */
const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";

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

const BULLISH_WORDS = ["surge", "beat", "upgrade", "raised", "rally", "accelerating", "record", "inflow", "positive", "lead", "clear", "strong", "gains", "jumps", "rises", "top", "growth", "bullish"];
const BEARISH_WORDS = ["drop", "fall", "concern", "underperform", "correction", "distribution", "weaken", "negative", "narrow", "signal", "declines", "falls", "losses", "crash", "warning", "bearish"];

function detectBullish(text: string): boolean | null {
  const lower = text.toLowerCase();
  const bull = BULLISH_WORDS.filter(w => lower.includes(w)).length;
  const bear = BEARISH_WORDS.filter(w => lower.includes(w)).length;
  if (bull > bear + 1) return true;
  if (bear > bull + 1) return false;
  return null;
}

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

async function fetchFinnhubNews(): Promise<NewsItem[]> {
  try {
    const keys = readApiKeys();
    const rssHeaders: Record<string, string> = {};
    if (keys.newsapi) rssHeaders["x-newsapi-key"] = keys.newsapi;
    if (keys.xbearer) rssHeaders["x-x-bearer"]    = keys.xbearer;
    // Finnhub's "general" feed only carries Reuters/CNBC/Bloomberg. Pulling the
    // other categories (crypto, forex, merger) brings in CoinDesk, MarketWatch,
    // SEC-style filings and more, so the source filter actually has data to show.
    const cats = ["general", "crypto", "forex", "merger"];
    const [finnhubArrs, rssRaw] = await Promise.all([
      Promise.all(
        cats.map(c =>
          fetch(`https://finnhub.io/api/v1/news?category=${c}&token=${FINNHUB_KEY}`, { cache: "no-store" })
            .then(r => (r.ok ? r.json() : []))
            .catch(() => [])
        )
      ),
      // Real publisher RSS feeds (WSJ, MarketWatch, CNBC, CoinDesk, Seeking
      // Alpha, Benzinga, WatcherGuru, SEC, Reuters, Bloomberg) so every curated
      // source button actually loads live content, not just the Finnhub wires.
      fetch(`/api/news-rss`, { cache: "no-store", headers: rssHeaders })
        .then(r => (r.ok ? r.json() : { items: [] }))
        .then((j: { items?: { id: string; source: string; headline: string; summary: string; url: string; datetime: number }[] }) =>
          (j.items ?? []).map(it => ({
            id: it.id, datetime: it.datetime, headline: it.headline,
            summary: it.summary, source: it.source, related: "", category: "", image: "", url: it.url,
          }) as unknown as FinnhubRaw))
        .catch(() => [] as FinnhubRaw[]),
    ]);

    // Merge Finnhub + RSS, dedupe by id (fall back to url/headline).
    const seen = new Set<string>();
    const raw: FinnhubRaw[] = [];
    for (const arr of [...(finnhubArrs as FinnhubRaw[][]), rssRaw]) {
      for (const item of arr) {
        const key = String(item.id || item.url || item.headline);
        if (seen.has(key)) continue;
        seen.add(key);
        raw.push(item);
      }
    }
    if (raw.length === 0) throw new Error("Finnhub news failed");
    raw.sort((a, b) => b.datetime - a.datetime);

    const now = Date.now();
    return raw.slice(0, 120).map((item, i) => {
      const ageMs = now - item.datetime * 1000;
      const ageMin = Math.floor(ageMs / 60_000);
      const ageHr  = Math.floor(ageMs / 3_600_000);
      const ageDay = Math.floor(ageMs / 86_400_000);
      const timeStr = ageMin < 1 ? "JUST NOW" : ageMin < 60 ? `${ageMin}m ago` : ageHr < 24 ? `${ageHr}h ago` : `${ageDay}d ago`;

      const bullish = detectBullish(`${item.headline} ${item.summary}`);
      const impact  = classifyImpact(item);
      const sym     = extractSymbol(item.related ?? "", item.headline);
      const base: Omit<NewsItem, "sentiment" | "ageMs"> = {
        id:         item.id || i,
        source:     item.source || "News",
        sourceIcon: getSourceIcon(item.source || ""),
        time:       timeStr,
        title:      item.headline,
        summary:    item.summary || item.headline,
        url:        item.url || undefined,
        sym,
        impact,
        bullish,
        tags:       detectTags(item),
        breaking:   impact === "high" && ageMin < 30,
      };
      return {
        ...base,
        ageMs,
        sentiment:  scoreSentiment(base),
      };
    }).sort((a, b) => a.ageMs - b.ageMs);
  } catch {
    return [];
  }
}

/* ── Fallback seed news (shown while real data loads) ─────── */
const BASE_NEWS: Omit<NewsItem, "sentiment" | "ageMs">[] = [
  {
    id: 1, time: "Loading...", source: "Finnhub", sourceIcon: "📡",
    sym: "MARKET", impact: "medium", bullish: null,
    title: "Loading real-time market news from Finnhub...",
    summary: "Fetching live news feed. This will update momentarily.",
    tags: [],
  },
  {
    id: 2, time: "Loading...", source: "Finnhub", sourceIcon: "📡",
    sym: "MARKET", impact: "low", bullish: null,
    title: "Connecting to Finnhub news API...",
    summary: "Real financial news will appear here shortly.",
    tags: [],
  },
];

/* ── Sentiment engine ───────────────────────────────────── */

function scoreSentiment(item: Omit<NewsItem, "sentiment" | "ageMs">): NewsItem["sentiment"] {
  const text  = `${item.title} ${item.summary}`.toLowerCase();
  let score   = 50; // neutral baseline

  for (const w of BULLISH_WORDS) if (text.includes(w)) score += 6;
  for (const w of BEARISH_WORDS) if (text.includes(w)) score -= 6;
  if (item.bullish === true)  score += 12;
  if (item.bullish === false) score -= 12;
  if (item.impact === "high") score = score > 50 ? Math.min(score + 5, 95) : Math.max(score - 5, 5);

  score = Math.max(5, Math.min(95, score));

  const label: "Bullish" | "Bearish" | "Neutral" =
    score >= 62 ? "Bullish" : score <= 38 ? "Bearish" : "Neutral";

  const confidence = 60 + Math.round(Math.abs(score - 50) * 0.8);

  return { score, label, confidence };
}

function hydrate(items: Omit<NewsItem, "sentiment" | "ageMs">[]): NewsItem[] {
  return items.map((item, i) => ({
    ...item,
    ageMs:     i * 3 * 60 * 1000,
    sentiment: scoreSentiment(item),
  }));
}

/* ── Sentiment gauge component ──────────────────────────── */
function SentimentBar({ score }: { score: number }) {
  const color = score >= 62 ? "#00D4AA" : score <= 38 ? "#FF4D6A" : "#F0B429";
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1 rounded-full bg-wm-surface overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[9px] font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

/* ── Market sentiment overview ──────────────────────────── */
function MarketSentimentPanel({ news }: { news: NewsItem[] }) {
  const avg = Math.round(news.reduce((s, n) => s + (n.sentiment?.score ?? 50), 0) / Math.max(1, news.length));
  const bullCount = news.filter(n => n.sentiment?.label === "Bullish").length;
  const bearCount = news.filter(n => n.sentiment?.label === "Bearish").length;
  const neutCount = news.length - bullCount - bearCount;

  const color = avg >= 62 ? "#00D4AA" : avg <= 38 ? "#FF4D6A" : "#F0B429";
  const label = avg >= 62 ? "Bullish" : avg <= 38 ? "Bearish" : "Neutral";

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-wm-dark border-b border-wm-border shrink-0">
      <div className="flex items-center gap-2">
        <Brain size={13} style={{ color }} />
        <span className="text-[10px] font-semibold text-wm-text-muted uppercase tracking-wider">Sentiment Score</span>
      </div>

      {/* Gauge */}
      <div className="flex items-center gap-2 bg-wm-surface rounded-lg px-3 py-1 border border-wm-border">
        <div className="relative w-24 h-2 rounded-full bg-gradient-to-r from-wm-red via-wm-gold to-wm-green">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-wm-dark shadow-lg transition-all duration-700"
            style={{ left: `${avg - 6}%`, background: color }}
          />
        </div>
        <span className="text-xs font-black" style={{ color }}>{label}</span>
        <span className="text-[10px] text-wm-text-dim">{avg}/100</span>
      </div>

      {/* Breakdown */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] text-wm-green">
          <TrendingUp size={10} /> {bullCount} Bullish
        </span>
        <span className="flex items-center gap-1 text-[10px] text-wm-text-muted">
          <Minus size={10} /> {neutCount} Neutral
        </span>
        <span className="flex items-center gap-1 text-[10px] text-wm-red">
          <TrendingDown size={10} /> {bearCount} Bearish
        </span>
      </div>

      {/* Symbol heat chips */}
      <div className="flex items-center gap-1.5 ml-auto">
        {["NQ1!", "BTC", "NVDA", "TSLA", "ES1!"].map(sym => {
          const symNews = news.filter(n => n.sym === sym);
          if (!symNews.length) return null;
          const symAvg = Math.round(symNews.reduce((s, n) => s + (n.sentiment?.score ?? 50), 0) / symNews.length);
          const symColor = symAvg >= 62 ? "#00D4AA" : symAvg <= 38 ? "#FF4D6A" : "#F0B429";
          return (
            <div
              key={sym}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border"
              style={{ color: symColor, borderColor: `${symColor}40`, background: `${symColor}15` }}
            >
              {sym}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Constants ──────────────────────────────────────────── */
const SOURCES = [
  "All Sources", "Bloomberg", "Reuters", "WSJ", "MarketWatch",
  "X / Twitter", "WatcherGuru", "TipRanks", "CoinDesk", "Benzinga",
  "Seeking Alpha", "Truth Social", "SEC Filing",
];
const FILTERS = ["All", "Breaking", "High Impact", "Bullish", "Bearish", "Neutral", "Macro", "Crypto", "Earnings", "Whales"];

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
  const [muted,         setMuted]         = useState(true);
  const [recentVideos,  setRecentVideos]  = useState<RecentVideo[]>([]);
  const [selectedRecent,setSelectedRecent]= useState<string | null>(null);

  useEffect(() => {
    const allChannels = LIVE_STREAMS.map(s => s.channelId).join(",");
    async function fetchIds() {
      setLoadingIds(true);
      try {
        const res  = await fetch(`/api/youtube-live?channels=${allChannels}`, { cache: "no-store" });
        const data = await res.json() as Record<string, string | null>;
        setVideoIds(data);
      } catch { /* keep previous */ }
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
      <div className="flex items-center gap-2 px-3 h-9 border-b border-wm-border shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-wm-red animate-pulse" />
        <span className="text-[10px] font-black text-wm-red uppercase tracking-wider">LIVE NEWS</span>
        <div className="flex gap-1 ml-2">
          {LIVE_STREAMS.map((s, i) => (
            <button key={s.label} onClick={() => setActiveIdx(i)}
              className={clsx(
                "flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold transition-all border",
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
        <div className="ml-auto flex items-center gap-2">
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
              <div className="w-full h-full flex flex-col" style={{ background:"#0D1117" }}>
                <div className="px-3 py-2 border-b border-wm-border/40 flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-black text-wm-green uppercase tracking-wider">📊 Stocked Up — Recent Videos (Last 5 Days)</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 content-start" style={{ scrollbarWidth:"thin" }}>
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
                        <p className="text-[8px] text-wm-text-dim mt-0.5">{new Date(v.published).toLocaleDateString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3"
                style={{ background: "linear-gradient(135deg,#0D1117,#1C2128)" }}>
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
                  <span className="text-[8px] font-bold text-wm-text text-center leading-tight px-1">{s.label}</span>
                  {!loadingIds && (
                    <span className={clsx(
                      "text-[7px] font-bold px-1 py-0.5 rounded",
                      live ? "bg-wm-red/20 text-wm-red" : "text-wm-text-dim"
                    )}>
                      {live ? "● LIVE" : "offline"}
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
        className="w-full max-w-md rounded-2xl border border-wm-border bg-wm-dark p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
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
  const [showKeys,     setShowKeys]     = useState(false);
  const [news,         setNews]         = useState<NewsItem[]>([]);
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [tagFilter,    setTagFilter]    = useState("All");
  const [search,       setSearch]       = useState("");
  const [liveMode,     setLiveMode]     = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [expandedId,   setExpandedId]   = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const { setActiveSymbol } = useActiveSymbol();
  const goToChart = useCallback((sym: string) => {
    if (!sym || sym === "MARKET") return;
    setActiveSymbol(sym);
    router.push("/charts");
  }, [setActiveSymbol, router]);

  /* Fetch real news from Finnhub on mount + every 2 minutes */
  const loadNews = useCallback(async () => {
    const real = await fetchFinnhubNews();
    if (real.length > 0) {
      setNews(real);
      setLoading(false);
    }
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

  const filtered = news.filter(n => {
    if (sourceFilter !== "All Sources" && !sourceMatches(n.source, sourceFilter)) return false;
    if (tagFilter === "Breaking"   && !n.breaking)                    return false;
    if (tagFilter === "High Impact"&& n.impact !== "high")            return false;
    if (tagFilter === "Bullish"    && n.sentiment?.label !== "Bullish") return false;
    if (tagFilter === "Bearish"    && n.sentiment?.label !== "Bearish") return false;
    if (tagFilter === "Neutral"    && n.sentiment?.label !== "Neutral") return false;
    if (tagFilter === "Macro"      && !n.tags.includes("Macro"))      return false;
    if (tagFilter === "Crypto"     && !["BTC","ETH","SOL","Crypto"].some(t => n.tags.includes(t) || n.sym === t)) return false;
    if (tagFilter === "Earnings"   && !n.tags.includes("Earnings"))   return false;
    if (tagFilter === "Whales"     && !n.tags.includes("Whale"))      return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) &&
        !n.sym.toLowerCase().includes(search.toLowerCase()) &&
        !n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-wm-black overflow-hidden">

      <ApiKeysModal open={showKeys} onClose={() => setShowKeys(false)} onSaved={loadNews} />

      {/* ── Topbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-wm-border bg-wm-dark shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-wm-text">Market Intelligence</h1>
          <div className="flex items-center gap-1 text-[10px] text-wm-green">
            <span className="w-1.5 h-1.5 rounded-full bg-wm-green animate-pulse" />
            LIVE · Sentiment Score
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-wm-surface border border-wm-border rounded-lg px-2 py-1 ml-4">
          <Search size={11} className="text-wm-text-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search news, symbols..."
            className="bg-transparent text-[11px] text-wm-text outline-none w-40 placeholder-wm-text-dim"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
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
              className={clsx(
                "px-2 py-1 rounded text-[10px] font-medium transition-all",
                tagFilter === f
                  ? "bg-wm-blue/20 text-wm-blue border border-wm-blue/40"
                  : "text-wm-text-muted hover:text-wm-text"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Sentiment Overview ───────────────────────────── */}
      <MarketSentimentPanel news={news} />

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
                <span className="text-[8px]" title="Connect API key">🔑</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Live News Video Player ──────────────────────────── */}
      <LiveNewsPlayer />

      {/* ── News feed ───────────────────────────────────────── */}
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
        <AnimatePresence initial={false}>
          {!loading && filtered.map((item, idx) => {
            const sentColor =
              item.sentiment?.label === "Bullish" ? "#00D4AA" :
              item.sentiment?.label === "Bearish" ? "#FF4D6A" : "#F0B429";

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.18, delay: idx * 0.02 }}
              >
                <div
                  className="glass rounded-xl p-4 hover:border-wm-border/80 transition-all cursor-pointer group relative overflow-hidden"
                  style={{ borderLeft: `3px solid ${sentColor}60` }}
                  onClick={() => setExpandedId(id => id === item.id ? null : item.id)}
                >
                  {/* Subtle sentiment background heat */}
                  <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ background: `linear-gradient(90deg, ${sentColor}, transparent 40%)` }}
                  />

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
                        <span className="text-[10px] font-semibold text-wm-text-muted">{item.source}</span>
                        <span className="text-[10px] text-wm-text-dim">{item.time}</span>
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                          item.impact === "high"   ? "bg-wm-red/20 text-wm-red" :
                          item.impact === "medium" ? "bg-wm-gold/15 text-wm-gold" :
                          "bg-wm-surface text-wm-text-dim"
                        )}>
                          {item.impact}
                        </span>
                        <span
                          className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: sentColor, background: `${sentColor}15` }}
                        >
                          {item.sentiment?.label === "Bullish" ? <TrendingUp size={9} /> :
                           item.sentiment?.label === "Bearish" ? <TrendingDown size={9} /> : <Minus size={9} />}
                          {item.sentiment?.label}
                        </span>
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

                      {/* Sentiment bar */}
                      {item.sentiment && <SentimentBar score={item.sentiment.score} />}

                      {/* Tags + confidence */}
                      <div className="flex items-center gap-2 mt-2">
                        {item.tags.slice(0, 4).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-wm-surface border border-wm-border text-[9px] text-wm-text-dim">
                            #{t}
                          </span>
                        ))}
                        <span className="ml-auto flex items-center gap-1 text-[9px] text-wm-text-dim">
                          <Brain size={8} />
                          {item.sentiment?.confidence}% confidence
                        </span>
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
            <p className="text-sm text-wm-text-muted">No news matches your filters.</p>
            <button
              onClick={() => { setTagFilter("All"); setSourceFilter("All Sources"); setSearch(""); }}
              className="mt-3 text-xs text-wm-blue hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
