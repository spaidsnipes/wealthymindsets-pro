/**
 * WHAT A HEADLINE CALLS THIS INSTRUMENT (2026-10-02): the chart's News /
 * Research door opens /news?q=TSLA, and the filter matched the literal "tsla"
 * — headlines say "Tesla", so the room read "No news matches your filters"
 * with 120 headlines loaded. NQ1! matched nothing at all.
 *
 * Terms = the ticker (whole word, ≥ 2 letters, without "1!" / "-USD"), plus the
 * catalogue's own name words and aliases of ≥ 3 letters, minus words every
 * market shares ("futures", "index", "inc"…). PURE.
 */
import { CURATED_SYMBOLS } from "@/lib/marketData/curatedSymbolCatalog";

const GENERIC = new Set(["inc", "inc.", "corp", "corp.", "corporation", "co", "ltd", "plc", "the", "class", "futures", "future", "index", "cash", "spot", "etf", "trust", "fund", "group", "holdings", "company", "usd", "dollar", "us", "u.s.", "micro", "e-mini", "mini", "shares", "sp", "and", "&"]);

export interface NewsTerms { readonly words: readonly string[]; readonly ticker: string | null }

export function newsTermsFor(query: string): NewsTerms {
  const raw = (query ?? "").trim();
  if (!raw) return { words: [], ticker: null };
  const up = raw.toUpperCase();
  const base = up.replace(/1!$/, "").replace(/[-/]?(USD|USDT)$/, "").replace(/^\//, "");
  const entry = CURATED_SYMBOLS.find(s => s.sym.toUpperCase() === up)
    ?? CURATED_SYMBOLS.find(s => s.sym.toUpperCase() === base)
    ?? CURATED_SYMBOLS.find(s => s.sym.toUpperCase() === `${base}USD`);
  const words = new Set<string>();
  if (entry) {
    const name = entry.label.toLowerCase().replace(/[(),/]/g, " ").split(/[\s-]+/).filter(w => w.length >= 3 && !GENERIC.has(w) && !/^\d+$/.test(w));
    if (name[0]) words.add(name[0]);
    if (name.length > 1 && name[0].length < 5 && name[1]) words.add(`${name[0]} ${name[1]}`);
    for (const a of entry.aliases ?? []) if (a.length >= 3 && !GENERIC.has(a.toLowerCase())) words.add(a.toLowerCase());
  }
  if (!entry && raw.length >= 3) words.add(raw.toLowerCase());
  return { words: [...words], ticker: /^[A-Z0-9.]{1,6}$/.test(base) && base.length >= 2 ? base : null };
}

/** Does this headline / its tags name the instrument? Ticker as a whole word; names as substrings. */
export function headlineNames(terms: NewsTerms, title: string, sym: string, tags: readonly string[]): boolean {
  const t = title.toLowerCase();
  if (terms.ticker) {
    const re = new RegExp(`(^|[^A-Za-z0-9$])\\$?${terms.ticker.replace(".", "\\.")}([^A-Za-z0-9]|$)`);
    if (re.test(title) || sym.toUpperCase() === terms.ticker || tags.some(x => x.toUpperCase() === terms.ticker)) return true;
  }
  return terms.words.some(w => t.includes(w) || tags.some(x => x.toLowerCase().includes(w)));
}
