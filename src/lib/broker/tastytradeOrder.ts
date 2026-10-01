/**
 * ONE WM ORDER INTENT → TASTYTRADE'S OWN ORDER JSON (Garden 18 §LXXIV–§XCV).
 *
 * Field names, values and symbol formats are tastytrade's documented ones
 * (developer.tastytrade.com: "Place an equity order", "Instruments &
 * Symbology"): time-in-force, order-type, price, price-effect (Debit when money
 * leaves, Credit when it enters), external-identifier (idempotency), legs of
 * { instrument-type, symbol, quantity, action }.
 *
 * Symbols are validated against the documented formats so a continuous
 * contract, an equity-option row that moved, or a bare "BTC" can never be sent
 * (§LXXXVII/§LXXXVIII/§XCIII). PURE.
 */

export const TT_INSTRUMENT_TYPES = ["Equity", "Equity Option", "Future", "Future Option", "Cryptocurrency"] as const;
export type TtInstrumentType = (typeof TT_INSTRUMENT_TYPES)[number];
export const TT_ACTIONS = ["Buy to Open", "Sell to Close", "Sell to Open", "Buy to Close"] as const;
export type TtAction = (typeof TT_ACTIONS)[number];

export interface TtOrderIntent {
  readonly instrumentType: TtInstrumentType;
  readonly symbol: string;
  readonly action: TtAction;
  readonly qty: number;
  readonly type: "Limit" | "Market";
  readonly limitPx?: number;
  /** The Decision_ID this order expresses — required, no orphan orders. */
  readonly decisionId: string;
  /** Idempotency key (tastytrade external-identifier). */
  readonly clientOrderId: string;
}

export interface TtOrder {
  readonly "time-in-force": "Day";
  readonly "order-type": "Limit" | "Market";
  readonly price?: string;
  readonly "price-effect"?: "Debit" | "Credit";
  readonly source: "wm-pro";
  readonly "external-identifier": string;
  readonly legs: readonly [{ readonly "instrument-type": TtInstrumentType; readonly symbol: string; readonly quantity: number; readonly action: TtAction }];
}

/** Documented symbol shapes, per instrument type. */
const FORMAT: Readonly<Record<TtInstrumentType, RegExp>> = {
  Equity: /^[A-Z0-9]{1,6}(\/[A-Z])?$/,
  // Root right-padded to 6, yymmdd, C|P, strike×1000 in 8 digits.
  "Equity Option": /^[A-Z0-9 ]{6}\d{6}[CP]\d{8}$/,
  // A SPECIFIC contract: product, month code, 1–2 digit year — never a continuous "/ES" or "NQ1!".
  Future: /^\/[A-Z0-9]{1,4}[FGHJKMNQUVXZ]\d{1,2}$/,
  // Fixed-width fields: the future padded to 5, the option root padded to 6.
  // A short future carries spaces (`./ESH7 EWZ6  261231C4750`); a 5-character
  // one carries none (`./MNQZ6MN2CV6261014C31000`) — both read from the live
  // chain 2026-10-01. Requiring the space refused every MNQ option.
  "Future Option": /^\.\/[A-Z0-9]{1,4}[FGHJKMNQUVXZ]\d{1,2} *[A-Z0-9]{1,6} *\d{6}[CP]\d+(\.\d+)?$/,
  Cryptocurrency: /^[A-Z]{2,6}\/USD$/,
};

/** An OSI contract (TSLA261002C00305000) in tastytrade's padded OCC form (`TSLA  261002C00305000`). */
export function osiToTastytrade(osi: string): string | null {
  const m = /^([A-Z0-9]{1,6})\s*(\d{6}[CP]\d{8})$/.exec(osi.trim().toUpperCase());
  return m ? m[1].padEnd(6, " ") + m[2] : null;
}

export type TtMapResult = { readonly ok: true; readonly order: TtOrder } | { readonly ok: false; readonly reason: string };

export function toTastytradeOrder(i: TtOrderIntent): TtMapResult {
  if (!/^wmd_\S+$/.test(i.decisionId)) return { ok: false, reason: "No WM Decision_ID: an order must express a decision." };
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(i.clientOrderId)) return { ok: false, reason: "The client order id is missing or malformed; it is what makes this order reconcilable." };
  if (!TT_INSTRUMENT_TYPES.includes(i.instrumentType)) return { ok: false, reason: "Unknown instrument type." };
  if (!TT_ACTIONS.includes(i.action)) return { ok: false, reason: "Unknown action." };
  if (!FORMAT[i.instrumentType].test(i.symbol)) {
    return { ok: false, reason: i.instrumentType === "Future"
      ? `"${i.symbol}" is not a specific futures contract (e.g. /MNQZ6) — a continuous symbol is never routed.`
      : `"${i.symbol}" is not a ${i.instrumentType} symbol in tastytrade's format.` };
  }
  const wholeOnly = i.instrumentType !== "Cryptocurrency";
  if (!(i.qty > 0) || (wholeOnly && !Number.isInteger(i.qty))) {
    return { ok: false, reason: wholeOnly ? "Quantity must be a whole number above zero." : "Quantity must be above zero." };
  }
  if (i.type === "Limit" && !(typeof i.limitPx === "number" && i.limitPx > 0)) return { ok: false, reason: "A limit order needs a limit price above zero." };
  if (i.type === "Market" && i.limitPx !== undefined) return { ok: false, reason: "A market order carries no limit price." };
  const buying = i.action.startsWith("Buy");
  return {
    ok: true,
    order: {
      "time-in-force": "Day",
      "order-type": i.type,
      ...(i.type === "Limit" ? { price: String(Number(i.limitPx!.toPrecision(12))), "price-effect": buying ? "Debit" as const : "Credit" as const } : {}),
      source: "wm-pro",
      "external-identifier": i.clientOrderId,
      legs: [{ "instrument-type": i.instrumentType, symbol: i.symbol, quantity: i.qty, action: i.action }],
    },
  };
}
