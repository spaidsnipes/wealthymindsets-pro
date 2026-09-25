/**
 * selectInspectTicket — FL-06, THE INSPECT TICKET.
 *
 * `WM_FL_06_ORDERFLOW_ON_CHART.jpg` stamps its own thesis across the top-right
 * corner in red: **"NO ESSAY DRAWER AS PRIMARY TRUTH."** The plate's answer to
 * that stamp is the small panel it draws over the candles — click a bar, and
 * the bar itself tells you what it is made of, right there, instead of sending
 * you to a drawer to read prose about it.
 *
 * The plate's ticket carries exactly four things:
 *
 *   Selected Bar   09:41:25 · Price 5297.75
 *   asOf           09:41:25.217 CT
 *   fidelity       98.7%
 *   Order Flow     Delta +132 · Volume 623 · Imbalance 2.1:1
 *   → View Full Footprint
 *
 * ── THE THING THE PLATE CANNOT KNOW, AND THIS ROOM DOES ────────────────────
 *
 * The picture implies any bar can be inspected. In this product that is false,
 * and the falsehood is not small.
 *
 * `useWebSocket` retains `RECENT_TICK_RETENTION` prints — 2,000, through
 * `retainRecentTicks`, the one named rule. That is the entire per-trade tape
 * any consumer in the chart room can see, and it is a LIVE window: it holds
 * the most recent trades and nothing older. On an active future that is on
 * the order of a minute; on a thin tape it can be far longer. Delta and
 * imbalance are readings about individual trades, and a bar older than the
 * window has no trades left in this room to read. Its OHLC survives — the bar
 * series is fetched history — but the tape that made it is gone. How far back
 * the window reaches depends on the market, so this compiler MEASURES it for
 * each bar rather than assuming it.
 *
 * So a ticket that printed `Delta +132` for whichever bar the trader happened
 * to click would be inventing the most persuasive number on the panel. It would
 * be the beautiful lie in its purest form: a precise signed integer, rendered
 * in the colour of the side it favours, describing trades nobody here has.
 *
 * THE RULE THIS COMPILER ENFORCES:
 *
 *   A PER-TRADE READING IS PRINTED ONLY FOR A BAR THE HELD TAPE ACTUALLY
 *   REACHES. WHEN IT DOES NOT REACH, THE TICKET SAYS SO IN THE ROW WHERE THE
 *   NUMBER WOULD HAVE BEEN, AND NAMES WHICH FACT WAS MISSING.
 *
 * Volume is different, and the difference is the whole reason the ticket is
 * still worth opening on an old bar: volume comes from the BAR, not the tape.
 * It is real on every bar the series loaded. So an old bar's ticket reads one
 * row and refuses two, which is a true and useful thing to be told.
 *
 * ── THE UNIT TRAP, NAMED IN THE FIELD NAMES ────────────────────────────────
 *
 * `LegacyOhlcvTuple.time` is epoch SECONDS across this repo. `Tick.time` is
 * epoch MILLISECONDS. `canonicalBar.ts` already carries a warning about this
 * pair because both are bare `number` and nothing in the type system separates
 * them. Comparing the two would put every print outside every bar, and the
 * ticket would refuse every reading while looking perfectly well-behaved.
 *
 * Every time field on this module's input therefore carries its unit IN ITS
 * NAME — `barOpenMs`, `barSpanMs`, `timeMs` — so the conversion has to happen
 * at the call site, where the caller knows which clock it is holding. There is
 * a test for a seconds-shaped input producing a refusal rather than a reading.
 *
 * ── REFUSED FROM THE PLATE, WITH REASONS ───────────────────────────────────
 *
 *  · `fidelity 98.7%` — this room has no per-bar fidelity owner on the live
 *    path. `canonicalBar.ts` declares `fidelity` on `CanonicalBar`, but the
 *    bars the chart actually draws are `LegacyOhlcvTuple` and carry no such
 *    field; that file says so itself ("Identity on the live path is still
 *    owed"). A percentage invented here would be a confidence score for a
 *    measurement nobody took. The row is offered, and reads UNREAD naming the
 *    absent owner, until the live path carries identity.
 *  · `09:41:25.217 CT` — the millisecond and the exchange timezone are the
 *    picture's. This compiler emits epoch milliseconds and lets the renderer
 *    format in the viewer's own locale. Printing `CT` on a clock this room did
 *    not convert would be a fabricated location, the same class of refusal
 *    `selectFootprintWorksheet` records for `PREMIUM ZONE (Above Weekly VWAP)`.
 *  · `5297.75`, `+132`, `623`, `2.1:1` — the plate's figures. No owner. They
 *    belong to the same illustrative set as the rest of the mockup's numbers.
 *
 * Nothing here decides anything and nothing here renders. It reads a bar, reads
 * the held tape, and compiles what can honestly be said about the two together.
 */

export const INSPECT_TICKET_VERSION = 1;

/** Same two-state vocabulary the division worksheets use. One grammar, one OS. */
export type TicketState = "READ" | "UNREAD";

export type TicketRowId = "VOLUME" | "DELTA" | "IMBALANCE" | "FIDELITY";

/**
 * HOW FAR THE HELD TAPE REACHES, RELATIVE TO THE BAR THE TRADER CLICKED.
 *
 * This is the single fact that decides whether the per-trade rows can be read,
 * so it is published rather than left implicit inside each row's `absence`. A
 * surface that wants to explain the ticket as a whole — or grey the panel, or
 * offer a "click the live bar instead" hint — needs the reason once, not three
 * times in three sentences it would have to parse.
 */
export type TapeReach =
  /** Prints held in this room fall inside the selected bar's window. */
  | "COVERS_BAR"
  /** Prints are held, but all of them are outside this bar. The usual case. */
  | "TAPE_IS_ELSEWHERE"
  /** Prints reach the bar, but none of them state which side crossed. */
  | "TAPE_IS_UNSIGNED"
  /** No per-trade prints at all. */
  | "NO_TAPE"
  /** The bar itself was not supplied, so there is nothing to reach toward. */
  | "NO_BAR";

export interface TicketRow {
  readonly id: TicketRowId;
  /** The plate's own word for this row, kept verbatim where it had one. */
  readonly label: string;
  readonly state: TicketState;
  /** The answer, formatted. Non-null exactly when READ. */
  readonly value: string | null;
  /** What was measured to get it, in the owner's words. Non-null when READ. */
  readonly basis: string | null;
  /** Why this room could not read it. Non-null exactly when UNREAD. */
  readonly absence: string | null;
  /** The module a reviewer can grep. Named on UNREAD rows too. */
  readonly owner: string;
}

export interface InspectTicketVM {
  readonly version: typeof INSPECT_TICKET_VERSION;
  /** One line naming what the ticket is about. Never empty. */
  readonly headline: string;
  /** Epoch MILLISECONDS, or null. The renderer formats; this does not. */
  readonly barOpenMs: number | null;
  /** The selected bar's close. The plate's "Price". */
  readonly price: number | null;
  readonly rows: readonly TicketRow[];
  readonly readCount: number;
  readonly unreadCount: number;
  readonly reach: TapeReach;
  /** One honest sentence about the tape's reach. Never empty. */
  readonly reachNote: string;
  /**
   * The plate's `View Full Footprint →`. A door that leads somewhere empty is
   * worse than no door, so it is only offered when the footprint below could
   * actually divide this bar — which is the same condition as a signed tape
   * reaching it.
   */
  readonly footprintDoorAvailable: boolean;
  /** Why the door is or is not offered. Never empty. */
  readonly footprintDoorNote: string;
}

export interface InspectPrint {
  readonly price?: number | null;
  readonly size?: number | null;
  /** `buy` = buyer crossed (ask side). `sell` = seller crossed (bid side). */
  readonly side?: "buy" | "sell" | null | undefined;
  /** EPOCH MILLISECONDS. The unit is in the name; see the header. */
  readonly timeMs?: number | null;
  /** Only executed trades divide. Quotes and book updates are not prints. */
  readonly trade?: boolean;
}

export interface InspectTicketInput {
  /** The clicked bar's open time, EPOCH MILLISECONDS. */
  readonly barOpenMs?: number | null;
  /** How wide the bar is, MILLISECONDS. A 15m bar is 900_000. */
  readonly barSpanMs?: number | null;
  /** The bar's close — the plate's "Price". */
  readonly price?: number | null;
  /** The bar's own traded volume. Comes from the bar, never from the tape. */
  readonly barVolume?: number | null;
  /** The per-trade tape this room is holding. */
  readonly prints?: readonly InspectPrint[] | null;
}

/**
 * Below this many in-window prints, a delta is one or two trades wearing a
 * sign. `selectFootprintWorksheet` sets `MIN_PRINTS_FOR_LADDER = 24` against
 * the same retention ceiling for a SIX-LEVEL division; a single signed sum is a
 * coarser question than a per-level ladder, so it can stand on fewer prints —
 * but not on one. Four is the smallest count at which a delta describes a
 * balance rather than a coin flip.
 *
 * Named and exported because it is a reading about the tape, not a preference,
 * and because it must be retuned WITH the retention ceiling if that changes.
 */
export const MIN_PRINTS_FOR_DELTA = 4;

const OWNER = "selectInspectTicket";

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const row = (
  id: TicketRowId,
  label: string,
  read: { value: string; basis: string } | null,
  absence: string,
): TicketRow =>
  read
    ? { id, label, state: "READ", value: read.value, basis: read.basis, absence: null, owner: OWNER }
    : { id, label, state: "UNREAD", value: null, basis: null, absence, owner: OWNER };

/**
 * FIDELITY IS ALWAYS UNREAD, AND THAT IS NOT A STUB.
 *
 * The plate prints `98.7%`. `CanonicalBar` declares a `fidelity` field, but the
 * bars this chart draws are legacy tuples that carry none — a fact
 * `canonicalBar.ts` states about itself. Rather than drop the row (which would
 * hide the debt) or invent a number (which would be the lie), the row is
 * present and names the absent owner. The day the live path carries identity,
 * this is the one place to change.
 */
const FIDELITY_ABSENCE =
  "No per-bar fidelity is carried on this chart's bars. CanonicalBar declares " +
  "the field; the legacy tuples the chart draws do not fill it, so there is no " +
  "measurement here to report a percentage of.";

export function selectInspectTicket(input: InspectTicketInput): InspectTicketVM {
  const barOpenMs = isFiniteNumber(input.barOpenMs) ? input.barOpenMs : null;
  const barSpanMs =
    isFiniteNumber(input.barSpanMs) && input.barSpanMs > 0 ? input.barSpanMs : null;
  const price = isFiniteNumber(input.price) ? input.price : null;
  const barVolume =
    isFiniteNumber(input.barVolume) && input.barVolume >= 0 ? input.barVolume : null;

  const allPrints = Array.isArray(input.prints) ? input.prints : [];

  /* Only executed trades divide. A quote is not a print. */
  const trades = allPrints.filter(
    p =>
      p.trade === true &&
      isFiniteNumber(p.timeMs) &&
      isFiniteNumber(p.size) &&
      (p.size as number) > 0,
  );

  const inWindow =
    barOpenMs !== null && barSpanMs !== null
      ? trades.filter(
          p => (p.timeMs as number) >= barOpenMs && (p.timeMs as number) < barOpenMs + barSpanMs,
        )
      : [];

  const signed = inWindow.filter(p => p.side === "buy" || p.side === "sell");

  /* ── REACH ─────────────────────────────────────────────────────────────── */

  let reach: TapeReach;
  let reachNote: string;

  if (barOpenMs === null || barSpanMs === null) {
    reach = "NO_BAR";
    reachNote =
      "No bar was selected, so there is nothing for the tape to reach toward. " +
      "Click a candle to open its ticket.";
  } else if (trades.length === 0) {
    reach = "NO_TAPE";
    reachNote =
      "This room is holding no per-trade prints at all. Volume comes from the " +
      "bar and survives; delta and imbalance are readings about individual " +
      "trades and cannot be taken.";
  } else if (signed.length >= MIN_PRINTS_FOR_DELTA) {
    reach = "COVERS_BAR";
    reachNote =
      `${signed.length} of the ${trades.length} prints this room is holding ` +
      "fall inside this bar and state which side crossed the spread.";
  } else if (inWindow.length > 0) {
    reach = "TAPE_IS_UNSIGNED";
    reachNote =
      `${inWindow.length} of the ${trades.length} prints this room is holding ` +
      "fall inside this bar, but too few state which side crossed the spread " +
      "to sum a delta. This venue does not sign its prints.";
  } else {
    reach = "TAPE_IS_ELSEWHERE";
    reachNote =
      `This room holds ${trades.length} per-trade prints, and none of them are ` +
      "from this bar. The tape is a live window of the last few moments — the " +
      "trades that made this bar are no longer held. Its volume still reads.";
  }

  /* ── VOLUME — FROM THE BAR, NOT THE TAPE ───────────────────────────────── */

  const volumeRow = row(
    "VOLUME",
    "Volume",
    barVolume !== null
      ? {
          value: formatCount(barVolume),
          basis:
            "Traded volume as the bar itself reports it. Not summed from the " +
            "held tape, so it is as good on an old bar as on the live one.",
        }
      : null,
    "This bar carries no volume figure. The series loaded its prices without " +
      "one, which some providers do on some symbols.",
  );

  /* ── DELTA AND IMBALANCE — FROM THE TAPE ───────────────────────────────── */

  const perTradeAbsence =
    reach === "NO_BAR"
      ? "No bar is selected."
      : reach === "NO_TAPE"
        ? "This room is holding no per-trade prints, so there are no sides to sum."
        : reach === "TAPE_IS_ELSEWHERE"
          ? "The per-trade tape this room holds does not reach this bar. It is a " +
            "live window of the last few moments, and the trades that made this " +
            "bar are no longer held. Open the ticket on the live bar instead."
          : `Fewer than ${MIN_PRINTS_FOR_DELTA} prints inside this bar state which ` +
            "side crossed the spread. This venue does not sign its prints, so a " +
            "signed sum would be a guess wearing a plus or a minus.";

  let buyVol = 0;
  let sellVol = 0;
  for (const p of signed) {
    if (p.side === "buy") buyVol += p.size as number;
    else sellVol += p.size as number;
  }
  const canRead = reach === "COVERS_BAR";
  const delta = buyVol - sellVol;

  const deltaRow = row(
    "DELTA",
    "Delta",
    canRead
      ? {
          value: `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${formatCount(Math.abs(delta))}`,
          basis:
            `Buyer-crossed volume minus seller-crossed volume across the ` +
            `${signed.length} signed prints this room holds inside this bar.`,
        }
      : null,
    perTradeAbsence,
  );

  const heavier = Math.max(buyVol, sellVol);
  const lighter = Math.min(buyVol, sellVol);
  const imbalanceReadable = canRead && lighter > 0;

  const imbalanceRow = row(
    "IMBALANCE",
    "Imbalance",
    imbalanceReadable
      ? {
          value: `${(heavier / lighter).toFixed(1)}:1 ${buyVol >= sellVol ? "buy" : "sell"}`,
          basis:
            "The heavier side's volume over the lighter side's, across the same " +
            "signed prints. The side is named because a bare ratio does not say " +
            "who it favours.",
        }
      : null,
    canRead
      ? "Every signed print inside this bar crossed on the same side, so there " +
        "is no lighter side to divide by. That one-sidedness is itself the " +
        "reading, and it is in the delta above."
      : perTradeAbsence,
  );

  const fidelityRow = row("FIDELITY", "Fidelity", null, FIDELITY_ABSENCE);

  const rows: readonly TicketRow[] = [volumeRow, deltaRow, imbalanceRow, fidelityRow];

  /* ── THE DOOR ──────────────────────────────────────────────────────────── */

  const footprintDoorAvailable = canRead;
  const footprintDoorNote = footprintDoorAvailable
    ? "The full footprint can divide this bar by price level, because the tape " +
      "this room holds reaches it and states sides."
    : "The full footprint is not offered for this bar. It divides a signed tape " +
      "by price level, and " +
      (reach === "TAPE_IS_ELSEWHERE"
        ? "this bar's trades are no longer held."
        : reach === "TAPE_IS_UNSIGNED"
          ? "this venue does not sign its prints."
          : reach === "NO_TAPE"
            ? "this room holds no prints."
            : "no bar is selected.");

  const headline =
    barOpenMs === null
      ? "No bar selected"
      : price !== null
        ? `Selected bar · ${price}`
        : "Selected bar";

  return {
    version: INSPECT_TICKET_VERSION,
    headline,
    barOpenMs,
    price,
    rows,
    readCount: rows.filter(r => r.state === "READ").length,
    unreadCount: rows.filter(r => r.state === "UNREAD").length,
    reach,
    reachNote,
    footprintDoorAvailable,
    footprintDoorNote,
  };
}

/**
 * Counts are printed with thousands separators and no forced decimals. Crypto
 * sizes are fractional and futures sizes are whole; rounding the fractional
 * ones to zero would print `0` beside a real trade, so a fraction under one
 * keeps two places and everything else keeps none.
 */
function formatCount(n: number): string {
  if (n > 0 && n < 1) return n.toFixed(2);
  return Math.round(n).toLocaleString("en-US");
}
