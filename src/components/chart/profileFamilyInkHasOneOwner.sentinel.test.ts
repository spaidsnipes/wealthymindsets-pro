/**
 * THE PROFILE FAMILY'S INK HAS ONE OWNER — Garden Pass 12, P1 Appearance parity.
 *
 * The defect this stands over: the classic VP reads the trader's VP palette
 * (`wm_vp_poc` / `wm_vp_vah` / `wm_vp_val`), while every other profile species
 * on the same glass hand-typed its own 87 literals of three materials —
 * `rgba(201,165,92,·)` brass, `rgba(237,230,211,·)` ivory,
 * `rgba(194,184,146,·)` recess, and one `"#C9A55C"`. Changing the POC ink in
 * the VP gear restyled one species and left ten on the old ink: the same price
 * called "POC" in two colours on one camera.
 *
 * The law now: each profile-family paint block names a ROLE through
 * `lib/chart/profileFamilyInk.ts` (`pk.rgba(role, alpha)`), and that owner is
 * fed from the SAME load as the classic VP's palette. No block may spell one
 * of the three materials, in any form — `rgba(…)`, a bare `"r,g,b"` (TPO's
 * letter cache used one), or hex.
 *
 * Every scan PROVES it found its block before asserting it is clean: a slice
 * that drifted to nothing would otherwise report "no literals" for the most
 * boring reason available (see `lib/ops/sentinelsProveTheyScanned.test.ts`).
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const RAW = read("src/components/chart/MainChart.tsx");
const CODE = strip(RAW);

/**
 * A block runs from one stable landmark to the next. The landmarks are the
 * species' own section headers (comments), so the slice is cut from the RAW
 * source and stripped afterwards — prose explaining an old literal cannot
 * fail the gate, and code cannot hide in it.
 */
function block(from: string, to: string): string {
  const at = RAW.indexOf(from);
  expect(at, `landmark "${from}" is gone — re-point this gate, do not delete it`).toBeGreaterThan(-1);
  expect(RAW.indexOf(from, at + 1), `landmark "${from}" is no longer unique`).toBe(-1);
  const end = RAW.indexOf(to, at + from.length);
  expect(end, `landmark "${to}" no longer follows "${from}"`).toBeGreaterThan(at);
  return strip(RAW.slice(at, end));
}

type Species = {
  name: string;
  from: string;
  to: string;
  /** Code chars the block held when this gate was written, roughly halved. */
  min: number;
  /** Proof the slice is THIS species' paint, not a neighbour's. */
  must: string[];
  /** False only for the fused object, whose ink is the flow palette's. */
  readsOwner: boolean;
};

const FAMILY: Species[] = [
  {
    name: "Living Profile (rows, edges, marks, labels, ghosts, DNA spine)",
    from: "H-703 · LIVING PROFILE — THE HISTOGRAM ON THE CANVAS",
    to: "P-110 #9 · COMPOSITE PROFILE",
    min: 9000,
    must: ["const lp = livingProfileRef.current", "for (const b of", "profileDnaRef.current", "sliceOutline"],
    readsOwner: true,
  },
  {
    name: "Composite Profile",
    from: "P-110 #9 · COMPOSITE PROFILE",
    to: "P-110 #7 · VISIBLE RANGE PROFILE",
    min: 3000,
    must: ["compositeProfileRef.current", "CMP POC"],
    readsOwner: true,
  },
  {
    name: "Visible Range Profile",
    from: "P-110 #7 · VISIBLE RANGE PROFILE",
    to: "H-601 #3 · PROFILE FUSION — the fused OBJECT",
    min: 2800,
    must: ["for (const r of vrpVM.rows)", "VRP POC"],
    readsOwner: true,
  },
  {
    name: "Profile Fusion — fused object",
    from: "H-601 #3 · PROFILE FUSION — the fused OBJECT",
    to: "P-110 #10 · TPO",
    min: 3000,
    must: ["fuseProfiles(", "FUSED POC", "flowColorsRef.current.fused"],
    readsOwner: false,
  },
  {
    name: "TPO",
    from: "P-110 #10 · TPO",
    to: "P-110 #2 · STRUCTURE PROFILE",
    min: 3000,
    must: ["tpoProfileRef.current", "TPO POC", "ink(rgb,"],
    readsOwner: true,
  },
  {
    name: "Structure Profile",
    from: "P-110 #2 · STRUCTURE PROFILE",
    to: "P-110 #3 · PROFILE FUSION — WHERE THE SPECIES AGREE",
    min: 3400,
    must: ["structureProfileRef.current", "LEG POC"],
    readsOwner: true,
  },
  {
    name: "Profile Fusion — zones",
    from: "P-110 #3 · PROFILE FUSION — WHERE THE SPECIES AGREE",
    to: "P-110 #4 · PROFILE MEMORY",
    min: 1400,
    // The zone is now a knot of threads (Defect 1), tagged "×N" — no caption.
    must: ["profileFusionRef.current", "const tag = `×${z.speciesCount}`;"],
    readsOwner: true,
  },
  {
    name: "Profile Memory",
    from: "P-110 #4 · PROFILE MEMORY",
    to: "LIVING PROFILE · DEVELOPING VALUE MIGRATION",
    min: 3100,
    must: ["profileMemoryRef.current", "l.recentTestTimes"],
    readsOwner: true,
  },
  {
    name: "Living movie + Value Migration",
    from: "LIVING PROFILE · DEVELOPING VALUE MIGRATION",
    to: "F11 · MARKET OBJECT ZONES",
    min: 3100,
    must: ["ds.livingProfileMovie", "valueMigrationRef.current", "dPOC"],
    readsOwner: true,
  },
  {
    name: "Fixed Range drawing (anchored-vp)",
    from: 'else if (t === "anchored-vp")',
    to: 'else if (t === "delta-vp")',
    min: 1600,
    must: ["selectTimeRangeProfile(", "FIXED RANGE"],
    readsOwner: true,
  },
];

/**
 * The three materials in every spelling a site has used: `rgba(r,g,b,a)`, a
 * bare `"r,g,b"`, and hex. Word-bounded so `1201,165,92` cannot pass as a match.
 */
const FORBIDDEN: ReadonlyArray<readonly [label: string, re: RegExp]> = [
  ["brass 201,165,92", /\b201\s*,\s*165\s*,\s*92\b/g],
  ["ivory 237,230,211", /\b237\s*,\s*230\s*,\s*211\b/g],
  ["recess 194,184,146", /\b194\s*,\s*184\s*,\s*146\b/g],
  ["hex brass / ivory / recess", /#(?:c9a55c|ede6d3|c2b892)\b/gi],
];

const BLOCKS = FAMILY.map(s => ({ ...s, code: block(s.from, s.to) }));

describe("the profile family's ink has one owner (Sentinel)", () => {
  it("VACUITY GUARD: every species' paint block was found, and is the real one", () => {
    expect(BLOCKS.length).toBeGreaterThanOrEqual(10);
    for (const b of BLOCKS) {
      expect(b.code.length, `${b.name}: the slice shrank to ${b.code.length} chars`).toBeGreaterThan(b.min);
      for (const m of b.must) expect(b.code, `${b.name}: "${m}" not in the slice`).toContain(m);
    }
  });

  it("POSITIVE CONTROL: the patterns still catch the spellings they were written for", () => {
    const hits = (s: string) => FORBIDDEN.filter(([, re]) => (s.match(re) ?? []).length > 0).length;
    expect(hits('ctx.fillStyle = "rgba(201,165,92,0.95)";')).toBeGreaterThan(0);
    expect(hits('const rgb = r.isPoc ? "201,165,92" : "237,230,211";')).toBeGreaterThan(0);
    expect(hits('ctx.strokeStyle = `rgba(237,230,211,${fade * 0.6})`;')).toBeGreaterThan(0);
    expect(hits('label(p, t, "rgba(194, 184, 146, 0.8)")')).toBeGreaterThan(0);
    expect(hits('chip(text, x, y, "#C9A55C")')).toBeGreaterThan(0);
    expect(hits('pk.rgba("POC", 0.95)')).toBe(0);
  });

  it("no profile-family block spells brass, ivory or recess — each names a role", () => {
    const found: string[] = [];
    let scanned = 0;
    for (const b of BLOCKS) {
      scanned += b.code.length;
      for (const [label, re] of FORBIDDEN) {
        for (const m of b.code.match(re) ?? []) found.push(`${b.name}: ${label} (${m})`);
      }
    }
    expect(scanned, "the scan read almost nothing").toBeGreaterThan(40_000);
    expect(
      found,
      "a profile species hand-picks a family material again. Name its ROLE through " +
        "`pk.rgba(role, alpha)` (lib/chart/profileFamilyInk.ts) — a literal here is a " +
        "species the trader's VP palette can no longer reach.",
    ).toEqual([]);
  });

  it("every species except the flow-owned fused object paints through the owner", () => {
    for (const b of BLOCKS.filter(x => x.readsOwner)) {
      expect(b.code, `${b.name} no longer reads the family ink`).toMatch(/\bpk\.rgba(?:As)?\(|\bpk\.rgb\(|\bpk\.chosenOr\(/);
    }
  });

  it("a POC is POC and a boundary is EDGE in every species — so the trader's choice reaches all of them", () => {
    // The fork by omission, one level down: a species can route through the
    // owner and still name the wrong role (Living's gold VAH line as plain
    // ANCHOR), and then a chosen VAH ink skips it exactly as before. Every
    // level helper call — drawRef / label / lab / ref / hline / stepLine — is
    // read, and its ink must name the role its price is.
    const ROLE = { poc: '"POC"', vah: '"EDGE_HIGH"', val: '"EDGE_LOW"' } as const;
    const calls: { species: string; level: keyof typeof ROLE; line: string }[] = [];
    for (const b of BLOCKS) {
      for (const m of b.code.matchAll(/\b(?:drawRef|label|lab|ref|hline)\(\w+\.(poc|vah|val)\b[^\n]*/g)) {
        calls.push({ species: b.name, level: m[1] as keyof typeof ROLE, line: m[0] });
      }
      for (const m of b.code.matchAll(/\bstepLine\("(poc|vah|val)"[^\n]*/g)) {
        calls.push({ species: b.name, level: m[1] as keyof typeof ROLE, line: m[0] });
      }
    }
    // Living 6, Composite 3, Visible Range 3, TPO 3, Fixed Range 3, Migration 3.
    expect(calls.length, "the level-helper scan found almost nothing").toBeGreaterThanOrEqual(21);
    expect(new Set(calls.map(c => c.species)).size).toBeGreaterThanOrEqual(6);
    const wrong = calls.filter(c => !c.line.includes(ROLE[c.level])).map(c => `${c.species}: ${c.line.trim()}`);
    expect(wrong, "a level is painted in a role that is not its own").toEqual([]);

    // The two boundary sites that do not go through a level helper. Memory
    // picks the side from the level's own kind; Living strokes both hairlines
    // in one path at rest and must split once VAH and VAL were given two inks,
    // or the VAL hairline would silently wear the VAH choice.
    const memory = BLOCKS.find(b => b.name === "Profile Memory")!.code;
    expect(memory).toContain('const edge = l.kind === "VAH" ? "EDGE_HIGH" : "EDGE_LOW";');
    const living = BLOCKS.find(b => b.name.startsWith("Living Profile"))!.code;
    expect(living).toContain('const edgeHi = pk.rgbaAs("EDGE_HIGH", "ANCHOR", 0.5);');
    expect(living).toContain('const edgeLo = pk.rgbaAs("EDGE_LOW", "ANCHOR", 0.5);');
    expect(living).toMatch(/ctx\.moveTo\(0, \+yh \+ 0\.5\); ctx\.lineTo\(W, \+yh \+ 0\.5\);\s*if \(edgeLo !== edgeHi\) \{ ctx\.stroke\(\); ctx\.strokeStyle = edgeLo; ctx\.beginPath\(\); \}\s*ctx\.moveTo\(0, \+yl \+ 0\.5\);/);
  });

  it("no species reads the classic VP palette around the owner — the chosen-vs-default rule cannot be bypassed", () => {
    // The VP palette's raw triplets carry the VP's OWN rests (pearl POC, muted
    // VAH/VAL). A species reading them directly would repaint at rest; one
    // reading them only when "customized" would be a second copy of the rule.
    for (const b of BLOCKS) {
      expect(b.code, b.name).not.toMatch(/\b_vpc\b|vpColorsRef|vp(?:Up|Poc|Vah|Val)Rgba\(/);
    }
  });
});

describe("one palette, one loader, one resolution", () => {
  const loader = (() => {
    const start = CODE.indexOf("const vpColorsRef");
    const end = CODE.indexOf('removeEventListener("wm-vp-colors"', start);
    expect(start, "vpColorsRef moved — re-point this gate").toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return CODE.slice(start, end);
  })();

  it("the family resolves from the SAME triplets, in the SAME load, as the classic VP", () => {
    expect(loader.length).toBeGreaterThan(400);
    expect(loader).toMatch(/localStorage\.getItem\("wm_vp_poc"\)/);
    expect(loader).toContain("profileInkRef.current = resolveProfileInk(vpColorsRef.current);");
    // Resolved AFTER the palette is assigned, so the family never lags a frame
    // behind the gear.
    expect(loader.indexOf("profileInkRef.current = resolveProfileInk(")).toBeGreaterThan(
      loader.indexOf("vpColorsRef.current = {"),
    );
  });

  it("no second loader, no second listener, no second storage key", () => {
    const count = (re: RegExp) => (CODE.match(re) ?? []).length;
    expect(count(/resolveProfileInk\(/g), "the family ink is resolved somewhere other than the VP loader").toBe(1);
    expect(count(/addEventListener\("wm-vp-colors"/g)).toBe(1);
    for (const key of ["wm_vp_poc", "wm_vp_vah", "wm_vp_val"]) {
      expect(count(new RegExp(`getItem\\("${key}"\\)`, "g")), `${key} is read twice`).toBe(1);
    }
    expect(CODE).not.toMatch(/getItem\("wm_profile_?ink|wm_profile_(?:poc|vah|val)/);
  });

  it("each paint pass reads the resolved ink once, from the ref", () => {
    // The rAF overlay and the drawings canvas (Fixed Range) are the two passes.
    expect((CODE.match(/const pk = profileInkRef\.current;/g) ?? []).length).toBe(2);
    expect(CODE).toMatch(/import \{ PROFILE_INK_AT_REST, resolveProfileInk \} from "@\/lib\/chart\/profileFamilyInk";/);
    expect(CODE).toMatch(/const profileInkRef = useRef\(PROFILE_INK_AT_REST\);/);
  });
});

describe("the owner derives its baseline from the Appearance owner", () => {
  const OWNER = strip(read("src/lib/chart/profileFamilyInk.ts"));

  it("reads the VP defaults from marketFieldMaterial instead of restating them", () => {
    expect(OWNER.length).toBeGreaterThan(1500);
    expect(OWNER).toMatch(/import \{[^}]*VP_POC_DEFAULT[^}]*\} from "\.\/marketFieldMaterial";/);
    expect(OWNER).toMatch(/import \{[^}]*VP_VALUE_AREA_DEFAULT[^}]*\} from "\.\/marketFieldMaterial";/);
    // The VP's value-area default (`#8a8271`) must never be spelled here: the
    // "has the trader chosen?" baseline is the Appearance owner's, not a copy.
    expect(OWNER).not.toMatch(/#8a8271/i);
  });

  it("holds no storage of its own — the palette arrives, it is never fetched", () => {
    expect(OWNER).not.toMatch(/localStorage|sessionStorage|addEventListener|window\./);
  });
});

describe("the gear tells the trader where the choice reaches", () => {
  it("the VP gear's level inks say they restyle every profile, not only the VP", () => {
    const room = strip(read("src/components/chart/ChartsDashboard.tsx"));
    expect(room).toContain('data-testid="vp-level-ink-scope"');
    expect(room).toMatch(/restyles every profile on the chart/);
    expect(room).not.toContain("POC line, VAH box & VAL box colors.");
  });
});
