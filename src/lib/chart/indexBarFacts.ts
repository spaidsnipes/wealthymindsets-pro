/**
 * indexBarFacts — the three cells of the bottom chart bar, each owning what it
 * is entitled to claim.
 *
 * Every chart screen carries this bar. It sits directly beneath the price
 * canvas and directly beside the US cash-session label a trader uses to decide
 * whether the market is open. Three defects lived in it.
 *
 * DEFECT ONE — A HARDCODED UTC OFFSET IS A CLAIM ABOUT THE CALENDAR.
 *
 *     const etOffset = -5;
 *     const etMs = now.getTime() + etOffset * 3600 * 1000;
 *
 * -5 is EASTERN STANDARD TIME. Eastern is on DAYLIGHT time (-4) from the second
 * Sunday in March to the first Sunday in November — roughly EIGHT MONTHS of
 * every year. For those eight months this clock was ONE HOUR BEHIND, and it was
 * observed wrong on production: the bar read 17:03 while America/New_York read
 * 18:03. It is not a labelling defect. It is a WRONG NUMBER, rendered in a
 * monospace clock face next to a session label, on every chart screen.
 *
 * The root cause is that the component did calendar arithmetic itself instead of
 * asking the only thing that knows the DST rules. `Intl.DateTimeFormat` with
 * `timeZone: "America/New_York"` follows the IANA database; a literal `-5` is a
 * hand-copied assertion about the calendar that cannot follow anything.
 *
 * A clock that names no zone is also a clock the reader must guess at, so the
 * zone abbreviation is now PRINTED — EDT or EST, whichever is actually in force.
 * The reading states which clock it is rather than leaving "18:03" to be read as
 * local time by a trader in London.
 *
 * DEFECT TWO — A BARE GLYPH FOR A QUOTE THAT NEVER ARRIVED. The price cell fell
 * back to "—" with the explanation hidden in a `title`. A dash is not a reading.
 *
 * DEFECT THREE — AN `&&`/TERNARY THAT DELETES THE CELL. `{hasChange ? (…) :
 * null}` rendered an absent day-change as NO PIXELS AT ALL. A reader cannot
 * question an omission they never saw happen. Worse, the SAME `null` was shown
 * for two different situations — no quote at all, and a quote with no provider
 * reference close — which is exactly the survivor `monitorChangeFact` already
 * separates on /ai-bot. Those are different gaps and they now say so.
 *
 * WHAT IS DELIBERATELY *NOT* CLAIMED HERE:
 *   - Nothing claims the quote is real-time. The bar says a quote arrived, not
 *     how stale it is; latency is not something this cell can see.
 *   - Nothing claims the session label and the clock were sampled together.
 *   - A flat change is still withheld by `selectTickerChangeDisplay`, because
 *     the current ticker shape cannot distinguish "genuinely flat" from "no
 *     reference close". This owner reports that withholding honestly instead of
 *     rendering nothing — it does not pretend to have resolved it.
 *
 * PURE — no I/O. The clock owner takes the Date; it never reads one.
 */

/** Three readings and an absence. Colour may be derived from NOTHING ELSE. */
export type BarTone = "UP" | "DOWN" | "FLAT" | "NONE";

export interface BarCellFact {
  readonly text: string;
  /** True only when this cell is showing an actual reading. */
  readonly measured: boolean;
  readonly tone: BarTone;
  readonly reason: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * The last-price cell.
 *
 * `useWebSocket` hands back a ZERO-INITIALISED ticker before any subscription
 * resolves, so a finite 0 is the signature of "nothing arrived", not of a
 * free instrument. Both arms say which it is.
 */
export function indexQuoteFact(price: unknown): BarCellFact {
  if (!finite(price) || price <= 0) {
    return {
      text: "No quote",
      measured: false,
      tone: "NONE",
      reason:
        "No verified quote has arrived from the current feed for this instrument. " +
        "The socket hands back a zero-initialised ticker before a subscription resolves, " +
        "so WM treats a price of zero as NOTHING RECEIVED rather than as a price of zero. " +
        "This is an absence of data, not a reading of any value.",
    };
  }
  return {
    text: price.toFixed(2),
    measured: true,
    tone: "FLAT",
    reason:
      "Last price received on the live socket for this instrument. " +
      "WM does not claim how stale it is: this cell can see that a quote arrived, not when it was struck at the exchange.",
  };
}

/**
 * The day-change cell.
 *
 * Two different gaps used to render as the same nothing. They are separated
 * here, and NEITHER renders as empty space.
 */
export function indexChangeFact(
  hasQuote: boolean,
  change: { readonly displayable: boolean; readonly change: number; readonly changePct: number; readonly direction: "up" | "down" | "flat" },
): BarCellFact {
  if (!hasQuote) {
    return {
      text: "no change without a quote",
      measured: false,
      tone: "NONE",
      reason:
        "There is no day change because there is no quote to compare. This is the SAME gap as the price cell beside it, " +
        "not a second one — WM says so rather than rendering an empty space a reader cannot question.",
    };
  }
  if (!change.displayable) {
    return {
      text: "no reference close",
      measured: false,
      tone: "NONE",
      reason:
        "A live price IS arriving for this instrument — the figure beside this one is real. " +
        "What is missing is the provider's prior session close, which a day change is measured against. " +
        "This is a SEPARATE GAP from having no quote, and WM will not paint a green +0.00% over it. " +
        "An exactly-flat move is also withheld here, because the current ticker shape cannot distinguish genuinely flat from no reference close.",
    };
  }
  const tone: BarTone =
    change.direction === "up" ? "UP" : change.direction === "down" ? "DOWN" : "FLAT";
  const sign = tone === "UP" ? "+" : "";
  const arrow = tone === "UP" ? "▲" : tone === "DOWN" ? "▼" : "•";
  return {
    text: `${arrow} ${sign}${change.change.toFixed(2)} ${sign}${change.changePct.toFixed(2)}%`,
    measured: true,
    tone,
    reason:
      "Change against the provider's prior session close for this instrument. " +
      "Both the absolute and the percent figure come from the same provider reference; WM did not derive one from the other.",
  };
}

export interface ClockFact {
  readonly text: string;
  readonly measured: boolean;
  readonly reason: string;
}

const CLOCK_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * The Exchange-time clock.
 *
 * Asks `Intl` for America/New_York rather than asserting an offset, so the
 * reading follows the IANA DST rules instead of being right for four months a
 * year. The zone abbreviation in force is printed, so the number states which
 * clock it is.
 */
export function easternClockFact(now: Date | null | undefined): ClockFact {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return {
      text: "No clock reading",
      measured: false,
      reason:
        "WM has not taken a clock reading yet. Before hydration there is no client clock to read, and WM renders that absence rather than a server time a trader would read as their exchange time.",
    };
  }
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).formatToParts(now);
  } catch {
    return {
      text: "Exchange clock unavailable",
      measured: false,
      reason:
        "This browser could not resolve the America/New_York time zone, so WM cannot state the exchange time. " +
        "It will not substitute a fixed offset: an assumed offset is wrong for roughly eight months of every year.",
    };
  }
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  const monthNum = Number(get("month"));
  const zone = get("timeZoneName");
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12 || zone === "") {
    return {
      text: "Exchange clock unavailable",
      measured: false,
      reason:
        "WM could not read a complete exchange-time reading from this browser's formatter, so it states nothing rather than a partial time.",
    };
  }
  let hour = get("hour");
  // Some ICU builds render midnight as "24" under hour12:false.
  if (hour === "24") hour = "00";
  const text = `${CLOCK_MONTHS[monthNum - 1]} ${get("day")} ${hour}:${get("minute")}:${get("second")} ${zone}`;
  return {
    text,
    measured: true,
    reason:
      `Current time at the exchange, resolved through the America/New_York time zone database — which is why it reads ${zone} rather than a fixed offset. ` +
      "WM does not compute this from a hardcoded UTC offset: a literal offset is an assertion about the calendar, and it is wrong for roughly eight months of every year. " +
      "This is this browser's clock as the exchange would read it; it is NOT an exchange-stamped time and WM does not claim the two are synchronised.",
  };
}
