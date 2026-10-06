/** The existing Yahoo futures overrides, extracted unchanged to a cycle-free notation owner. */
export const FUTURES_YAHOO_NOTATIONS: Readonly<Record<string, string>> = {
  // Futures
  "NQ1!":  "NQ=F",   "MNQ1!": "MNQ=F",
  "ES1!":  "ES=F",   "MES1!": "MES=F",
  "YM1!":  "YM=F",   "MYM1!": "MYM=F",
  "RTY1!": "RTY=F",  "M2K1!": "M2K=F",
  "GC1!":  "GC=F",   "MGC1!": "MGC=F",
  "SI1!":  "SI=F",
  "CL1!":  "CL=F",   "MCL1!": "MCL=F",
  "NG1!":  "NG=F",
  "HG1!":  "HG=F",
  "ZB1!":  "ZB=F",
  "ZN1!":  "ZN=F",
  "ZF1!":  "ZF=F",
  "ZT1!":  "ZT=F",
  "ZC1!":  "ZC=F",
  "ZW1!":  "ZW=F",
  "ZS1!":  "ZS=F",
  "LE1!":  "LE=F",
  /**
   * Offered by the pickers, and named by the spot-metal refusal below as the
   * lawful alternative ("Open PL1! for Platinum futures"), but absent from this
   * table — so they reached Yahoo verbatim as "PL1!" and 404'd. MEASURED
   * 2026-09-25: Yahoo lists each `=F` below as instrumentType FUTURE on the
   * named exchange (PL/PA NY Mercantile; 6E/6J/6B CME). Same contract, Yahoo's
   * name — an identity, like every other row here.
   */
  "PL1!":  "PL=F",
  "PA1!":  "PA=F",
  "6E1!":  "6E=F",
  "6J1!":  "6J=F",
  "6B1!":  "6B=F",
};

/** Explicit futures notation only. Bare equity tickers (ES, CL) remain ambiguous. */
export function parseFuturesNotation(symbol: string): { root: string; exactSymbol: string | null } | null {
  const s = symbol.trim().toUpperCase();
  const continuous = /^\/?([A-Z0-9]{1,4})(?:1!|=F)$/.exec(s);
  if (continuous) return { root: continuous[1], exactSymbol: null };
  const dated = /^\/?([A-Z0-9]{1,4})[FGHJKMNQUVXZ]\d{1,2}$/.exec(s);
  if (dated && (s.startsWith("/") || FUTURES_YAHOO_NOTATIONS[`${dated[1]}1!`] === `${dated[1]}=F`)) {
    return { root: dated[1], exactSymbol: s.startsWith("/") ? s : `/${s}` };
  }
  const root = /^\/([A-Z0-9]{1,4})$/.exec(s);
  return root ? { root: root[1], exactSymbol: null } : null;
}

/**
 * BARE ROOTS THAT ARE ALSO LISTED SECURITIES — MEASURED, not believed.
 * Yahoo /v8/finance/chart, 2026-10-06 ~11:05 CDT, range=5d interval=1d, every
 * root in the table above asked bare: these nine answered with daily bars for
 * a real listed instrument, so typing the letters alone is genuinely
 * ambiguous and stays the security (the classifier's long-standing rule:
 * "ES is Eversource"). The search palette still leads with the future.
 *   ES  Eversource Energy (NYSE)      SI  Shoulder Innovations (NYSE)
 *   CL  Colgate-Palmolive (NYSE)      NG  NovaGold Resources (NYSE American)
 *   HG  Hamilton Insurance (NYSE)     ZS  Zscaler (Nasdaq)
 *   LE  Lands' End (Nasdaq)           PL  Planet Labs (NYSE)
 *   MGC Vanguard Mega Cap ETF (NYSE Arca)
 * Every other root answered "Not Found" or a bar-less quote stub (NQ, MNQ,
 * YM, RTY, GC, ZB, ZC, ZW, MCL…): no market under the bare letters, so the
 * only instrument a trader can mean is the future.
 */
export const BARE_ROOTS_LISTED_AS_SECURITIES: ReadonlySet<string> = new Set([
  "ES", "SI", "CL", "NG", "HG", "ZS", "LE", "PL", "MGC",
]);

/** A root this table already names as a continuous contract ("NQ" → true). */
function tabledRoot(root: string): boolean {
  return FUTURES_YAHOO_NOTATIONS[`${root}1!`] === `${root}=F`;
}

/**
 * WHAT A TRADER TYPED → THE SYMBOL THE CHART OPENS (serving 2026-10-06:
 * `/charts?symbol=NQ` refused at all five bar doors while NQ1! charted).
 *
 * The entry gate for typed / deep-linked / restored symbols. Uppercases, then
 * names the continuous research series for the futures spellings that would
 * otherwise reach no door:
 *   "nq" / "NQ"      → "NQ1!"  (bare root with no listed security — measured)
 *   "/NQ" / "/es"    → "NQ1!" / "ES1!"  (the slash is the broker's futures
 *                       mark, so even an ambiguous root is unambiguous here)
 *   "NQ=F"           → "NQ1!"  (Yahoo's spelling of the same continuous series)
 * Everything else comes back uppercased and otherwise UNCHANGED — a dated
 * contract (/NQZ6, NQZ6) stays the executable month it names, an ambiguous
 * bare root (ES, CL) stays the listed security, and an unknown root (/BTC,
 * CME Bitcoin) is not guessed at. Only tabled roots are mapped, so every
 * answer is a symbol the bar doors already serve. Idempotent. PURE.
 */
export function resolveEnteredSymbol(raw: string): string {
  const s = (raw ?? "").trim().toUpperCase();
  const slashRoot = /^\/([A-Z0-9]{1,4})$/.exec(s);
  if (slashRoot && tabledRoot(slashRoot[1])) return `${slashRoot[1]}1!`;
  const yahooForm = /^([A-Z0-9]{1,4})=F$/.exec(s);
  if (yahooForm && tabledRoot(yahooForm[1])) return `${yahooForm[1]}1!`;
  if (/^[A-Z0-9]{1,4}$/.test(s) && tabledRoot(s) && !BARE_ROOTS_LISTED_AS_SECURITIES.has(s)) return `${s}1!`;
  return s;
}
