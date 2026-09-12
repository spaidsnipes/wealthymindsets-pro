/**
 * How well does this row answer what the trader actually typed?
 *
 * ── Why this owner exists ───────────────────────────────────────────────────
 *
 * MEASURED on 2026-09-11, market open, against the running app:
 *
 *     /api/symbol-search?q=spy   → APYI, DNUT, DSPY, DVSP, GSPY, HRSPY,
 *                                  I:ISPYIV, ISPY, JDSPY, KGSPY, KSPY, LXSPY,
 *                                  SGLRF, SGP, SPY, SPYA, ...
 *     /api/symbol-search?q=aapl  → AAPB, AAPD, AAPE, AAPL, ...
 *     /api/symbol-search?q=vix   → twenty `I:` rows, and no exact match at all
 *
 * `SPY` came back FIFTEENTH. `AAPL` came back fourth, behind three leveraged
 * single-stock ETFs. The trader types the exact ticker they want and it is not
 * the first row — sometimes not any row.
 *
 * The root cause is not the ranking, it is the TRUNCATION. Polygon's
 * `?search=` returns matches in ALPHABETICAL order, and the route asked for
 * `limit=20`. So the vendor chose which twenty by an ordering that has nothing
 * to do with relevance, and anything alphabetically late was gone before this
 * process ever saw it. Re-sorting twenty already-wrong rows cannot recover a
 * symbol that was never sent. The fix must widen the ASK, then rank, then cut.
 *
 * ── Why it is a shared owner and not a local sort ────────────────────────────
 *
 * `matchCuratedSymbols` already had a private two-tier sort (prefix, then
 * everything else) with no exact-match tier at all. That is the same question
 * being answered a second time, slightly differently — the exact shape that
 * put three disagreeing symbol catalogues in this repo. One owner, two
 * callers, no third opinion.
 */

/** Ordered best-first. The numbers are the sort key; the names are the point. */
export const MATCH_RANK = {
  EXACT: 0,
  SYMBOL_PREFIX: 1,
  SYMBOL_CONTAINS: 2,
  LABEL: 3,
  NONE: 4,
} as const;

export type MatchRank = (typeof MATCH_RANK)[keyof typeof MATCH_RANK];

export type RankableHit = {
  sym: string;
  label?: string;
  aliases?: readonly string[];
};

/**
 * Reduce a symbol or query to the letters a human would say out loud.
 *
 * Strips the punctuation that distinguishes NOTATIONS of the same instrument
 * (`^VIX`, `BTC-USD`, `ES=F`) and the `X:` / `C:` / `I:` namespace prefixes
 * that are one vendor's private dialect. A trader typing `vix` means `^VIX`;
 * typing `btcusd` means `BTC-USD`. Without this, every exact match in the app
 * is punctuation-dependent and therefore mostly absent.
 */
export function normalizeSymbolToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[a-z]:/, "") // Polygon namespaces: I: indices, C: fx, X: crypto
    .replace(/[/\-_\s!^=.:]/g, "");
}

/**
 * Where a single row belongs relative to the query. Pure, so the ordering the
 * trader sees is a function of the text they typed and nothing else.
 */
export function symbolMatchRank(query: string, hit: RankableHit): MatchRank {
  const q = normalizeSymbolToken(query);
  if (!q) return MATCH_RANK.NONE;

  const sym = normalizeSymbolToken(hit.sym);
  if (sym === q) return MATCH_RANK.EXACT;

  // An alias is a promise that this row IS the thing that was typed, so it
  // ranks with the exact match rather than below the substring accidents.
  if (hit.aliases?.some((a) => normalizeSymbolToken(a) === q)) return MATCH_RANK.EXACT;

  if (sym.startsWith(q)) return MATCH_RANK.SYMBOL_PREFIX;
  if (sym.includes(q)) return MATCH_RANK.SYMBOL_CONTAINS;

  // Raw, not normalized: names contain spaces and hyphens meaningfully.
  const label = (hit.label ?? "").toLowerCase();
  const rawQ = query.trim().toLowerCase();
  if (rawQ && label.includes(rawQ)) return MATCH_RANK.LABEL;
  if (hit.aliases?.some((a) => a.toLowerCase().includes(rawQ))) return MATCH_RANK.LABEL;

  return MATCH_RANK.NONE;
}

/**
 * Best-first ordering.
 *
 * Ties break toward the SHORTER symbol: between `SPY` and `SPYG` for the query
 * `spy`, the plain one is what was asked for. Remaining ties are alphabetical
 * so the ordering is total and the same input always renders the same list.
 *
 * `dropUnmatched` distinguishes the two callers, and the distinction is a
 * truth claim rather than a preference:
 *
 *  - Searching a LOCAL catalogue, a row this owner cannot match is not a
 *    result — nothing else vouched for it. Drop it.
 *  - Ranking a VENDOR's answer, a row this owner cannot match may still be a
 *    real hit on a field the vendor searched and we do not model. Deleting it
 *    would be this process claiming to know better than the source it asked.
 *    Rank it last instead, and let it through.
 */
export function rankSymbolHits<T extends RankableHit>(
  query: string,
  hits: readonly T[],
  limit: number,
  { dropUnmatched = true }: { dropUnmatched?: boolean } = {},
): T[] {
  return hits
    .map((hit) => ({ hit, rank: symbolMatchRank(query, hit) }))
    .filter((r) => !dropUnmatched || r.rank !== MATCH_RANK.NONE)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.hit.sym.length - b.hit.sym.length ||
        a.hit.sym.localeCompare(b.hit.sym),
    )
    .slice(0, Math.max(0, limit))
    .map((r) => r.hit);
}
