/**
 * THE PROFILE FAMILY'S INK — one owner, named by role.
 *
 * ── THE FORK THIS ENDS ────────────────────────────────────────────────────
 * The classic Volume Profile (runWMVP / drawWMVP) reads the trader's VP
 * palette: `wm_vp_poc`, `wm_vp_vah`, `wm_vp_val`, owned by
 * `marketFieldMaterial.ts`. The rest of the profile family on the same glass —
 * the Living Profile and its movie, Profile DNA, Composite, Visible Range, TPO,
 * Structure Profile, Profile Fusion zones, Profile Memory, Value Migration and
 * the Fixed Range drawing — hand-typed 87 literals of three materials
 * instead, each site picking its own. A trader who changed the POC ink in the
 * VP gear restyled one species and left ten on the old ink: a semantic fork by
 * omission. The same price was "the POC" in two colours on one camera.
 *
 * ── ROLES, NOT COLOURS ────────────────────────────────────────────────────
 * A site names what its ink MEANS; this module says what that looks like.
 * The role set is derived from what the literals did, and kept small:
 *
 *   POC        the loudest price — every POC line, row, notch, trail, label
 *   EDGE_HIGH  where value ends, above — VAH lines and labels
 *   EDGE_LOW   where value ends, below — VAL lines and labels
 *   VALUE      what the profile accepted — body inside value, value spans
 *   TAIL       what it passed through — body outside value; also the family's
 *              recessed voice (quiet captions)
 *   ANCHOR     the house's hardware — anchors, tethers, frames, selection,
 *              chip ink. Brass is hardware, never a market direction.
 *   WASH       territory — faint fills that lie behind price
 *
 * EDGE is two roles because the palette is two keys: the classic VP already
 * paints VAH and VAL in separate inks, so one EDGE role would have to pick
 * which of the trader's two choices to ignore.
 *
 * ── ALPHA IS NOT OURS ─────────────────────────────────────────────────────
 * A role resolves to `[r, g, b]` only. Every alpha stays at its paint site:
 * loudness belongs to the attention governor (`att.alpha`) and to each site's
 * own reading of age, fade and fidelity. An ink owner that baked alpha in
 * would be a second loudness owner.
 *
 * ── AT REST NOTHING MOVES ─────────────────────────────────────────────────
 * Every default below is byte-identical to the literal it replaced, so an
 * untouched palette paints exactly the glass it painted before. That
 * includes the places where species DISAGREE today — the Living Profile rests
 * its value-area lines in brass (its canon: "VAH/VAL are solid gold lines"),
 * TPO rests them in the recessed voice, Visible Range in ivory. Those forks
 * are not resolved here, because resolving them changes the glass; they are
 * NAMED at the site with `rgbaAs(role, rest, alpha)` — "this is an EDGE,
 * resting in ANCHOR's brass" — so that the moment the trader chooses a VAH
 * ink, every boundary in the family takes it together.
 *
 * ── WHO COUNTS AS HAVING CHOSEN ───────────────────────────────────────────
 * A palette key is CHOSEN when it holds an ink that differs from its
 * `marketFieldMaterial` default. An absent key, or one still at the default
 * (which "Reset all VP colors" writes back), is not a choice: the family keeps
 * its own rest inks. That matters because the classic VP's defaults are NOT
 * the family's — the VP's POC rests in pearl, the family's POC in brass — so
 * feeding the raw palette through would have repainted every species at rest.
 * The cost, stated: a trader who deliberately picks exactly `#ede6d3` for POC
 * is indistinguishable from one who never touched it.
 *
 * ── WHY A SIBLING MODULE AND NOT marketFieldMaterial.ts ───────────────────
 * That module's boundary is its version stamp: everything in it shares one
 * stored object or one migration ladder. This owns no storage, no stamp and no
 * migration — it READS the VP palette's defaults from that owner (imported,
 * never restated) and owns only the role table. `marketFieldMaterial` stays the
 * one owner of every value a trader can change; this is the one owner of how
 * the profile family spends them.
 *
 * ── A FINDING, RECORDED AND NOT ACTED ON ──────────────────────────────────
 * The family's brass `#c9a55c` is NOT the room's `GOLD` token (`#c4a574`,
 * `CANDLE_UP_DEFAULT`). It is a near-miss brass, exactly the "ninth
 * slightly-wrong brass" `marketFieldMaterial` warns about. Converging it is a
 * visible change and a Canon decision; this pass is byte-identical by
 * contract. It now lives in ONE place, which is what makes that decision
 * cheap when it is taken.
 */

import {
  VP_POC_DEFAULT,
  VP_VALUE_AREA_DEFAULT,
  hexToRgb,
} from "./marketFieldMaterial";

/** An ink with no alpha. Alpha is the paint site's. */
export type Rgb = readonly [number, number, number];

export type ProfileInkRole =
  | "POC"
  | "EDGE_HIGH"
  | "EDGE_LOW"
  | "VALUE"
  | "TAIL"
  | "ANCHOR"
  | "WASH";

export const PROFILE_INK_ROLES: readonly ProfileInkRole[] = [
  "POC", "EDGE_HIGH", "EDGE_LOW", "VALUE", "TAIL", "ANCHOR", "WASH",
];

/*
 * THE FAMILY'S THREE MATERIALS. Hex, like every other Appearance value, so a
 * future control can seed an `<input type="color">` with them without blanking
 * it. Byte-identical to the literals they replace:
 *
 *   brass   #c9a55c = rgba(201,165,92,·)
 *   ivory   #ede6d3 = rgba(237,230,211,·)   — the room's PEARL
 *   recess  #c2b892 = rgba(194,184,146,·)
 *
 * Module-private on purpose: a paint site names a ROLE, never a material.
 */
const BRASS = "#c9a55c";
const IVORY = "#ede6d3";
const RECESS = "#c2b892";

/** What each role paints when the trader has chosen nothing. */
export const PROFILE_INK_DEFAULTS: Readonly<Record<ProfileInkRole, Rgb>> = Object.freeze({
  POC: hexToRgb(BRASS),
  EDGE_HIGH: hexToRgb(IVORY),
  EDGE_LOW: hexToRgb(IVORY),
  VALUE: hexToRgb(IVORY),
  TAIL: hexToRgb(RECESS),
  ANCHOR: hexToRgb(BRASS),
  WASH: hexToRgb(IVORY),
});

/**
 * Which VP palette key, if any, a role answers to. The four roles with `null`
 * have no Appearance control today; they are roles anyway so that one can be
 * added without hunting a hundred sites.
 */
export const PROFILE_INK_FOLLOWS: Readonly<Record<ProfileInkRole, "wm_vp_poc" | "wm_vp_vah" | "wm_vp_val" | null>> =
  Object.freeze({
    POC: "wm_vp_poc",
    EDGE_HIGH: "wm_vp_vah",
    EDGE_LOW: "wm_vp_val",
    VALUE: null,
    TAIL: null,
    ANCHOR: null,
    WASH: null,
  });

/**
 * The slice of the VP palette the family follows, as MainChart already holds
 * it (`vpColorsRef`: triplets, defaults filled in). Taking the SAME triplets
 * the classic VP paints from — rather than re-reading storage — is what keeps
 * this a second consumer of one loader, not a second loader.
 */
export type ProfilePalette = {
  poc?: Rgb | null;
  vah?: Rgb | null;
  val?: Rgb | null;
};

export type ProfileInk = {
  /** Each role resolved to `[r, g, b]`: the trader's choice, else the default. */
  readonly role: Readonly<Record<ProfileInkRole, Rgb>>;
  /** True only for a role whose palette key holds a non-default ink. */
  readonly chosen: Readonly<Record<ProfileInkRole, boolean>>;
  /** `rgba(r,g,b,alpha)` for a role. The alpha is the caller's, verbatim. */
  rgba(role: ProfileInkRole, alpha: number): string;
  /**
   * A role this species rests in ANOTHER role's ink until the trader chooses
   * it — e.g. Living's value-area lines are EDGE_HIGH/EDGE_LOW resting as
   * ANCHOR brass. At rest: `rest`'s ink. Chosen: `role`'s. The pair names the
   * species' fork in one call instead of hiding it in a literal.
   */
  rgbaAs(role: ProfileInkRole, rest: ProfileInkRole, alpha: number): string;
  /**
   * For a species IDENTITY ink that is none of the family's three materials
   * (Living's lit gold, Composite's settled steel) but still carries a role's
   * meaning: the identity ink at rest, the trader's choice once there is one.
   */
  chosenOr(role: ProfileInkRole, alpha: number, identity: string): string;
  /** `r,g,b` for sites that composite their own alpha string (TPO's letter cache). */
  rgb(role: ProfileInkRole): string;
};

const isInk = (c: Rgb | null | undefined): c is Rgb =>
  Array.isArray(c) &&
  c.length === 3 &&
  c.every(n => Number.isInteger(n) && n >= 0 && n <= 255);

const same = (a: Rgb, b: Rgb) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

const VP_POC_AT_REST = hexToRgb(VP_POC_DEFAULT);
const VP_VALUE_AREA_AT_REST = hexToRgb(VP_VALUE_AREA_DEFAULT);

/** A palette key counts as chosen only when it differs from its own default. */
const choice = (c: Rgb | null | undefined, atRest: Rgb): Rgb | null =>
  isInk(c) && !same(c, atRest) ? [c[0], c[1], c[2]] : null;

/**
 * Resolve the family's inks from the trader's VP palette. Pure: same palette
 * in, same inks out; nothing read from storage, nothing written.
 *
 * `null` / `{}` is the untouched palette and yields the defaults exactly.
 */
export function resolveProfileInk(palette?: ProfilePalette | null): ProfileInk {
  const picked: Partial<Record<ProfileInkRole, Rgb>> = {};
  const poc = choice(palette?.poc, VP_POC_AT_REST);
  const vah = choice(palette?.vah, VP_VALUE_AREA_AT_REST);
  const val = choice(palette?.val, VP_VALUE_AREA_AT_REST);
  if (poc) picked.POC = poc;
  if (vah) picked.EDGE_HIGH = vah;
  if (val) picked.EDGE_LOW = val;

  const role = {} as Record<ProfileInkRole, Rgb>;
  const chosen = {} as Record<ProfileInkRole, boolean>;
  const rgbText = {} as Record<ProfileInkRole, string>;
  for (const r of PROFILE_INK_ROLES) {
    const ink = picked[r] ?? PROFILE_INK_DEFAULTS[r];
    role[r] = Object.freeze([ink[0], ink[1], ink[2]] as const);
    chosen[r] = picked[r] != null;
    rgbText[r] = `${ink[0]},${ink[1]},${ink[2]}`;
  }

  const rgba = (r: ProfileInkRole, alpha: number) => `rgba(${rgbText[r]},${alpha})`;
  return Object.freeze({
    role: Object.freeze(role),
    chosen: Object.freeze(chosen),
    rgba,
    rgbaAs: (r: ProfileInkRole, rest: ProfileInkRole, alpha: number) => rgba(chosen[r] ? r : rest, alpha),
    chosenOr: (r: ProfileInkRole, alpha: number, identity: string) => (chosen[r] ? rgba(r, alpha) : identity),
    rgb: (r: ProfileInkRole) => rgbText[r],
  });
}

/** The untouched palette's inks — the glass as it painted before this owner. */
export const PROFILE_INK_AT_REST: ProfileInk = resolveProfileInk(null);
