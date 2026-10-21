/**
 * WHERE A TRADE WAS TAKEN, AND HOW WM KNOWS IT — Megazord order §5 (2026-10-20). PURE.
 *
 * "A trade does not become nonexistent because WM Pro did not execute it." A trader who works on
 * TradingView, another broker, a prop platform or a simulator can still journal the day here, and the
 * Journal must say how it knows each trade:
 *   · BROKER-CONFIRMED — the entry carries the machine facts of a broker fill (`capture`, each field
 *     with its own provenance; journalCaptureFromFill). Broker facts outrank anything typed.
 *   · SELF-REPORTED — everything else. The prices, size and result are what the trader typed. Saying
 *     where it was traded is optional, and "not said" stays "not said"; nothing is inferred from the
 *     symbol, the time or the numbers.
 *
 * A self-reported trade is a full journal entry: it is reviewed, tagged and learned from like any other.
 * The label only stops a typed price from being read as a broker's record.
 */

export const TRADE_VENUES = [
  { id: "TRADINGVIEW", words: "TradingView" },
  { id: "TASTYTRADE", words: "tastytrade" },
  { id: "WEBULL", words: "Webull" },
  { id: "PROP_PLATFORM", words: "a prop firm's platform" },
  { id: "OTHER_BROKER", words: "another broker" },
  { id: "SIMULATOR", words: "a simulator or paper account" },
] as const;
export type TradeVenue = (typeof TRADE_VENUES)[number]["id"];

export const TRADE_VENUE_ASK = "Where was it traded? (optional)";
export const TRADE_VENUE_NOT_SAID = "Not said";

const IDS: readonly string[] = TRADE_VENUES.map(v => v.id);

/** A stored venue, or undefined. Anything unknown reads as "not said", never as a guess. */
export function readTradeVenue(value: unknown): TradeVenue | undefined {
  return typeof value === "string" && IDS.includes(value) ? (value as TradeVenue) : undefined;
}

export const venueWords = (v: TradeVenue): string => TRADE_VENUES.find(x => x.id === v)!.words;

export type EntryProvenance = {
  readonly kind: "BROKER_CONFIRMED" | "SELF_REPORTED";
  readonly venue: TradeVenue | null;
  /** The chip: "Broker-confirmed" or "Self-reported". */
  readonly label: string;
  readonly detail: string;
  /** label · detail, for one-line use. */
  readonly words: string;
};

/** How the Journal knows this trade. `hasBrokerCapture` is true only for an entry carrying broker fill facts. */
export function entryProvenance(entry: { readonly venue?: TradeVenue; readonly hasBrokerCapture: boolean }): EntryProvenance {
  const make = (kind: EntryProvenance["kind"], venue: TradeVenue | null, label: string, detail: string): EntryProvenance =>
    ({ kind, venue, label, detail, words: `${label} · ${detail}` });
  if (entry.hasBrokerCapture) return make("BROKER_CONFIRMED", null, "Broker-confirmed", "the broker's fill facts are shown below with their sources.");
  const venue = entry.venue ?? null;
  return make("SELF_REPORTED", venue, "Self-reported",
    `${venue ? `traded on ${venueWords(venue)}` : "where it was traded is not said"}. Prices, size and result are as you typed them.`);
}
