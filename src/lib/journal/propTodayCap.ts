/**
 * "CAN I TAKE THE WHOLE TARGET TODAY?" (GAPS-V3 trading #4; he asked it about ten times, 10-14 → 11-10).
 *
 * Read from the prop desk's OWN reading (readPropEvaluation over the days he typed or imported), never from a
 * second set of numbers. Two answers:
 *
 *   MAX DAY        the largest day that keeps the requirement where it is: limit × required net profit
 *                  (TradeDay 30% on a $1,500 target → $450). A bigger day still counts, but it raises the net
 *                  the account must reach before payout.
 *   WHOLE TARGET   taking everything that remains today (R) passes only if, after today, the best day is within
 *                  the limit of the net: max(largest, R) ≤ limit × (net + R).
 *
 * Arithmetic only — not a plan and not a signal. Unknown inputs give a reason, not a number.
 */
import { formatCents, pct, readPropEvaluation, type Cents, type PropInputs } from "./propEvaluation";

export type PropTodayCap =
  | { readonly known: false; readonly why: string }
  | {
      readonly known: true;
      readonly limit: number;
      readonly requiredNetCents: Cents;
      readonly netCents: Cents;
      readonly largestDayCents: Cents;
      /** limit × required net, rounded DOWN to the cent. */
      readonly maxDayCents: Cents;
      readonly remainingCents: Cents;
      readonly wholeTargetToday: boolean;
      /** The best day's share of the net if he took the whole remainder today. */
      readonly shareIfWhole: number | null;
      /** The net the account would then have to reach (best day ÷ limit), when taking it all today raises it. */
      readonly netNeededIfWhole: Cents | null;
      readonly words: string;
    };

export function readPropTodayCap(x: PropInputs): PropTodayCap {
  const r = readPropEvaluation(x);
  if (!r.netProfitCents.known) return { known: false, why: r.netProfitCents.why };
  if (!r.requiredNetProfitCents.known) return { known: false, why: r.requiredNetProfitCents.why };
  const limit = x.consistencyLimit;
  const N = r.netProfitCents.value, L = r.largestDayCents, req = r.requiredNetProfitCents.value;
  const maxDayCents = Math.floor(limit * req);
  const R = Math.max(0, req - N);
  if (R === 0) {
    return { known: true, limit, requiredNetCents: req, netCents: N, largestDayCents: L, maxDayCents, remainingCents: 0, wholeTargetToday: true, shareIfWhole: null, netNeededIfWhole: null,
      words: `Target already met (${formatCents(N)} of ${formatCents(req)}). Read it back from the firm before you trade again.` };
  }
  const best = Math.max(L, R), netAfter = N + R;
  const ok = netAfter > 0 && best <= limit * netAfter + 1e-6;
  const shareIfWhole = netAfter > 0 ? best / netAfter : null;
  const netNeededIfWhole = ok ? null : Math.ceil(best / limit);
  const words = ok
    ? `YES — ${formatCents(R)} today keeps your best day within ${pct(limit)} of ${formatCents(netAfter)}.`
    : `NO — ${formatCents(R)} today would be ${shareIfWhole == null ? "all" : pct(shareIfWhole)} of ${formatCents(netAfter)}, over ${pct(limit)}. Net would have to reach ${formatCents(netNeededIfWhole ?? 0)}.`;
  return { known: true, limit, requiredNetCents: req, netCents: N, largestDayCents: L, maxDayCents, remainingCents: R, wholeTargetToday: ok, shareIfWhole, netNeededIfWhole, words };
}
