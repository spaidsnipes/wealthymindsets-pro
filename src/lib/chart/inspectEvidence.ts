/**
 * INSPECT DEPTH — Garden 19 §28. THE ONE EVIDENCE-CLASS LINE FOR EVERY
 * SELECTED OBJECT.
 *
 * Every Inspect ticket already prints what its owner measured. What was
 * uneven: whether it said, in ONE canon word, how good that evidence is —
 * FULL / PARTIAL / DEGRADED / SILENT (the Drive canon's evidence ladder) —
 * WHY, FROM WHICH SOURCE, and AS OF WHEN. This module does not measure
 * anything: it reads the facts each owner already published (a print's
 * aggressor method, a profile's fidelity, the anatomy's effort basis, the
 * derivatives chain's fidelity, the weather's class) and maps them onto the
 * ladder, one rule per kind, so the words cannot drift ticket to ticket.
 *
 * DEGRADED BEHAVIOUR: the chart's feed state caps the class. A measurement
 * taken on a DELAYED / STALE / REPLAY / PROXY feed is still the measurement,
 * but it is not FULL evidence about the market NOW — it is printed DEGRADED
 * with the feed's own sentence (`feedWords`, the education owner's words).
 */
import type { AggressorMethod } from "@/lib/marketData/marketEvent";
import type { EffortBasis } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { MarketQualityState } from "@/lib/marketData/canonicalMarketState";
import { feedWords } from "@/lib/chart/inventionEducation";

export type EvidenceClass = "FULL" | "PARTIAL" | "DEGRADED" | "SILENT";

export interface InspectEvidence {
  readonly klass: EvidenceClass;
  /** Why this class, in one plain sentence. */
  readonly why: string;
  /** Where the evidence came from (provider / venue / owner), or null when the owner names none. */
  readonly source: string | null;
  /** Epoch ms of the newest evidence the reading stands on, or null. */
  readonly asOfMs: number | null;
  /** The feed's own sentence when the feed state lowered the class. */
  readonly feedNote: string | null;
}

export type InspectEvidenceInput =
  | { readonly kind: "PRINT"; readonly aggressorMethod: AggressorMethod | null | undefined; readonly timeMs: number | null; readonly source: string | null }
  | { readonly kind: "SLICE"; readonly found: boolean; readonly estimated: boolean; readonly asOfSec: number | null; readonly source: string | null }
  | { readonly kind: "ANATOMY"; readonly basis: EffortBasis | null; readonly asOfSec: number | null; readonly source: string | null }
  | { readonly kind: "DERIVATIVES"; readonly drawn: boolean; readonly fidelity: "DELAYED" | "SNAPSHOT" | null; readonly sourceName: string; readonly asOfMs: number | null }
  | { readonly kind: "WEATHER"; readonly measured: boolean; readonly derived: boolean; readonly asOfMs: number | null; readonly source: string | null }
  | { readonly kind: "OBJECT"; readonly birthRead: boolean; readonly asOfMs: number | null; readonly source: string | null }
  | { readonly kind: "BAR"; readonly signedTapeReaches: boolean; readonly barRead: boolean; readonly asOfMs: number | null; readonly source: string | null };

/** Feed states that cap the class at DEGRADED (the measurement is not about NOW). */
const CAPPING: ReadonlySet<MarketQualityState> = new Set(["DELAYED", "STALE", "REPLAY", "PROXY", "UNAVAILABLE"]);

function base(i: InspectEvidenceInput): Omit<InspectEvidence, "feedNote"> {
  switch (i.kind) {
    case "PRINT": {
      const m = i.aggressorMethod ?? "NONE";
      if (m === "PROVIDER" || m === "MAKER_SIDE_INVERTED") return { klass: "FULL", why: "The venue stamped which side crossed the spread.", source: i.source, asOfMs: i.timeMs };
      if (m === "TICK_RULE" || m === "QUOTE_TEST") return { klass: "PARTIAL", why: "Size and price are the venue's; the side is INFERRED (tick rule / quote test), not stamped.", source: i.source, asOfMs: i.timeMs };
      return { klass: "DEGRADED", why: "Size and price are real, but no side was stated — buy vs sell is not claimed.", source: i.source, asOfMs: i.timeMs };
    }
    case "SLICE":
      if (!i.found) return { klass: "SILENT", why: "No traded bucket at that price — nothing was measured there.", source: i.source, asOfMs: i.asOfSec != null ? i.asOfSec * 1000 : null };
      return i.estimated
        ? { klass: "PARTIAL", why: "Volume is spread over each bar's range from the bar totals — the shape is honest, single rows are approximate.", source: i.source, asOfMs: i.asOfSec != null ? i.asOfSec * 1000 : null }
        : { klass: "FULL", why: "Volume placed at the price each print traded.", source: i.source, asOfMs: i.asOfSec != null ? i.asOfSec * 1000 : null };
    case "ANATOMY": {
      const at = i.asOfSec != null ? i.asOfSec * 1000 : null;
      if (i.basis === "SIGNED_DELTA") return { klass: "FULL", why: "Effort measured from provider-stamped sides on every bar.", source: i.source, asOfMs: at };
      if (i.basis === "INFERRED_DELTA") return { klass: "PARTIAL", why: "Effort measured from sides INFERRED by the chart's tick accumulator.", source: i.source, asOfMs: at };
      if (i.basis === "VOLUME") return { klass: "PARTIAL", why: "Bar volume only, unsigned — a candidate, not a confirmed reading.", source: i.source, asOfMs: at };
      return { klass: "SILENT", why: "No volume and no split in this window — nothing is graded.", source: i.source, asOfMs: at };
    }
    case "DERIVATIVES":
      if (!i.drawn) return { klass: "SILENT", why: "The derivatives reading went silent — nothing is guessed at.", source: i.sourceName, asOfMs: i.asOfMs };
      return i.fidelity === "SNAPSHOT"
        ? { klass: "PARTIAL", why: "A live public chain snapshot; exposure is INFERRED from open interest under a dealer-positioning assumption.", source: i.sourceName, asOfMs: i.asOfMs }
        : { klass: "DEGRADED", why: "The options chain is DELAYED; exposure is INFERRED from open interest under a dealer-positioning assumption.", source: i.sourceName, asOfMs: i.asOfMs };
    case "WEATHER":
      if (!i.measured) return { klass: "SILENT", why: "Unmeasured — no weather is guessed at.", source: i.source, asOfMs: i.asOfMs };
      return i.derived
        ? { klass: "PARTIAL", why: "DERIVED from traded bars (volume per bar-range travel), not per-trade tape.", source: i.source, asOfMs: i.asOfMs }
        : { klass: "FULL", why: "MEASURED from per-trade tape.", source: i.source, asOfMs: i.asOfMs };
    case "OBJECT":
      return i.birthRead
        ? { klass: "FULL", why: "Built from the chart's own admitted bars; its birth bar and tests are on record.", source: i.source, asOfMs: i.asOfMs }
        : { klass: "PARTIAL", why: "Built from the chart's bars, but its birth bar has no admitted identity — lineage is incomplete.", source: i.source, asOfMs: i.asOfMs };
    case "BAR":
      if (!i.barRead) return { klass: "SILENT", why: "No bar under the cursor to read.", source: i.source, asOfMs: i.asOfMs };
      return i.signedTapeReaches
        ? { klass: "FULL", why: "OHLCV plus signed prints inside this bar.", source: i.source, asOfMs: i.asOfMs }
        : { klass: "PARTIAL", why: "OHLCV only — no signed prints reach this bar, so delta and imbalance stay unread.", source: i.source, asOfMs: i.asOfMs };
  }
}

export function inspectEvidence(input: InspectEvidenceInput, feed?: MarketQualityState | "UNKNOWN" | null): InspectEvidence {
  const b = base(input);
  const capped = feed != null && feed !== "UNKNOWN" && CAPPING.has(feed) && (b.klass === "FULL" || b.klass === "PARTIAL");
  // PARTIAL feed = some senses missing; it never lowers a reading whose own sense is present.
  const note = feed != null && feed !== "UNKNOWN" && feed !== "LIVE" ? feedWords(feed) : null;
  return {
    ...b,
    klass: capped ? "DEGRADED" : b.klass,
    why: capped ? `${b.why} Lowered to DEGRADED: the feed is ${feed}.` : b.why,
    feedNote: note,
  };
}
