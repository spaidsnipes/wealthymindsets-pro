/**
 * BROKER CAPABILITY LEDGER — Garden 18 v2 §26 ("capability matrix") and §86
 * ("Do not say 'Webull supported' when only one of those is supported").
 *
 * One row per provider × capability, each with a state from §26's own
 * vocabulary and the file that EARNS the claim. Nothing here is measured at
 * runtime — it is the declared map of what WM Pro has built and wired, held
 * honest by its test: every claim that is not UNSUPPORTED / NOT_BUILT names an
 * owner file that exists. Live health (is the wire up right now?) belongs to
 * the readiness wireboard; this says what each wire is FOR.
 *
 * Execution states never mean "Claude sends orders": every live order needs
 * the human's armed press in the request (executionAuthority).
 */

export type CapabilityState =
  | "LIVE"            // real-time, wired end to end
  | "HUMAN_ARMED"     // built; reaches the broker only on the trader's armed press
  | "PARTIAL"         // wired with a named limit
  | "RECONSTRUCTED"   // rebuilt from history WM did not observe at the time
  | "NOT_CONNECTED"   // built here; the provider/entitlement is not on
  | "NOT_BUILT"       // the provider offers it; WM has not built it
  | "UNSUPPORTED";    // not offered on this rail

export type CapabilityId =
  | "QUOTES" | "BARS" | "LIVE_PRINTS" | "DEPTH" | "OPTIONS_CHAIN" | "GREEKS"
  | "FUTURES_OPTIONS" | "EXEC_EQUITY" | "EXEC_OPTION" | "EXEC_FUTURE" | "EXEC_FUTURE_OPTION"
  | "EXEC_CRYPTO" | "EXEC_FX" | "CANCEL" | "MODIFY" | "PROTECTION" | "POSITIONS" | "FILLS_HISTORY" | "PNL";

export const CAPABILITY_LABEL: Readonly<Record<CapabilityId, string>> = {
  QUOTES: "Quotes", BARS: "Bars / candles", LIVE_PRINTS: "Live prints (tape)", DEPTH: "Book depth",
  OPTIONS_CHAIN: "Options chain", GREEKS: "Greeks", FUTURES_OPTIONS: "Futures options",
  EXEC_EQUITY: "Execute · stock / ETF", EXEC_OPTION: "Execute · equity option", EXEC_FUTURE: "Execute · future",
  EXEC_FUTURE_OPTION: "Execute · futures option", EXEC_CRYPTO: "Execute · crypto", EXEC_FX: "Execute · spot forex", CANCEL: "Cancel order",
  MODIFY: "Modify / replace order", PROTECTION: "Protection (stop · bracket)", POSITIONS: "Positions / balance",
  FILLS_HISTORY: "Fills & order history", PNL: "Realised P&L",
};

export interface CapabilityRow {
  readonly provider: "tastytrade" | "Webull";
  readonly capability: CapabilityId;
  readonly state: CapabilityState;
  /** The file that earns the claim (repo-relative); null only for UNSUPPORTED / NOT_BUILT. */
  readonly owner: string | null;
  /** The limit, the entitlement, or why — in the trader's words. */
  readonly note: string;
}

const T = "tastytrade" as const, W = "Webull" as const;

export const CAPABILITY_LEDGER: readonly CapabilityRow[] = [
  // ── tastytrade ────────────────────────────────────────────────────────
  { provider: T, capability: "QUOTES", state: "LIVE", owner: "src/lib/broker/tastyQuoteStream.ts", note: "DXLink: stocks, ETFs, options, futures, futures options, listed USD coins" },
  { provider: T, capability: "BARS", state: "LIVE", owner: "src/lib/marketData/adapters/tastytradeCandles.ts", note: "5 s … 1 M; stocks, futures, listed USD coins" },
  { provider: T, capability: "LIVE_PRINTS", state: "PARTIAL", owner: "src/lib/marketData/adapters/tastytradeFuturesTicks.ts", note: "futures and option prints signed by the venue (Options Flow); stock sides INFERRED (Lee–Ready); print history capped near 1,000 per contract — the candles' own bid / ask volume carries signed flow for the whole bar history" },
  { provider: T, capability: "DEPTH", state: "UNSUPPORTED", owner: null, note: "not served on this DXLink session — probe 2026-10-06 (/NQZ26): PriceLevel \"not available\", Order answered an internal error with no events" },
  { provider: T, capability: "OPTIONS_CHAIN", state: "LIVE", owner: "src/app/api/broker/tastytrade/chain/route.ts", note: "expirations, strikes, live quotes" },
  { provider: T, capability: "GREEKS", state: "LIVE", owner: "src/lib/broker/tastyOptionStreamers.ts", note: "DXLink Greeks events" },
  { provider: T, capability: "FUTURES_OPTIONS", state: "LIVE", owner: "src/lib/broker/tastytradeFuturesChain.ts", note: "e.g. MNQ, ES chains with Greeks" },
  { provider: T, capability: "EXEC_EQUITY", state: "HUMAN_ARMED", owner: "src/app/api/broker/tastytrade/order-submit/route.ts", note: "dry run first; live only on your armed press" },
  { provider: T, capability: "EXEC_OPTION", state: "HUMAN_ARMED", owner: "src/app/api/broker/tastytrade/order-submit/route.ts", note: "single leg; open / close intent required" },
  { provider: T, capability: "EXEC_FUTURE", state: "HUMAN_ARMED", owner: "src/app/api/broker/tastytrade/order-submit/route.ts", note: "specific contract; futures-approved account only" },
  { provider: T, capability: "EXEC_FUTURE_OPTION", state: "HUMAN_ARMED", owner: "src/lib/broker/fopTicket.ts", note: "futures-approved account only" },
  { provider: T, capability: "EXEC_CRYPTO", state: "HUMAN_ARMED", owner: "src/lib/broker/tastytradeOrder.ts", note: "GTC only (tastytrade's crypto rule)" },
  { provider: T, capability: "EXEC_FX", state: "UNSUPPORTED", owner: null, note: "tastytrade offers no spot forex — a currency future (/6E) is a futures trade, never swapped in for EUR/USD" },
  { provider: T, capability: "CANCEL", state: "LIVE", owner: "src/app/api/broker/tastytrade/orders/route.ts", note: "working orders" },
  { provider: T, capability: "MODIFY", state: "NOT_BUILT", owner: null, note: "cancel and re-enter until replace is built" },
  { provider: T, capability: "PROTECTION", state: "PARTIAL", owner: "src/lib/broker/tastytradeEntryFields.ts", note: "broker-native Stop / Stop Limit; bracket / OCO not built" },
  { provider: T, capability: "POSITIONS", state: "LIVE", owner: "src/app/api/broker/tastytrade/positions/route.ts", note: "accounts masked to last 4" },
  { provider: T, capability: "FILLS_HISTORY", state: "LIVE", owner: "src/lib/broker/tastytradeFills.ts", note: "fills into Journal; full history read page by page (no 250-row cut)" },
  { provider: T, capability: "PNL", state: "LIVE", owner: "src/lib/broker/tastytradeLedger.ts", note: "round trips from tastytrade's own transactions (its cash, its fees) — Journal › Broker Ledger" },

  // ── Webull ────────────────────────────────────────────────────────────
  // Measured on serving 2026-10-03 07:02Z from the owner's session:
  // entitlement FULLY_OPEN (accounts · profiles · snapshot · ticks all 200),
  // broker lane CONNECTED (3 accounts).
  { provider: W, capability: "QUOTES", state: "LIVE", owner: "src/lib/marketData/adapters/webullMarketData.ts", note: "stock snapshots + crypto stream" },
  { provider: W, capability: "BARS", state: "NOT_BUILT", owner: null, note: "chart bars come from tastytrade's candles; a Webull bar door is not built" },
  { provider: W, capability: "LIVE_PRINTS", state: "LIVE", owner: "src/lib/marketData/adapters/webullTicksBrowser.ts", note: "stock prints in session; Webull sends no aggressor side, so sides are inferred — tastytrade's tape outranks it when fresh" },
  { provider: W, capability: "DEPTH", state: "NOT_BUILT", owner: null, note: "Webull's book is not wired into WM yet" },
  { provider: W, capability: "OPTIONS_CHAIN", state: "NOT_BUILT", owner: null, note: "options are read from tastytrade's chain" },
  { provider: W, capability: "GREEKS", state: "NOT_BUILT", owner: null, note: "tastytrade supplies Greeks" },
  { provider: W, capability: "FUTURES_OPTIONS", state: "UNSUPPORTED", owner: null, note: "not on this rail in WM" },
  { provider: W, capability: "EXEC_EQUITY", state: "HUMAN_ARMED", owner: "src/app/api/broker/webull/order-submit/route.ts", note: "Webull preview must accept first; live only on your armed press" },
  { provider: W, capability: "EXEC_OPTION", state: "HUMAN_ARMED", owner: "src/app/api/broker/webull/order-submit/route.ts", note: "single-leg OSI contract; open / close intent required" },
  { provider: W, capability: "EXEC_FUTURE", state: "NOT_BUILT", owner: null, note: "futures orders route through tastytrade" },
  { provider: W, capability: "EXEC_FUTURE_OPTION", state: "UNSUPPORTED", owner: null, note: "not on this rail in WM" },
  { provider: W, capability: "EXEC_CRYPTO", state: "NOT_BUILT", owner: null, note: "crypto orders route through tastytrade" },
  { provider: W, capability: "EXEC_FX", state: "UNSUPPORTED", owner: null, note: "Webull's OpenAPI in WM carries no spot forex orders" },
  { provider: W, capability: "CANCEL", state: "LIVE", owner: "src/app/api/broker/webull/orders/route.ts", note: "working orders" },
  { provider: W, capability: "MODIFY", state: "NOT_BUILT", owner: null, note: "cancel and re-enter until replace is built" },
  { provider: W, capability: "PROTECTION", state: "NOT_BUILT", owner: null, note: "no broker-native stop wired for Webull yet" },
  { provider: W, capability: "POSITIONS", state: "LIVE", owner: "src/app/api/broker/webull/positions/route.ts", note: "account numbers masked to last 4" },
  { provider: W, capability: "FILLS_HISTORY", state: "RECONSTRUCTED", owner: "src/lib/broker/webullLedger.ts", note: "Lifetime Ledger from order history (fees itemised); not observed by WM at the time" },
  { provider: W, capability: "PNL", state: "RECONSTRUCTED", owner: "src/lib/broker/webullLedger.ts", note: "realised P&L net of fees, reconciled with Webull's day P&L" },
];

export const STATE_WORD: Readonly<Record<CapabilityState, string>> = {
  LIVE: "LIVE", HUMAN_ARMED: "ARMED BY YOU", PARTIAL: "PARTIAL", RECONSTRUCTED: "RECONSTRUCTED",
  NOT_CONNECTED: "NOT CONNECTED", NOT_BUILT: "NOT BUILT", UNSUPPORTED: "UNSUPPORTED",
};

/**
 * THE CERTIFICATE OUTRANKS THE MAP (Sheriff P1-3, 2026-10-08: the Settings map
 * read Webull "Cancel order LIVE" / "Positions LIVE" while the certificate had
 * not proved those stages). The map says what a rail is BUILT for; whether it
 * is PROVED is the certificate's fact (/api/broker/certification, the one
 * observed owner). Each claim that can be proved names its certificate stage.
 */
export const CAPABILITY_CERT_STAGE: Readonly<Partial<Record<CapabilityId, string>>> = {
  QUOTES: "read_market_data", BARS: "read_market_data", LIVE_PRINTS: "read_market_data",
  OPTIONS_CHAIN: "read_market_data", GREEKS: "read_market_data", FUTURES_OPTIONS: "read_market_data",
  POSITIONS: "read_account_state",
  EXEC_EQUITY: "submit_order", EXEC_OPTION: "submit_order", EXEC_FUTURE: "submit_order",
  EXEC_FUTURE_OPTION: "submit_order", EXEC_CRYPTO: "submit_order",
  CANCEL: "cancel_order",
};

/** One broker's certificate as the route reports it (stage names only). */
export interface CapabilityCertificate {
  readonly passedStages: readonly string[];
  readonly failedStages: readonly string[];
  readonly blockedStages: readonly string[];
}

/**
 * The word for one row given the certificate (null = not read) and the arms.
 * A claim of LIVE / ARMED stands only when its certificate stage PASSED;
 * otherwise the row says it is built and what the certificate says. Rows with
 * no certificate stage (history, P&L, unsupported …) keep their own word.
 */
export function capabilityClaimWord(row: Pick<CapabilityRow, "capability" | "state">, cert: CapabilityCertificate | null, arms: ExecutionArms): string {
  const claims = row.state === "LIVE" || row.state === "HUMAN_ARMED" || row.state === "PARTIAL";
  const stage = CAPABILITY_CERT_STAGE[row.capability];
  if (!claims || !stage) return capabilityStateWord(row.state, arms);
  const name = stage.replace(/_/g, " ");
  if (!cert) return `BUILT · CERTIFICATE UNREAD (${name})`;
  if (cert.failedStages.includes(stage)) return `BUILT · CERTIFICATE FAILED (${name})`;
  // Blocked with nothing failed is a GATE (not switched on), the same word the
  // readiness board uses (selectCertificationJoint GATED) — never a fault.
  if (cert.blockedStages.includes(stage)) return cert.failedStages.length === 0 ? `BUILT · GATED (${name} not switched on)` : `BUILT · CERTIFICATE BLOCKED (${name})`;
  if (!cert.passedStages.includes(stage)) return `BUILT · NOT PROVED (${name} not yet certified)`;
  return capabilityStateWord(row.state, arms);
}

/** The two arms a live order needs (device guardrail + server limits), each null when unread. */
export interface ExecutionArms {
  readonly device: boolean | null;
  readonly server: boolean | null;
  readonly killSwitch: boolean | null;
}

/**
 * The word for a capability AS OF the arms (Sheriff P1-3, 2026-10-08: the map
 * said "ARMED BY YOU" while device and server were both DISARMED). HUMAN_ARMED
 * is a property of the RAIL (it sends only on your armed press); whether it is
 * armed NOW is the arms' fact. "ARMED BY YOU" only when both arms are on and
 * the kill switch is off; otherwise the word says what stands in the way.
 */
export function capabilityStateWord(state: CapabilityState, arms: ExecutionArms): string {
  if (state !== "HUMAN_ARMED") return STATE_WORD[state];
  if (arms.killSwitch === true) return "KILL SWITCH ON";
  if (arms.device === null || arms.server === null) return "ARM UNREAD";
  if (arms.device && arms.server) return STATE_WORD.HUMAN_ARMED;
  return `DISARMED (${!arms.device && !arms.server ? "device + server" : !arms.device ? "device" : "server"}) — orders need your arm`;
}
