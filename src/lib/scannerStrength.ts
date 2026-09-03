/**
 * Scanner strength-grade disclosure.
 *
 * "A+" reads like a validated signal quality. It is not: it is a transparent
 * bucket over two REAL inputs — |change %| and volume ratio — with fixed
 * weights. Canon weakness #4 SCORE ADDICTION: "narrow validated scores only
 * where the construct is defined." The construct here is defined and the
 * inputs are honest market data, so the grade may stand — but it must say what
 * it measures, or the letter implies a validation that never happened.
 *
 * Lives in lib/ rather than the page because Next.js App Router pages may only
 * export their route contract (default, metadata, …).
 *
 * PURE — no I/O, no clock.
 */

/** Weights used by the scanner's strengthFromData bucketing. Keep in sync. */
export const STRENGTH_CHANGE_WEIGHT = 0.5;
export const STRENGTH_VOLRATIO_WEIGHT = 0.3;

export function strengthScore(changePct: number, volRatio: number): number {
  return Math.abs(changePct) * STRENGTH_CHANGE_WEIGHT + volRatio * STRENGTH_VOLRATIO_WEIGHT;
}

export function strengthDisclosure(changePct: number, volRatio: number): string {
  const score = strengthScore(changePct, volRatio);
  return (
    `Strength grade from observed data only: |change %| x${STRENGTH_CHANGE_WEIGHT} + ` +
    `volume ratio x${STRENGTH_VOLRATIO_WEIGHT} = ${score.toFixed(2)} ` +
    `(A+ >5, A >3, B >1.5, else C). A transparent heuristic over real inputs — ` +
    `not a validated signal quality or a prediction.`
  );
}
