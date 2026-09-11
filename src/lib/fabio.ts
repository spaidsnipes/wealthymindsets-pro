/**
 * Fabio Insights — shared content module + context selector.
 *
 * PURPOSE
 * -------
 * Surfaces short, actionable trading-framework notes ("insights") in context
 * across the app (chart sidebar, journal, news, morning-prep) so the user gets
 * richer decision context in more than just the Education tab.
 *
 * HONESTY NOTE (read before shipping real content)
 * -------------------------------------------------
 * The entries below are CLEARLY-LABELED FRAMEWORK PLACEHOLDERS. They are generic,
 * widely-taught order-flow / smart-money principles (the same concepts the
 * Education modules already cover) — they are NOT transcribed statements, calls,
 * or predictions attributed to any specific real person. To ship Fabio's actual
 * material, replace `FABIO_INSIGHTS` below (or point `loadFabioInsights()` at a
 * real data source / CMS / API) and flip `FABIO_CONTENT_IS_PLACEHOLDER` to false.
 * The UI shows a banner while that flag is true so nothing here is ever mistaken
 * for verified proprietary content.
 */

import {
  classifySymbol,
  toYahooSymbol,
  type AssetClass,
} from "@/lib/marketData/symbolAssetClass";

export const FABIO_CONTENT_IS_PLACEHOLDER = true;

export type FabioCategory =
  | "Order Flow"
  | "Smart Money"
  | "Footprint / VP"
  | "CLC Rule"
  | "Risk"
  | "Psychology"
  | "Session Playbook";

export type FabioAssetClass = "stocks" | "crypto" | "futures" | "forex" | "metals" | "any";

export interface FabioInsight {
  id: string;
  category: FabioCategory;
  title: string;
  /** 1–3 sentence actionable note. Keep it tight — this renders in narrow panels. */
  body: string;
  /** Optional one-line "how to apply this right now". */
  action?: string;
  /** Symbols this is especially relevant to (empty = applies broadly). */
  symbols?: string[];
  /** Asset classes this applies to. */
  assets?: FabioAssetClass[];
  /** Market-regime tags (matches MarkovPanel-style regimes). */
  regimes?: Array<"trend-up" | "trend-down" | "range" | "reversal" | "any">;
  /** Indicator ids this pairs with (matches chart indicator ids where possible). */
  indicators?: string[];
  /** Short source/label shown as a chip. */
  source: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SEED CONTENT — framework placeholders (see honesty note above).
 * Derived from the app's own Education curriculum (Order Flow, Smart Money,
 * Footprint/VP, the CLC Rule). Replace with real Fabio material when available.
 * ──────────────────────────────────────────────────────────────────────────── */
export const FABIO_INSIGHTS: FabioInsight[] = [
  {
    id: "clc-core",
    category: "CLC Rule",
    title: "Context → Location → Confirmation",
    body: "Never take an entry on price alone. Confirm the regime (Context), that price is at a decision zone like PDL/VWAP/structure (Location), then wait for order-flow confirmation (Confirmation) — not just a candle close.",
    action: "Before this trade: can you name the Context, the Location, and the Confirmation? If any is missing, pass.",
    assets: ["any"],
    regimes: ["any"],
    indicators: ["vwap", "vp", "volumeProfile"],
    source: "CLC Framework",
  },
  {
    id: "of-absorption",
    category: "Smart Money",
    title: "Holding under pressure may be absorption",
    body: "When true bid/ask or order-book data shows repeated selling while price holds, the behavior can be consistent with passive absorption. Reappearing bids are evidence to investigate—not proof of who is trading or what price must do next. With candle-only data, label the read PROXY or UNAVAILABLE.",
    action: "At support: does licensed order-flow evidence show selling while price holds, or is this only a candle-based inference?",
    assets: ["any"],
    regimes: ["reversal", "range"],
    indicators: ["cvd", "footprint", "dom"],
    source: "Order Flow",
  },
  {
    id: "of-cvd-divergence",
    category: "Order Flow",
    title: "CVD divergence can flag changing aggression",
    body: "When true trade-side data shows price making a new high while Cumulative Volume Delta makes a lower high, aggressive buying is not confirming the move. That is context—not a reversal guarantee—and it requires confirmation plus a defined invalidation.",
    action: "New price high? Verify CVD provenance and freshness, then identify what observable event confirms or invalidates the divergence.",
    assets: ["any"],
    regimes: ["trend-up", "reversal"],
    indicators: ["cvd"],
    source: "Order Flow",
  },
  {
    id: "vp-poc",
    category: "Footprint / VP",
    title: "POC and value-area edges are context",
    body: "The Point of Control marks the profile's highest-volume price, while VAH and VAL bound the selected value area. They are reference locations, not automatic magnets or reversal signals; session template, bucket size, data source, and observed reaction determine meaning.",
    action: "Where is price relative to the current profile, and what reaction—not location alone—would support or invalidate the thesis?",
    assets: ["futures", "stocks", "crypto"],
    regimes: ["range"],
    indicators: ["vp", "volumeProfile", "sessionVP"],
    source: "Volume Profile",
  },
  {
    id: "sm-stop-run",
    category: "Smart Money",
    title: "A failed breakout can reveal a liquidity sweep",
    body: "A move through an obvious high or low that quickly fails can be consistent with stops being triggered and price rejecting the breakout. The behavior does not identify who traded or guarantee a reversal.",
    action: "Did price accept beyond the level or return inside? Define the observable confirmation and invalidation before considering a response.",
    assets: ["any"],
    regimes: ["reversal"],
    indicators: ["vwap", "vp"],
    source: "Smart Money",
  },
  {
    id: "risk-r-multiple",
    category: "Risk",
    title: "Define risk in R before size",
    body: "Fix your stop first, express the trade in R-multiples, then size so 1R is a fixed % of account. Consistent 1R sizing is what makes an edge compound instead of blowing up on one trade.",
    action: "What is 1R on this trade in dollars? Is it the same % you risked last trade?",
    assets: ["any"],
    regimes: ["any"],
    source: "Risk Management",
  },
  {
    id: "psy-no-revenge",
    category: "Psychology",
    title: "No revenge trades after a loss",
    body: "After a loss, urgency to recover money can distort the next decision. Treat the next opportunity independently and compare it with the same declared checklist and risk rules.",
    action: "Just lost? Record whether you feel urgency to recover money, then follow your predeclared cooldown and re-entry policy.",
    assets: ["any"],
    regimes: ["any"],
    source: "Psychology",
  },
  {
    id: "session-open",
    category: "Session Playbook",
    title: "First 30 min sets the range",
    body: "The opening range often frames the session. Let it form, mark the high/low, and trade the break or the fade with confirmation — don't force direction into the first candles.",
    action: "Mark the opening-range high/low. Wait for it to complete before committing size.",
    assets: ["stocks", "futures"],
    regimes: ["any"],
    indicators: ["sessionVP"],
    source: "Session Playbook",
  },
  {
    id: "crypto-24h",
    category: "Session Playbook",
    title: "Crypto has no bell — use funding & liquidations",
    body: "Without a session open, crypto structure keys off funding resets and liquidation cascades. Over-leveraged longs getting flushed can mark local bottoms; watch for a liquidation wick that fails to follow through.",
    action: "On a fast flush: is this a liquidation wick reversing, or genuine continuation on rising volume?",
    symbols: ["BTC", "ETH", "SOL"],
    assets: ["crypto"],
    regimes: ["reversal", "trend-down"],
    indicators: ["cvd"],
    source: "Crypto Playbook",
  },
  {
    id: "metals-macro",
    category: "Session Playbook",
    title: "Metals move on real yields & USD",
    body: "Gold/silver trend against real yields and the dollar. When DXY rolls over near a structure level, metals bids tend to firm — align order-flow entries with that macro tailwind rather than against it.",
    action: "Is the dollar helping or fighting this long? Don't fade the macro without a strong local reason.",
    symbols: ["XAU/USD", "GC1!", "SI1!"],
    assets: ["metals"],
    regimes: ["trend-up", "trend-down"],
    source: "Macro Playbook",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Context selection
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FabioContext {
  symbol?: string;
  assetClass?: FabioAssetClass;
  regime?: "trend-up" | "trend-down" | "range" | "reversal" | "any";
  activeIndicators?: string[];
  /** Free-text surface hint ("journal" | "news" | "chart" | "morning") for future tuning. */
  surface?: string;
}

/**
 * Metals futures roots that this playbook has a macro insight for.
 *
 * Fabio legitimately owns THIS, because "which metals do we have a playbook
 * for" is a fact about the playbook, not about the market. What it does NOT
 * own is which symbols ARE those contracts — that is read from the canonical
 * notation below, so `XAU/USD`, `XAUUSD`, `GC1!` and `GC=F` all arrive here as
 * the same root, and `SIRI` never does.
 */
const METALS_FUTURES_ROOTS = new Set(["GC", "MGC", "SI", "SIL", "HG", "PL", "PA"]);

/**
 * Which Fabio playbook vocabulary does this symbol belong to?
 *
 * ─── THE MEASURED FAILURE (2026-09-11) ──────────────────────────────────────
 *
 * This was the SIXTH hand-typed answer to "what kind of instrument is this" in
 * the repo, written before `symbolAssetClass` existed to own the question. It
 * was measured against that owner, and four of its answers were wrong about
 * symbols the product itself hands it:
 *
 *   BTC-USD   → stocks   (the crypto set held BARE bases only, and every
 *   ETH-USD   → stocks    picker in this app emits the `-USD` form — so the
 *   SOL-USD   → stocks    "Crypto has no bell" playbook could never fire for
 *                         an actual crypto symbol, and the stocks session
 *                         playbook fired instead: an opening-range insight
 *                         handed to a market that has no open.)
 *   EURUSD=X  → stocks   (Yahoo pair notation matched no branch.)
 *   /ES       → forex    (`includes("/")` read the futures slash convention as
 *                         a BASE/QUOTE pair. This is the identical bug
 *                         `classifySymbol` documents and orders around.)
 *   SIRI      → metals   (`startsWith("SI")`. Sirius XM was given the
 *   GCT       → metals    gold-and-real-yields macro playbook. So was GCT.)
 *
 * Every one of those is a wrong ANSWER shown to a trader, not a style problem.
 *
 * ─── WHAT CHANGED ───────────────────────────────────────────────────────────
 *
 * Class is now asked of the owner. Only the mapping into Fabio's own coarser
 * vocabulary stays here, as a total Record, so adding an `AssetClass` member
 * fails this typecheck instead of silently defaulting to "stocks" on screen.
 */
export function inferAssetClass(symbol?: string): FabioAssetClass {
  if (!symbol) return "any";

  const klass = classifySymbol(symbol);

  // The metals overlay is a SUBSET of futures, not a rival classification, so
  // it is applied only where the owner already said futures. That ordering is
  // what keeps an equity ticker out of the macro playbook.
  if (klass === "FUTURES") {
    const canonical = toYahooSymbol(symbol).toUpperCase();
    const root = canonical.endsWith("=F") ? canonical.slice(0, -2) : "";
    if (METALS_FUTURES_ROOTS.has(root)) return "metals";
  }

  return FABIO_CLASS_OF[klass];
}

/**
 * INDEX collapses to "stocks" deliberately: this vocabulary has no index
 * member, and the insights "stocks" selects are the bell-driven session ones
 * (opening range, first thirty minutes), which are as true of a cash index as
 * of a single name. UNKNOWN collapses to "any" — an unreadable symbol earns no
 * asset-specific playbook rather than a guessed one.
 */
const FABIO_CLASS_OF: Record<AssetClass, FabioAssetClass> = {
  CRYPTO: "crypto",
  FUTURES: "futures",
  FOREX: "forex",
  EQUITY: "stocks",
  INDEX: "stocks",
  UNKNOWN: "any",
};

function scoreInsight(ins: FabioInsight, ctx: FabioContext): number {
  let score = 1; // base — everything is at least eligible
  const sym = ctx.symbol?.toUpperCase();
  const asset = ctx.assetClass ?? inferAssetClass(ctx.symbol);

  if (sym && ins.symbols?.some(x => x.toUpperCase() === sym)) score += 6;
  if (ins.assets && (ins.assets.includes(asset) || ins.assets.includes("any"))) {
    score += ins.assets.includes(asset) && asset !== "any" ? 3 : 1;
  }
  if (ctx.regime && ins.regimes?.some(r => r === ctx.regime || r === "any")) {
    score += ins.regimes.includes(ctx.regime) ? 3 : 1;
  }
  if (ctx.activeIndicators?.length && ins.indicators?.length) {
    const hit = ins.indicators.some(i =>
      ctx.activeIndicators!.some(a => a.toLowerCase().includes(i.toLowerCase())));
    if (hit) score += 4;
  }
  return score;
}

/**
 * Return the most relevant insights for a given context, best-first.
 * Always returns something (falls back to general principles), so callers can
 * render without null-checks.
 */
export function getFabioInsights(ctx: FabioContext = {}, limit = 4): FabioInsight[] {
  const ranked = FABIO_INSIGHTS
    .map(ins => ({ ins, score: scoreInsight(ins, ctx) }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.ins);
  return ranked.slice(0, Math.max(1, limit));
}

/** Single best insight for compact surfaces (e.g. a one-line journal banner). */
export function getTopFabioInsight(ctx: FabioContext = {}): FabioInsight {
  return getFabioInsights(ctx, 1)[0];
}

/** Deterministic "insight of the day" (stable within a calendar day). */
export function getFabioDaily(ctx: FabioContext = {}): FabioInsight {
  const pool = getFabioInsights(ctx, FABIO_INSIGHTS.length);
  const dayIdx = Math.floor(Date.now() / 86_400_000);
  return pool[dayIdx % pool.length];
}

/**
 * Async loader seam. Today it returns the in-repo seed content; swap the body
 * to fetch from a CMS/API when real Fabio material is wired up — callers already
 * treat it as async-friendly via the sync helpers above where possible.
 */
export async function loadFabioInsights(): Promise<FabioInsight[]> {
  return FABIO_INSIGHTS;
}
