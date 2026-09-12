/**
 * What category badge does a search hit wear?
 *
 * ── Why this is not just a vendor field ─────────────────────────────────────
 *
 * Every symbol-search vendor ships its own class vocabulary. Polygon says
 * `market: "fx"`, Yahoo says `quoteType: "CURRENCY"`, and this repo says
 * `FOREX`. Reading whichever field the current vendor happens to expose is how
 * a search dropdown ends up disagreeing with the chart the trader lands on —
 * the same defect `symbolAssetClass` was built to end, wearing vendor clothes
 * so the notation scan in `assetClassPredicateSingleOwner.test.ts` cannot see
 * it. A second search vendor was about to make this repo's EIGHTH answer to
 * "what kind of instrument is this".
 *
 * ── The rule: the owner wins where it has an opinion ────────────────────────
 *
 * `classifySymbol` owns CLASS. It is also deliberately coarse in one place: it
 * answers `EQUITY` for both `AAPL` and `IBIT`, because "is this a fund
 * wrapper" is a fact about the listing, not about the notation, and the owner
 * has no way to know it. That is the ONLY thing a vendor is allowed to add
 * here — a refinement inside a class the owner already chose.
 *
 * The vendor also fills genuine gaps: `MGCV26.CMX` and `AAPL.TO` are real
 * listings whose notation the owner does not recognise, so it says `UNKNOWN`,
 * and `UNKNOWN` is an absence of opinion rather than a claim. There the vendor
 * is the only source, and it is used.
 *
 * What the vendor may never do is CONTRADICT the owner. If Yahoo called
 * `VX1!` a future while this app resolves it to the `^VIX` cash index, the
 * badge would promise a contract the chart will not show. Owner first, vendor
 * second, and a test below holds that order.
 */

import { classifySymbol, type AssetClass } from "@/lib/marketData/symbolAssetClass";

/**
 * The badge vocabulary the picker renders. Richer than `AssetClass` by exactly
 * two members — `ETF` and `Fund` — which are the refinements described above.
 */
export type SearchCategory =
  | "Stock"
  | "ETF"
  | "Fund"
  | "Crypto"
  | "Forex"
  | "Futures"
  | "Index";

/** The classes the owner answers, in badge vocabulary. */
const CATEGORY_OF_CLASS: Record<Exclude<AssetClass, "UNKNOWN">, SearchCategory> = {
  CRYPTO: "Crypto",
  FUTURES: "Futures",
  FOREX: "Forex",
  INDEX: "Index",
  EQUITY: "Stock",
};

/**
 * Refinements a vendor may apply INSIDE `EQUITY`. A listing the owner calls an
 * equity may really be a fund wrapper, and only the vendor knows.
 */
const EQUITY_REFINEMENTS: ReadonlySet<SearchCategory> = new Set<SearchCategory>(["ETF", "Fund"]);

/** Yahoo's `quoteType`, as observed live on 2026-09-11. */
export function yahooQuoteTypeCategory(quoteType: string | undefined): SearchCategory | null {
  switch ((quoteType ?? "").trim().toUpperCase()) {
    case "CRYPTOCURRENCY": return "Crypto";
    case "CURRENCY":       return "Forex";
    case "FUTURE":         return "Futures";
    case "INDEX":          return "Index";
    case "ETF":            return "ETF";
    case "MUTUALFUND":     return "Fund";
    case "EQUITY":         return "Stock";
    default:               return null;
  }
}

/**
 * Polygon's `market` + `type` pair.
 *
 * Every branch reads BOTH fields. That symmetry is load-bearing, and it was
 * missing: `indices` was the one market checked only via `type`. MEASURED on
 * 2026-09-11 — `/api/symbol-search?q=vix` returned twenty rows carrying
 * `market:"indices"` with an empty `type`, so this function answered `null`,
 * and `reconcileSearchCategory` turned that `null` into its "no opinion
 * anywhere" default of `Stock`. `I:DLVIX`, `I:SVIXIV` and eighteen more
 * volatility INDICES wore a Stock badge in the picker.
 *
 * The `I:` prefix is deliberately NOT taught to `classifySymbol`. That owner
 * reads MARKET notation (`^VIX`, `ES=F`, `BTC-USD`); `I:` is one vendor's
 * private namespace, and translating vendor dialect is this function's whole
 * job. Teaching it upstream would put Polygon's vocabulary in a place that is
 * supposed to be vendor-neutral.
 */
export function polygonCategory(market: string | undefined, type: string | undefined): SearchCategory | null {
  const m = (market ?? "").trim().toLowerCase();
  const t = (type ?? "").trim().toLowerCase();
  if (m === "crypto" || t === "crypto") return "Crypto";
  if (m === "fx" || t === "fx" || t === "forex") return "Forex";
  if (t === "etf") return "ETF";
  if (m === "indices" || t === "index" || t === "indices") return "Index";
  if (t === "fund" || t === "mutual_fund") return "Fund";
  if (m === "stocks" || t === "cs" || t === "common_stock" || t === "adrc") return "Stock";
  return null;
}

/**
 * Reconcile one vendor's opinion with the class owner's.
 *
 * `vendorOpinion` is `null` when the vendor offered nothing we recognise —
 * which is different from the vendor saying "stock", and is treated as such.
 */
export function reconcileSearchCategory(
  symbol: string,
  vendorOpinion: SearchCategory | null,
): SearchCategory {
  const klass = classifySymbol(symbol);

  // The owner has no opinion: the vendor is the only source there is. A
  // listing notation we do not parse is still a real listing.
  if (klass === "UNKNOWN") return vendorOpinion ?? "Stock";

  const owned = CATEGORY_OF_CLASS[klass];

  // The one place a vendor may be MORE specific than the owner.
  if (owned === "Stock" && vendorOpinion !== null && EQUITY_REFINEMENTS.has(vendorOpinion)) {
    return vendorOpinion;
  }

  return owned;
}
