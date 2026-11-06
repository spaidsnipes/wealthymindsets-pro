/**
 * THE ONE READING OF THE PROFILE SPECIES INKS — for the chart, the tool's style card and Chart Settings alike.
 *
 * P0 (Founder, 2026-11-02, Structure Profile colours: "dimmed … faded behind the chart … like a blinking lamp").
 * Before this owner the chart ran the law over house defaults + the trader's choices, while the style card and the
 * sheet ran it over the choices alone. A Structure pick of the card's own blue swatch twinned Visible Range's house
 * blue: the chart REFUSED the pick (Structure fell back to its leg ramp, frame by frame as the picker moved) while the
 * card said it was applied, and the sheet showed "#ede6d3" for a Visible Range the chart painted blue.
 *
 * Order of authority:
 *  1. The trader's choices, through `lawfulSpeciesInks` (field, POC and twin refusals unchanged).
 *  2. House defaults fill only species the trader did not choose, and only where they stay distinct from every kept
 *     ink, the field and the POC. A default that would twin a choice steps aside to the family ink — a default is
 *     never a reason to refuse what the trader picked.
 * `shown` is the hex the glass paints for each species, so a swatch can never claim a colour the chart does not use.
 */
import { SPECIES_INK_DEFAULTS, SPECIES_INK_KEYS, inksDistinct, lawfulSpeciesInks, type LawfulSpeciesInks } from "./appearanceLaw";
import { PROFILE_INK_AT_REST } from "./profileFamilyInk";
import { VP_POC_DEFAULT } from "./marketFieldMaterial";
import type { ProfileSpeciesKey } from "./appearanceLaw";

export interface SpeciesInkReading extends LawfulSpeciesInks {
  /** Per species: the ink the glass paints (choice, else house default, else the family ink). */
  readonly shown: Readonly<Record<ProfileSpeciesKey, string>>;
  /** The family ink a species without its own wears. */
  readonly familyHex: string;
}

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
const toHex = (rgb: readonly [number, number, number] | readonly number[]) => `#${hex2(rgb[0]!)}${hex2(rgb[1]!)}${hex2(rgb[2]!)}`;

export function speciesInkReading(stored: unknown, ctx: { field: string; poc: string | readonly string[] }): SpeciesInkReading {
  const choices = lawfulSpeciesInks(stored, ctx);
  const inks: Partial<Record<ProfileSpeciesKey, readonly [number, number, number]>> = { ...choices.inks };
  const kept = Object.values(inks).map(rgb => toHex(rgb!));
  const chosen = (sp: ProfileSpeciesKey) => {
    const raw = stored && typeof stored === "object" ? (stored as Record<string, unknown>)[sp] : undefined;
    return raw != null && raw !== "";
  };
  for (const sp of SPECIES_INK_KEYS) {
    const d = SPECIES_INK_DEFAULTS[sp];
    if (!d || chosen(sp)) continue;
    const alone = lawfulSpeciesInks({ [sp]: d }, ctx);
    const rgb = alone.inks[sp];
    if (!rgb || kept.some(k => !inksDistinct(d, k))) continue;
    inks[sp] = rgb;
    kept.push(d);
  }
  const familyHex = toHex(PROFILE_INK_AT_REST.role.VALUE);
  const shown = Object.fromEntries(SPECIES_INK_KEYS.map(sp => [sp, inks[sp] ? toHex(inks[sp]!) : familyHex])) as Record<ProfileSpeciesKey, string>;
  return { inks, refused: choices.refused, shown, familyHex };
}

/** The POC inks a species ink must stay clear of: the trader's stored `wm_vp_poc` (else the house POC) and the at-rest POC — the same pair the chart reads. */
export function speciesInkPocs(storage?: Pick<Storage, "getItem"> | null): readonly string[] {
  let stored: string | null = null;
  try { stored = storage?.getItem("wm_vp_poc") ?? null; } catch { /* storage closed */ }
  const live = stored && /^#[0-9a-f]{6}$/i.test(stored) ? stored : VP_POC_DEFAULT;
  return [live, `rgb(${PROFILE_INK_AT_REST.rgb("POC")})`];
}
