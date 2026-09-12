/**
 * scannerSignalEvidence — a scan row may not be classified from data the
 * provider never sent.
 *
 * Garden Pass (2026-09-11), MANDATORY REVIVE/NEUTER ACCEPTANCE item 5:
 *
 *   "Convert entitlement denial to zero/empty healthy value → G4/G8 fail."
 *
 * WHAT WAS MEASURED, in /scanner's own source, before this module existed:
 *
 *   const realPrice = q?.price ?? old?.price;
 *   if (realPrice == null || realPrice <= 0) return null;   // <- correct
 *   const change    = q?.change    ?? old?.change    ?? 0;  // <- fabricated
 *   const changePct = q?.changePct ?? old?.changePct ?? 0;
 *   const volume    = q?.volume    ?? old?.volume    ?? 0;
 *   const avgVol    = q?.avgVolume ?? 0;
 *
 * The comment above the first line reads "never show a fake placeholder."
 * Four lines later the row invents four of them. And two columns further
 * over, RSI does it RIGHT — `rsi: number | null`, rendered as "—" with the
 * title "RSI unavailable". The correct idiom was already in the file; the
 * money columns simply did not use it.
 *
 * THE CONSEQUENCE IS NOT COSMETIC. Those fabricated zeros are not merely
 * displayed, they are CLASSIFIED. With changePct = 0 and volRatio = 0 the
 * signal ladder falls through every branch and returns `gap-fill`, which
 * renders as a labelled trading signal — "↩ Gap Fill" — and the strength
 * bucket scores 0.03 and returns "C". So a symbol we have NO change or
 * volume data for is presented to the trader as a named setup with a
 * grade, indistinguishable from one backed by real observation.
 *
 * It is also, specifically, a lie about itself: the grade's own tooltip
 * (scannerStrength.strengthDisclosure) says "Strength grade from observed
 * data only". That sentence was true for every input except the invented
 * ones, which is the worst place for it to be false.
 *
 * WHAT THIS MODULE DOES
 *
 * It takes evidence that is allowed to be ABSENT — `number | null` — and
 * refuses to classify when a required input is missing, returning an
 * UNRATED verdict that names which input was absent. A row with an
 * unrated verdict still SHOWS: the trader keeps the symbol and its real
 * price. What disappears is the fabricated confidence, not the row.
 *
 * The weights are imported from `scannerStrength`, which owns them. The
 * page previously re-typed `0.5` and `0.3` inline under a "Keep in sync"
 * comment on the owner's export — a stale restatement waiting for someone
 * to change one and not the other (Garden gate G2).
 *
 * PURE / DETERMINISTIC — no clock, no I/O.
 */

import { strengthScore } from "@/lib/scannerStrength";

/** The scanner's signal vocabulary. Moved here so the classifier owns it. */
export type Signal =
  | "momentum-long"  | "momentum-short"
  | "breakout-bull"  | "breakout-bear"
  | "volume-surge"   | "dark-pool"
  | "vwap-reclaim"   | "gap-fill"
  | "wyckoff-accum"  | "wyckoff-dist"
  | "cvd-div-bull"   | "cvd-div-bear"
  | "options-flow"   | "earnings-play"
  | "fib-bounce"     | "supply-reject";

export type AlertStrength = "A+" | "A" | "B" | "C";

/**
 * What the row actually observed. Every field is nullable ON PURPOSE — the
 * whole defect was a shape that could not express "the provider did not
 * send this", so the caller had nowhere to put the truth and wrote 0.
 */
export interface ScanEvidence {
  /** Percent change since the reference close. Null when not observed. */
  readonly changePct: number | null;
  /** Volume / average volume. Null when either side was not observed. */
  readonly volRatio: number | null;
  /** Already nullable in the original code — the pattern this follows. */
  readonly rsi: number | null;
}

export interface ScanClassification {
  /** Null when the row could not be honestly classified. */
  readonly signal: Signal | null;
  /** Null when the row could not be honestly graded. */
  readonly strength: AlertStrength | null;
  /** True when a required input was absent. */
  readonly unrated: boolean;
  /**
   * Names the ABSENT INPUTS, not a generic apology. A trader who sees
   * "—" needs to know whether the provider withheld the change, the
   * volume, or both, because those are different problems.
   */
  readonly reason: string;
}

/** The inputs the ladder below actually reads. RSI is optional to it. */
const REQUIRED_INPUTS = ["changePct", "volRatio"] as const;

/** Human labels for the required inputs, for the trader-facing sentence. */
const INPUT_LABEL: Readonly<Record<(typeof REQUIRED_INPUTS)[number], string>> = {
  changePct: "percent change",
  volRatio: "volume ratio",
};

/**
 * The signal ladder. Unchanged from the page it was extracted from — this
 * commit is about WHEN it may run, not about what it decides. Changing
 * both at once would make a behaviour regression unattributable.
 */
function ladder(changePct: number, volRatio: number, rsi: number | null): Signal {
  if (changePct > 3  && volRatio > 3) return "breakout-bull";
  if (changePct < -3 && volRatio > 3) return "breakout-bear";
  if (changePct > 1.5 && volRatio > 2) return "momentum-long";
  if (changePct < -1.5 && volRatio > 2) return "momentum-short";
  if (volRatio > 5) return "volume-surge";
  if (rsi != null && rsi < 35) return "fib-bounce";
  if (rsi != null && rsi > 70) return "supply-reject";
  if (changePct > 0.5) return "vwap-reclaim";
  return "gap-fill";
}

/** The strength bucket, scored by the owner of the weights. */
function bucket(changePct: number, volRatio: number): AlertStrength {
  const score = strengthScore(changePct, volRatio);
  if (score > 5)   return "A+";
  if (score > 3)   return "A";
  if (score > 1.5) return "B";
  return "C";
}

/**
 * Classify a scan row, or refuse to.
 *
 * Refusal is the ONLY behaviour change versus the original page code. Given
 * complete evidence this returns exactly what the page returned before.
 */
export function classifyScan(ev: ScanEvidence): ScanClassification {
  const absent = REQUIRED_INPUTS.filter((k) => ev[k] == null || !Number.isFinite(ev[k] as number));

  if (absent.length > 0) {
    const names = absent.map((k) => INPUT_LABEL[k]);
    const list = names.length === 1 ? names[0] : names.join(" and ");
    return {
      signal: null,
      strength: null,
      unrated: true,
      reason:
        `Unrated — the provider did not supply ${list} for this symbol. ` +
        `The price above was observed; the setup and grade were not, and a ` +
        `zero would have been read as a flat market rather than a gap in data.`,
    };
  }

  const changePct = ev.changePct as number;
  const volRatio = ev.volRatio as number;
  return {
    signal: ladder(changePct, volRatio, ev.rsi),
    strength: bucket(changePct, volRatio),
    unrated: false,
    reason: "Rated from observed percent change and volume ratio.",
  };
}

export default classifyScan;
