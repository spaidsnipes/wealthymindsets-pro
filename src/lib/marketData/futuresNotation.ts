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
