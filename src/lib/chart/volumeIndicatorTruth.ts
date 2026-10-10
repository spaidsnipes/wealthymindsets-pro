/**
 * THE VOLUME INDICATORS GO SILENT WHERE THERE IS NO TRADED VOLUME
 * (Supermax §5 truth gap, cert lane, 2026-10-10).
 *
 * Twenty-one Indicators-menu rows read traded volume. On spot FX and spot metals
 * there is no central exchange, so there is no traded volume; on a feed that
 * sends a placeholder volume (every bar 0 or 1) there is none either. Until
 * now those rows still DREW — a flat or meaningless line, with the ⓘ telling
 * the trader to "leave it off". Every other volume tool in the house stays
 * silent and says why. These now do the same.
 *
 * ONE OWNER for "is there traded volume here": `volumeTruthFor`
 * (volumeTruth.ts — the spot-FX / spot-metal canon and the placeholder test).
 * No second classifier. The words are that owner's own:
 * `needsTradedVolumeWords` ("NEEDS TRADED VOLUME · SPOT FX HAS NONE") or the
 * placeholder sentence ("NO VOLUME REPORTED · feed placeholder").
 *
 * PURE. The chart asks once per indicator pass; a withheld indicator draws
 * NO series — not a zero line, not a flat line.
 */
import { needsTradedVolumeWords, volumeTruthFor } from "./volumeTruth";
import { INDICATOR_EDUCATION } from "./indicatorEducation";

/**
 * The Indicators-menu rows computed from traded volume — read from the ⓘ
 * registry itself (`needs: "VOLUME"`), so the list cannot drift from what each
 * indicator's ⓘ says it needs. 21 rows on 2026-10-10. `MFI` is the chart's
 * older alias for Money Flow Index.
 */
export const VOLUME_INDICATORS: readonly string[] = Object.entries(INDICATOR_EDUCATION)
  .filter(([, r]) => r.needs === "VOLUME").map(([name]) => name);
const ALIASES: Readonly<Record<string, string>> = { MFI: "Money Flow Index" };
export type VolumeIndicator = string;

const SET: ReadonlySet<string> = new Set([...VOLUME_INDICATORS, ...Object.keys(ALIASES)]);
export const isVolumeIndicator = (name: string): boolean => SET.has(name);

export interface VolumeIndicatorSilence {
  /** Receipt word: NO_CENTRAL_VOLUME or PLACEHOLDER_VOLUME. */
  readonly reason: "NO_CENTRAL_VOLUME" | "PLACEHOLDER_VOLUME";
  /** The words said on the chart, from the volume owner. */
  readonly words: string;
}

/**
 * Null when the market has real traded volume (draw as usual); otherwise why
 * every volume indicator is withheld on this chart.
 */
export function volumeIndicatorSilence(
  symbol: string,
  bars: readonly { readonly volume: number }[] | null | undefined,
): VolumeIndicatorSilence | null {
  const t = volumeTruthFor(symbol, bars);
  if (t.real) return null;
  if (t.reason === "PLACEHOLDER_VOLUME") return { reason: "PLACEHOLDER_VOLUME", words: t.text };
  return { reason: "NO_CENTRAL_VOLUME", words: needsTradedVolumeWords(symbol) ?? t.text };
}

/**
 * The indicators to draw and the ones withheld, for a set of active names.
 * `receipt` is the canvas dataset value for the chart (`volumeIndicatorsWithheld`),
 * null when nothing is withheld.
 */
export function partitionVolumeIndicators(
  active: Iterable<string>,
  symbol: string,
  bars: readonly { readonly volume: number }[] | null | undefined,
): { readonly withheld: readonly string[]; readonly silence: VolumeIndicatorSilence | null; readonly receipt: string | null } {
  const on = [...active].filter(isVolumeIndicator);
  const silence = on.length ? volumeIndicatorSilence(symbol, bars) : null;
  if (!silence) return { withheld: [], silence: null, receipt: null };
  return { withheld: on, silence, receipt: `${silence.reason}:${on.length}|${on.join(",")}` };
}
