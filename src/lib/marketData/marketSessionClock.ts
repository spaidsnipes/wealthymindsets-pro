/**
 * MARKET SESSION CLOCK — the open-session half of the canonical session owner.
 *
 * MEASURED 2026-10-07 12:20–12:50 CDT, a Wednesday, US regular hours: the
 * phone header pill, the WAIT plaque, /command-deck ("session SESSION ?") and
 * /paper ("Whether this market is open") all printed SESSION ? for TSLA, NQ1!
 * and EURUSD. `provenSessionClosure` can only ever prove CLOSED, so an open
 * market was always an unknown one — a missing fact, not humility. The venues'
 * weekly hours are PUBLISHED; reading them is not a guess.
 *
 * Every verdict carries its basis. What this owner does NOT hold is a holiday
 * calendar: no exchange-holiday table exists in this codebase, so every
 * listed-venue verdict says "holiday calendar not loaded" in its basis instead
 * of pretending a holiday cannot happen.
 *
 * Schedules, on the market's clock (America/New_York, DST-correct upstream):
 *   US equities / ETFs (NYSE/Nasdaq listed hours, Mon–Fri)
 *       PRE   04:00–09:30 · OPEN (RTH) 09:30–16:00 · POST 16:00–20:00
 *       OVERNIGHT 20:00–04:00 Sun night → Fri morning (off-exchange ATS
 *       session — night shift 2026-10-07: TSLA printed 5m bars at 21:10 CDT
 *       while the plaque said CLOSED); Fri 20:00 → Sun 20:00 CLOSED
 *   US equity options      OPEN 09:30–16:00 Mon–Fri, otherwise CLOSED
 *   US cash indices        OPEN 09:30–16:15 Mon–Fri (index calculation), else CLOSED
 *   CME Globex futures     Sun 18:00 → Fri 17:00, daily break 17:00–18:00 Mon–Thu
 *                          (CBOT grains and CME livestock keep other hours → null)
 *   Spot FX                Sun 17:00 → Fri 17:00
 *   Crypto                 OPEN 24×7
 *
 * PURE. DETERMINISTIC. Takes the ET clock already read by the caller
 * (canonicalIdentity.marketClockET), so this module imports nothing.
 */

export type MarketSessionVerdict = "OPEN" | "CLOSED" | "PRE" | "POST" | "OVERNIGHT";

export type MarketSessionSchedule =
  | "US_EQUITY_LISTED"
  | "US_EQUITY_OPTIONS"
  | "US_CASH_INDEX"
  | "CME_GLOBEX"
  | "SPOT_FX"
  | "CONTINUOUS";

export interface MarketSessionReading {
  readonly verdict: MarketSessionVerdict;
  /** Compact chip text, ≤ 9 characters: OPEN · PRE · POST · CLOSED · 24X7. Never "RTH" — that word is canonicalSession()'s store-key vocabulary, banned from chips. */
  readonly token: string;
  readonly schedule: MarketSessionSchedule;
  /** Why — the published hours this verdict was read from, in words. */
  readonly basis: string;
  readonly holidayCalendar: "NOT_LOADED" | "NOT_APPLICABLE";
}

export interface MarketSessionClockInput {
  readonly symbol: string;
  readonly assetClass: "crypto" | "equity" | "etf" | "futures" | "forex" | "options";
  /** ET weekday (0 = Sunday) and minute of the ET day; null when unreadable. */
  readonly clock: { readonly weekday: number; readonly minuteOfDay: number } | null;
  readonly isUsCashIndex: boolean;
}

const M = (h: number, m = 0) => h * 60 + m;
const HOLIDAY = "holiday calendar not loaded";
/** CBOT grains and CME livestock: their own published hours, not Globex's. */
const OTHER_HOURS_FUTURES = /^\/?(ZC|ZW|ZS|ZM|ZL|KE|LE|HE|GF)(?=$|\d|!|=|[FGHJKMNQUVXZ]\d)/;

function reading(verdict: MarketSessionVerdict, token: string, schedule: MarketSessionSchedule, basis: string, holiday = true): MarketSessionReading {
  return { verdict, token, schedule, basis: holiday ? `${basis} · ${HOLIDAY}` : basis, holidayCalendar: holiday ? "NOT_LOADED" : "NOT_APPLICABLE" };
}

export function readMarketSession(input: MarketSessionClockInput): MarketSessionReading | null {
  const { assetClass, clock } = input;
  if (assetClass === "crypto") {
    return reading("OPEN", "24X7", "CONTINUOUS", "continuous market — trades every hour of every day", false);
  }
  if (!clock) return null;
  const { weekday: d, minuteOfDay: m } = clock;
  const weekday = d >= 1 && d <= 5;

  if (input.isUsCashIndex) {
    const open = weekday && m >= M(9, 30) && m < M(16, 15);
    return open
      ? reading("OPEN", "OPEN", "US_CASH_INDEX", "index calculated 09:30–16:15 ET Mon–Fri")
      : reading("CLOSED", "CLOSED", "US_CASH_INDEX", "outside index calculation hours 09:30–16:15 ET Mon–Fri");
  }

  if (assetClass === "options") {
    const open = weekday && m >= M(9, 30) && m < M(16);
    return open
      ? reading("OPEN", "OPEN", "US_EQUITY_OPTIONS", "US options regular hours 09:30–16:00 ET Mon–Fri")
      : reading("CLOSED", "CLOSED", "US_EQUITY_OPTIONS", "outside US options hours 09:30–16:00 ET Mon–Fri");
  }

  if (assetClass === "equity" || assetClass === "etf") {
    if (weekday) {
      if (m >= M(4) && m < M(9, 30)) return reading("PRE", "PRE", "US_EQUITY_LISTED", "pre-market 04:00–09:30 ET");
      if (m >= M(9, 30) && m < M(16)) return reading("OPEN", "OPEN", "US_EQUITY_LISTED", "regular hours 09:30–16:00 ET");
      if (m >= M(16) && m < M(20)) return reading("POST", "POST", "US_EQUITY_LISTED", "post-market 16:00–20:00 ET");
    }
    // The overnight ATS session: Sunday 20:00 → Friday 04:00 ET, nights only.
    // Listed exchanges are shut; off-exchange venues print thin size.
    const overnight = (d === 0 && m >= M(20)) || (d >= 1 && d <= 4 && m >= M(20)) || (d >= 1 && d <= 5 && m < M(4));
    if (overnight) return reading("OVERNIGHT", "OVERNIGHT", "US_EQUITY_LISTED", "overnight session 20:00–04:00 ET — off-exchange venues only, thin prints; listed exchanges closed");
    return reading("CLOSED", "CLOSED", "US_EQUITY_LISTED", "weekend — no US equity venue trades Fri 20:00 → Sun 20:00 ET");
  }

  if (assetClass === "futures") {
    if (OTHER_HOURS_FUTURES.test(input.symbol.trim().toUpperCase())) return null;
    const closed =
      d === 6 ||
      (d === 0 && m < M(18)) ||
      (d === 5 && m >= M(17)) ||
      (d >= 1 && d <= 4 && m >= M(17) && m < M(18));
    if (!closed) return reading("OPEN", "OPEN", "CME_GLOBEX", "CME Globex Sun 18:00 → Fri 17:00 ET, daily break 17:00–18:00 ET");
    const why = d >= 1 && d <= 4 ? "CME Globex daily maintenance break 17:00–18:00 ET" : "CME Globex weekend close Fri 17:00 → Sun 18:00 ET";
    return reading("CLOSED", "CLOSED", "CME_GLOBEX", why);
  }

  if (assetClass === "forex") {
    const closed = d === 6 || (d === 0 && m < M(17)) || (d === 5 && m >= M(17));
    return closed
      ? reading("CLOSED", "CLOSED", "SPOT_FX", "spot FX weekend close Fri 17:00 → Sun 17:00 ET")
      : reading("OPEN", "OPEN", "SPOT_FX", "spot FX trades Sun 17:00 → Fri 17:00 ET");
  }

  return null;
}
