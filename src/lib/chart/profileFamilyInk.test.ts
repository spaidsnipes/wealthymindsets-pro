import { describe, expect, it } from "vitest";

import {
  PROFILE_INK_AT_REST,
  PROFILE_INK_DEFAULTS,
  PROFILE_INK_FOLLOWS,
  PROFILE_INK_ROLES,
  resolveProfileInk,
  type ProfilePalette,
  type Rgb,
} from "./profileFamilyInk";
import { VP_POC_DEFAULT, VP_VALUE_AREA_DEFAULT, hexToRgb } from "./marketFieldMaterial";

/**
 * The three literals the profile family hand-typed before this owner, as the
 * paint sites spelled them. Written out HERE, once, on purpose: the whole
 * contract of the owner's defaults is "the glass does not move at rest", and
 * that can only be held against the old spelling, not against the owner itself.
 */
const OLD_BRASS: Rgb = [201, 165, 92];   // "rgba(201,165,92,a)" · "#C9A55C"
const OLD_IVORY: Rgb = [237, 230, 211];  // "rgba(237,230,211,a)"
const OLD_RECESS: Rgb = [194, 184, 146]; // "rgba(194,184,146,a)"

/** The VP palette exactly as MainChart holds it for an untouched trader. */
const UNTOUCHED: ProfilePalette = {
  poc: hexToRgb(VP_POC_DEFAULT),
  vah: hexToRgb(VP_VALUE_AREA_DEFAULT),
  val: hexToRgb(VP_VALUE_AREA_DEFAULT),
};

const TEAL: Rgb = [0, 170, 187];
const VIOLET: Rgb = [120, 80, 200];

describe("the family's defaults are the glass as it was", () => {
  it("each role's default is byte-identical to the literal its sites used", () => {
    expect(PROFILE_INK_DEFAULTS).toEqual({
      POC: OLD_BRASS,
      EDGE_HIGH: OLD_IVORY,
      EDGE_LOW: OLD_IVORY,
      VALUE: OLD_IVORY,
      TAIL: OLD_RECESS,
      ANCHOR: OLD_BRASS,
      WASH: OLD_IVORY,
    });
  });

  it("the rgba() a site gets at rest is the string it used to type", () => {
    const k = PROFILE_INK_AT_REST;
    expect(k.rgba("POC", 0.95)).toBe("rgba(201,165,92,0.95)");
    expect(k.rgba("ANCHOR", 0.55)).toBe("rgba(201,165,92,0.55)");
    expect(k.rgba("VALUE", 0.14)).toBe("rgba(237,230,211,0.14)");
    expect(k.rgba("WASH", 0.035)).toBe("rgba(237,230,211,0.035)");
    expect(k.rgba("EDGE_HIGH", 0.75)).toBe("rgba(237,230,211,0.75)");
    expect(k.rgba("EDGE_LOW", 0.5)).toBe("rgba(237,230,211,0.5)");
    expect(k.rgba("TAIL", 0.22)).toBe("rgba(194,184,146,0.22)");
    // TPO composites its own alpha from a bare "r,g,b".
    expect([k.rgb("POC"), k.rgb("VALUE"), k.rgb("TAIL")]).toEqual(["201,165,92", "237,230,211", "194,184,146"]);
    // The Fixed Range chip was "#C9A55C": the same ink at full strength.
    expect(k.rgba("ANCHOR", 1)).toBe("rgba(201,165,92,1)");
  });

  it("an untouched palette — absent, empty, or still at the VP defaults — resolves to the defaults exactly", () => {
    for (const palette of [null, undefined, {}, UNTOUCHED, { poc: null, vah: null, val: null }]) {
      const k = resolveProfileInk(palette);
      expect(k.role).toEqual(PROFILE_INK_DEFAULTS);
      for (const r of PROFILE_INK_ROLES) expect(k.chosen[r], `${r} for ${JSON.stringify(palette)}`).toBe(false);
    }
  });

  it("THE TRAP: the VP's own POC default (pearl) does NOT repaint the family's brass POC", () => {
    // The classic VP rests its POC in pearl, the family in brass. Feeding the
    // raw palette through would have moved every species' POC at rest.
    expect(hexToRgb(VP_POC_DEFAULT)).not.toEqual(OLD_BRASS);
    const k = resolveProfileInk(UNTOUCHED);
    expect(k.role.POC).toEqual(OLD_BRASS);
    expect(k.rgba("POC", 0.9)).toBe("rgba(201,165,92,0.9)");
  });

  it("a species fork resolves to its REST role at rest", () => {
    const k = PROFILE_INK_AT_REST;
    // Living's value-area lines: EDGE resting in brass.
    expect(k.rgbaAs("EDGE_HIGH", "ANCHOR", 0.8)).toBe("rgba(201,165,92,0.8)");
    // TPO's value-area lines: EDGE resting in the recessed voice.
    expect(k.rgbaAs("EDGE_LOW", "TAIL", 0.75)).toBe("rgba(194,184,146,0.75)");
    // An identity ink stays itself until the trader chooses.
    expect(k.chosenOr("POC", 0.92, "rgba(214,176,92,0.92)")).toBe("rgba(214,176,92,0.92)");
  });

  it("carries no market hue at rest — every default is warm material (r ≥ g ≥ b)", () => {
    for (const r of PROFILE_INK_ROLES) {
      const [red, green, blue] = PROFILE_INK_DEFAULTS[r];
      expect(red >= green && green >= blue, `${r} = ${PROFILE_INK_DEFAULTS[r]}`).toBe(true);
    }
  });
});

describe("a customized palette restyles the family together", () => {
  it("a chosen POC reaches the POC role — and nothing else, not even ANCHOR, which shares its default", () => {
    const k = resolveProfileInk({ ...UNTOUCHED, poc: TEAL });
    expect(k.chosen.POC).toBe(true);
    expect(k.role.POC).toEqual(TEAL);
    expect(k.rgba("POC", 0.95)).toBe("rgba(0,170,187,0.95)");
    // Brass hardware is not a POC: the anchor, tether and chips stay brass.
    expect(k.role.ANCHOR).toEqual(OLD_BRASS);
    expect(k.chosen.ANCHOR).toBe(false);
    expect(k.role.EDGE_HIGH).toEqual(OLD_IVORY);
    expect(k.role.EDGE_LOW).toEqual(OLD_IVORY);
  });

  it("a chosen POC overrides the species' identity ink and rest role too", () => {
    const k = resolveProfileInk({ poc: TEAL });
    expect(k.chosenOr("POC", 0.92, "rgba(214,176,92,0.92)")).toBe("rgba(0,170,187,0.92)");
    expect(k.rgbaAs("POC", "ANCHOR", 0.5)).toBe("rgba(0,170,187,0.5)");
  });

  it("VAH and VAL are two choices: each reaches its own side of EDGE only", () => {
    const hi = resolveProfileInk({ ...UNTOUCHED, vah: TEAL });
    expect(hi.chosen.EDGE_HIGH).toBe(true);
    expect(hi.chosen.EDGE_LOW).toBe(false);
    expect(hi.role.EDGE_HIGH).toEqual(TEAL);
    expect(hi.role.EDGE_LOW).toEqual(OLD_IVORY);
    // A species resting its edges elsewhere follows the side that was chosen…
    expect(hi.rgbaAs("EDGE_HIGH", "ANCHOR", 0.8)).toBe("rgba(0,170,187,0.8)");
    // …and keeps its own rest on the side that was not.
    expect(hi.rgbaAs("EDGE_LOW", "ANCHOR", 0.8)).toBe("rgba(201,165,92,0.8)");

    const both = resolveProfileInk({ vah: TEAL, val: VIOLET });
    expect(both.rgba("EDGE_HIGH", 0.5)).toBe("rgba(0,170,187,0.5)");
    expect(both.rgba("EDGE_LOW", 0.5)).toBe("rgba(120,80,200,0.5)");
    expect(both.chosen.POC).toBe(false);
  });

  it("an uncustomized key does not reach its role, whatever the others do", () => {
    const k = resolveProfileInk({ poc: hexToRgb(VP_POC_DEFAULT), vah: VIOLET, val: hexToRgb(VP_VALUE_AREA_DEFAULT) });
    expect(k.chosen.POC).toBe(false);
    expect(k.role.POC).toEqual(OLD_BRASS);
    expect(k.chosen.EDGE_LOW).toBe(false);
    expect(k.role.EDGE_LOW).toEqual(OLD_IVORY);
    expect(k.chosen.EDGE_HIGH).toBe(true);
  });

  it("only POC and the two EDGE sides answer to the palette, on the keys the VP loader reads", () => {
    expect(PROFILE_INK_FOLLOWS).toEqual({
      POC: "wm_vp_poc",
      EDGE_HIGH: "wm_vp_vah",
      EDGE_LOW: "wm_vp_val",
      VALUE: null,
      TAIL: null,
      ANCHOR: null,
      WASH: null,
    });
  });
});

describe("alpha is never the owner's", () => {
  it("every role resolves to three channels and nothing else", () => {
    for (const k of [PROFILE_INK_AT_REST, resolveProfileInk({ poc: TEAL, vah: VIOLET, val: TEAL })]) {
      for (const r of PROFILE_INK_ROLES) {
        expect(k.role[r]).toHaveLength(3);
        for (const c of k.role[r]) expect(Number.isInteger(c) && c >= 0 && c <= 255).toBe(true);
        expect(k.rgb(r).split(",")).toHaveLength(3);
      }
    }
  });

  it("the site's alpha passes through verbatim, including computed fades", () => {
    const k = resolveProfileInk({ poc: TEAL });
    const fade = Math.max(0.3, 0.9 - 2 * 0.15);
    expect(k.rgba("POC", fade)).toBe(`rgba(0,170,187,${fade})`);
    expect(k.rgba("WASH", 0)).toBe("rgba(237,230,211,0)");
    expect(k.rgbaAs("WASH", "ANCHOR", 0.035)).toBe("rgba(201,165,92,0.035)");
  });

  it("a palette entry that smuggles an alpha channel is not an ink, so it is not a choice", () => {
    const withAlpha = [0, 170, 187, 0.5] as unknown as Rgb;
    const k = resolveProfileInk({ poc: withAlpha });
    expect(k.chosen.POC).toBe(false);
    expect(k.rgba("POC", 0.9)).toBe("rgba(201,165,92,0.9)");
  });

  it("nonsense channels are not a choice either — the family keeps its defaults", () => {
    for (const bad of [[NaN, 1, 2], [256, 0, 0], [-1, 0, 0], [1.5, 2, 3], [1, 2]] as unknown as Rgb[]) {
      const k = resolveProfileInk({ poc: bad, vah: bad, val: bad });
      expect(k.role).toEqual(PROFILE_INK_DEFAULTS);
    }
  });
});

describe("the resolver is pure", () => {
  it("does not mutate or alias the palette it was handed", () => {
    const poc: [number, number, number] = [0, 170, 187];
    const palette = { poc };
    const k = resolveProfileInk(palette);
    expect(palette).toEqual({ poc: [0, 170, 187] });
    poc[0] = 255;
    expect(k.role.POC).toEqual(TEAL);
  });

  it("same palette in, same inks out; the result cannot be edited in place", () => {
    const a = resolveProfileInk({ vah: TEAL });
    const b = resolveProfileInk({ vah: TEAL });
    expect(a.role).toEqual(b.role);
    expect(a.chosen).toEqual(b.chosen);
    expect(Object.isFrozen(a.role)).toBe(true);
    expect(Object.isFrozen(a.role.POC)).toBe(true);
    expect(Object.isFrozen(PROFILE_INK_DEFAULTS)).toBe(true);
  });
});
