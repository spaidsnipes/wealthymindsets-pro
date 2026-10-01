/**
 * TASTYTRADE'S NESTED FUTURES-OPTION CHAIN, READ BY ITS OWN SPEC
 * (developer.tastytrade.com/openapi/instruments.json,
 * FuturesNestedOptionChainSerializer): `futures` (the SPECIFIC contracts) and
 * `option-chains` grouped by `underlying-symbol` → `expirations` → `strikes`
 * { strike-price, call, put }.
 *
 * Garden 18 §LXXXI/§LXXXVII/§XCV: futures options are not equity options —
 * every option keeps its parent future (a specific contract, never the
 * continuous chart symbol), its option root, settlement and expiry. PURE.
 */

export interface FutureContract { readonly symbol: string; readonly expiration: string | null; readonly dte: number | null; readonly activeMonth: boolean }
export interface FopStrike { readonly strike: number; readonly call: string | null; readonly put: string | null }
export interface FopExpiration {
  readonly parent: string;
  readonly optionRoot: string | null;
  readonly expiration: string;
  readonly dte: number | null;
  readonly type: string | null;
  readonly settlement: string | null;
  readonly strikes: readonly FopStrike[];
}
export interface FuturesOptionChain { readonly futures: readonly FutureContract[]; readonly expirations: readonly FopExpiration[] }

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => { const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN; return Number.isFinite(n) ? n : null; };

export function readFuturesOptionChain(data: unknown): FuturesOptionChain {
  const d = (data ?? {}) as { futures?: unknown[]; "option-chains"?: unknown[] };
  const futures: FutureContract[] = (d.futures ?? []).flatMap(f => {
    const o = f as Record<string, unknown>;
    const symbol = str(o.symbol);
    return symbol ? [{ symbol, expiration: str(o["expiration-date"]), dte: num(o["days-to-expiration"]), activeMonth: o["active-month"] === true }] : [];
  }).sort((a, b) => (a.dte ?? 1e9) - (b.dte ?? 1e9));
  const expirations: FopExpiration[] = [];
  for (const ch of d["option-chains"] ?? []) {
    const c = ch as Record<string, unknown>;
    for (const ex of (c.expirations as unknown[] | undefined) ?? []) {
      const e = ex as Record<string, unknown>;
      const parent = str(e["underlying-symbol"]) ?? str(c["underlying-symbol"]);
      const expiration = str(e["expiration-date"]);
      if (!parent || !expiration) continue;
      const strikes: FopStrike[] = ((e.strikes as unknown[] | undefined) ?? []).flatMap(s => {
        const k = s as Record<string, unknown>;
        const strike = num(k["strike-price"]);
        return strike != null ? [{ strike, call: str(k.call), put: str(k.put) }] : [];
      }).sort((a, b) => a.strike - b.strike);
      expirations.push({ parent, optionRoot: str(e["option-root-symbol"]), expiration, dte: num(e["days-to-expiration"]), type: str(e["expiration-type"]), settlement: str(e["settlement-type"]), strikes });
    }
  }
  expirations.sort((a, b) => (a.dte ?? 1e9) - (b.dte ?? 1e9) || a.parent.localeCompare(b.parent));
  return { futures, expirations };
}

/** The futures product behind a chart symbol: NQ1! → NQ, /MNQZ6 → MNQ, ES1! → ES. Null when it is not a future. */
export function futuresProductFor(chartSymbol: string): string | null {
  const s = chartSymbol.trim().toUpperCase();
  const cont = /^\/?([A-Z0-9]{1,4}?)1!$/.exec(s);
  if (cont) return cont[1];
  const spec = /^\/([A-Z0-9]{1,4})[FGHJKMNQUVXZ]\d{1,2}$/.exec(s);
  if (spec) return spec[1];
  const root = /^\/([A-Z0-9]{1,4})$/.exec(s);
  return root ? root[1] : null;
}

/** The strikes nearest a reference price (the chain is long; the trader starts at the money). */
export function strikesNear(strikes: readonly FopStrike[], price: number | null, n = 12): readonly FopStrike[] {
  if (price == null || !Number.isFinite(price) || strikes.length <= n) return strikes.slice(0, n);
  let i = 0;
  while (i < strikes.length - 1 && strikes[i].strike < price) i++;
  const from = Math.max(0, Math.min(strikes.length - n, i - Math.floor(n / 2)));
  return strikes.slice(from, from + n);
}
