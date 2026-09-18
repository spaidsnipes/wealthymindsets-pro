/**
 * §9 SENTINEL — A VERDICT MAY NOT CHOOSE ITS OWN COLOUR.
 *
 * Build Order §9: "No green shield. No green means safe. Verified truth is a
 * sentence."
 *
 * ── WHY A SECOND §9 SENTINEL ────────────────────────────────────────────────
 *
 * `src/components/experience/noGreenInTheRoom.sentinel.test.ts` already exists
 * and is the stronger guard: inside the decision room it bans green-dominant
 * colour outright unless a human signs for the literal. Its own docblock
 * explains why it is scoped to one directory — the repo carries green in ~98
 * files, most of it candle-up convention and brand teal, and freezing all of it
 * would be noise.
 *
 * That leaves the rest of the product with no rule at all, and the rest of the
 * product had the violations. A sweep run this shift found six by reading
 * files. The sweep then MISSED two more in `DLARStrip.tsx` — on
 * /command-deck, the flagship — including one where a RESOLVED market direction
 * of "down" was painted green next to a trader's long position. Reading is not
 * a mechanism.
 *
 * ── THE NARROWER RULE THIS FILE CAN ACTUALLY ENFORCE ─────────────────────────
 *
 * Not "no green anywhere". The enforceable shape is the one that was always the
 * actual defect:
 *
 *     A GRADE WORD IN A CONDITION MUST NOT SELECT A GREEN.
 *
 * `verdict === "RESPONDING" ? "#5cb85c"`, `resolution === "RESOLVED" ?
 * "#5cb85c"`, `status === "ON_PACE" ? "text-emerald-300"` — every §9 violation
 * repaired this shift has that shape, because that shape IS the green shield:
 * an assessment reaching for a colour the trader decodes as permission before
 * they have read the word beside it.
 *
 * What the shape deliberately does NOT catch, and must not: a P&L sign, a
 * percent change, a candle's up colour, brand teal. Those encode a DIRECTION or
 * a SIGN, not a grade, and §9 leaves them alone. The condition is the
 * discriminator — `pnl >= 0` is not a grade word and never trips this.
 *
 * ── IT REPORTS, IT DOES NOT JUDGE ────────────────────────────────────────────
 *
 * Like its sibling, this cannot tell a graded green from a coincidence of
 * proximity, so it does not pretend to. Every hit must appear in ALLOWED with a
 * written sentence. Writing the sentence is the whole mechanism: none of the
 * eight violations repaired this shift could have produced one.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");

/**
 * Block comments are blanked rather than deleted so LINE NUMBERS SURVIVE — a
 * scanner that reports the wrong line sends the next reader to the wrong code,
 * and these files carry long docblocks that would shift every report by dozens
 * of lines. Whole-line `//` comments go entirely; a trailing `//` keeps its
 * line, because eating to end-of-line could HIDE a colour, and a false negative
 * is the one direction a safety scanner must never fail in.
 */
function strip(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/**
 * The vocabulary of ASSESSMENT. Every word here names a judgement the product
 * formed — never a market fact, never a sign, never a direction of price.
 *
 * `direction` is pointedly ABSENT despite MirrorPanel having carried a green
 * one. It is the most overloaded word in the repo: a candle has a direction, a
 * delta chip has a direction, a ticker has a direction, and all three are signs
 * rather than grades. Including it would have produced a ledger of legitimate
 * entries long enough that nobody reads it, which is how a scanner becomes a
 * rubber stamp. The narrow rule that bites is worth more than the broad rule
 * that gets skimmed.
 */
/**
 * Shape 1 — the grade is COMPARED: `verdict === "RESPONDING" ? green`.
 *
 * The relational operators are in the list because of `/paper`, which tiered a
 * leaderboard win rate `>= 60 ? "text-wm-green" : >= 50 ? gold : red`. A
 * THRESHOLD is a grade — arguably the purest one, since 60 and 50 were numbers
 * the house invented and never defended. An equality check was the only shape
 * this regex knew about until the fixture below proved otherwise.
 *
 * `pnl >= 0` is untouched by the widening and always will be, because the
 * discriminator is the VOCABULARY, not the operator: a P&L is a sign, `pnl` is
 * not a grade word, and §9 leaves signs alone.
 */
const GRADE_COMPARED =
  /\b(?:verdict|resolution|maturity|compliance|adherence|grade|stage|outcome|win|winRate|quality|passed|cleared|healthy|status)\b\s*(?:===|!==|==|>=|<=|>|<|\?)|\b(?:isResolved|isCleared|isPassed|isSafe|isHealthy|isCompliant)\b/i;

/**
 * Shape 2 — the grade is a TABLE. This is here because the detector was PROVEN
 * blind to it, not because it was foreseen.
 *
 * PlaybookDNAPanel shipped its green as `const MATURITY_STYLES:
 * Record<PlaybookMaturity, …> = { ESTABLISHED: { color: "#5cb85c" } }`. There
 * is no comparison anywhere near the colour — the judgement is the KEY, and the
 * grade word lives in the const name and the type parameter. Shape 1 walked
 * straight past it, and the shipped-shapes test below caught that on the first
 * run of this file.
 *
 * A lookup table is the most common way this repo expresses a graded scale, so
 * a §9 scanner that could not see one was guarding the minority case.
 *
 * CASE-SENSITIVE, deliberately, and kept as its own regex for that reason: the
 * signal is SCREAMING_CASE (a module-level grade table) or a capitalised type
 * parameter. Folding it into the case-insensitive shape above would match the
 * bare word "stage" or "grade" in any prose-shaped identifier and flood the
 * ledger, which is how a scanner becomes a rubber stamp.
 */
const GRADE_TABLE =
  /*
    `[A-Z_]*` and NOT `[A-Z][A-Z_]*`. The leading `[A-Z]` was there to require a
    capital, and it consumed the `M` of `MATURITY_STYLES` — the engine then
    looked for `MATURITY` starting at `ATURITY` and gave up. The shipped-shapes
    test below caught it, which is the second time in this file's short life
    that the fixture found a hole in the detector rather than the other way
    round. `\b` already guarantees a token boundary, so the capital is implied.
  */
  /\b[A-Z_]*(?:MATURITY|VERDICT|RESOLUTION|STAGE|COMPLIANCE|GRADE|OUTCOME|QUALITY)[A-Z_]*\b|Record<\s*\w*(?:Maturity|Verdict|Resolution|Stage|Compliance|Grade|Outcome|Quality)\w*/;

/**
 * Shape 3 — the grade is UNCONDITIONAL. This is the worst case, not the mildest,
 * and both shapes above are blind to it BY CONSTRUCTION.
 *
 * /proof-lane shipped `<span className="text-emerald-300 font-mono">{(measured
 * .rulesAdheredPct * 100)…}</span>`. There is no comparison and no table — there
 * is no condition AT ALL. 12% adherence rendered in exactly the same green as
 * 98%. The colour was not grading badly; it was not grading at all. It was a
 * flat congratulation stapled to a number, which is strictly less honest than a
 * wrong threshold, because a wrong threshold can at least be argued with.
 *
 * THE VOCABULARY IS DELIBERATELY NARROW, and that is the whole design of this
 * shape. The obvious rule — any `\w+(?:Pct|Ratio|Rate|Score)` near a green —
 * was prototyped first and returned 19 hits repo-wide, of which roughly
 * seventeen are §9-EXEMPT signed readings: `changePct`, `myPct >= 0`,
 * `avgPct >= 0`, `bidPct`, `buyPct`, `sessionPct`, `up ? … : …`. §9 has never
 * banned green for a SIGN. Shipping that rule would have bought one real catch
 * at the price of a seventeen-entry allowance ledger, and a ledger that long is
 * skimmed, which is how a scanner becomes a rubber stamp.
 *
 * So the stem list names only words that are grades of the TRADER — did they
 * follow the plan, did they capture the move, are they compliant, accurate,
 * disciplined. None of these can be negative. A sign is not a grade, and this
 * regex cannot see one.
 *
 * Current repo-wide count after the /proof-lane repair: ZERO. The ledger below
 * carries no entry for this shape, which is the state a narrow rule should be
 * in — it bites, and it is quiet.
 */
const GRADE_UNCONDITIONAL =
  /\b\w*(?:adher|captur|complian|quality|accuracy|success|discipline|consistency|grade|readiness|process)\w*(?:Pct|Ratio|Rate|Score)\b/i;

const looksGraded = (context: string) =>
  GRADE_COMPARED.test(context) || GRADE_TABLE.test(context) || GRADE_UNCONDITIONAL.test(context);

/** Hex, rgb(a), and the Tailwind/token names — a class is a colour too. */
const COLOUR =
  /#[0-9a-fA-F]{6}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+|\b(?:text|bg|border|from|to)-(?:wm-green|emerald-\d+|green-\d+|lime-\d+)\b/g;

/**
 * GREEN-DOMINANT, not "has a green channel". Every ivory and brass in this
 * house has one — #ede6d3 is (237,230,211) — so a channel test would ban the
 * palette. A colour reads green to a human when green beats both others.
 */
export function isGreenDominant(token: string): boolean {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(token);
  if (hex) {
    const h = hex[1];
    const [r, g, b] = [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)].map((x) => parseInt(x, 16));
    return g > r && g > b;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(token);
  if (rgb) {
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    return g > r && g > b;
  }
  // A named green class is green by its name.
  return true;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(name) && !/\.(test|sentinel|render|spec)\./.test(name) && !name.endsWith(".d.ts")) {
      out.push(path.relative(process.cwd(), full));
    }
  }
  return out;
}

export interface GradedGreen {
  readonly file: string;
  readonly line: number;
  readonly colour: string;
}

/**
 * A three-line lookback, not a parse. A ternary in this repo is routinely
 * written across four lines with the condition on the first and the colour on
 * the third, and `chipStateForDim` puts the condition in an `if` and the colour
 * in the `return` two lines down — the exact shape that a single-line regex
 * walked straight past when this sentinel was prototyped.
 */
export function gradedGreens(source: string, file = "<inline>"): GradedGreen[] {
  const lines = strip(source).split("\n");
  const hits: GradedGreen[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(COLOUR)) {
      if (!isGreenDominant(m[0])) continue;
      const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
      if (!looksGraded(context)) continue;
      const key = `${i}:${m[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ file, line: i + 1, colour: m[0] });
    }
  }
  return hits;
}

/**
 * THE REVIEWED LEDGER, keyed `file → colour`. Every entry is a green a human
 * read in place and decided is not a safety claim.
 *
 * Note what is NOT here and may never be: a verdict, a maturity, a resolution,
 * a pace status, a win-rate tier. Those are the green shield by definition, and
 * §9 says the shield does not exist — the sentence carries the truth.
 */
const ALLOWED: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "src/app/paper/page.tsx": {
    "bg-wm-green":
      "An order whose `status` is `filled`. A fill is an EVENT THAT OCCURRED, "
      + "not an assessment of the trader — it reports that the exchange did the "
      + "thing that was asked, and it carries no opinion about whether asking "
      + "was wise. The same row shows a losing fill in the same green chip, "
      + "which is the proof it grades nothing.",
    "text-wm-green":
      "The text half of the same filled-order chip. Same reason: an execution "
      + "fact, not a verdict on the decision that produced it. The win-rate "
      + "column on this page WAS a graded green and was repaired — that one "
      + "scored the trader against thresholds the house invented.",
  },
  "src/components/broker/AlpacaTradingPanel.tsx": {
    "#00C076":
      "`isFilled` on a real broker order — the same execution fact as the paper "
      + "surface above, in the live panel. It says the order reached the "
      + "exchange and completed. A failed load renders amber and an open order "
      + "renders neutral, so the scale encodes ORDER LIFECYCLE rather than any "
      + "judgement of the position's merit.",
  },
  "src/components/ui/DataHealth.tsx": {
    "#5cb85c":
      "`LIVE` on the feed-quality badge. This grades the DATA, not the trader "
      + "and not the market — it is a checkable claim about a socket, and the "
      + "trader can falsify it by watching the tape. The whole primitive exists "
      + "because the Founder called out a single green LIVE pill standing in "
      + "for four different states; splitting them was the repair, and the "
      + "green now means only the one state it names.",
    "rgba(92,184,92":
      "The border half of the same LIVE badge. Same colour, same claim about "
      + "the feed rather than about the decision — a bordered pill and its text "
      + "are one control, and splitting the ledger entry would suggest two "
      + "separate judgements were made.",
    "#9abf72":
      "`NEAR-LIVE`, one step down the same feed-quality ladder and deliberately "
      + "a DIMMER green rather than a different hue: the two states differ by "
      + "latency, and a second colour would teach the eye they differ in kind. "
      + "Still a statement about the socket, never about the trade.",
    "rgba(154,191,114":
      "The border half of the NEAR-LIVE badge, allowed for exactly the reason "
      + "its text is: it describes the freshness of a socket rather than the "
      + "wisdom of a decision, and the trader can check it against the tape.",
  },
  "src/app/journal/page.tsx": {
    "#00D4AA":
      "WM brand teal in a decorative gradient on the song-generation control. "
      + "Caught only by proximity — a `status` check happens to sit within the "
      + "three-line lookback — and it names no condition and grades nothing. "
      + "Kept in the ledger rather than tuning the window smaller, because a "
      + "narrower window would have missed the multi-line DLARStrip violation "
      + "this sentinel was written for.",
  },
};

describe("§9 Sentinel — a verdict may not choose its own colour", () => {
  it("scans a tree that actually has files in it", () => {
    // A scanner pointed at nothing passes forever. Pin the floor.
    expect(sourceFiles(SRC).length).toBeGreaterThan(300);
  });

  it("has no grade word selecting a green that a human has not signed for", () => {
    const unreviewed: GradedGreen[] = [];
    for (const file of sourceFiles(SRC)) {
      const allowedHere = ALLOWED[file] ?? {};
      for (const hit of gradedGreens(readFileSync(path.join(process.cwd(), file), "utf8"), file)) {
        if (hit.colour in allowedHere) continue;
        unreviewed.push(hit);
      }
    }

    // If this fails: either the green grades a judgement — in which case §9 says
    // remove it, and the distinction moves to a WORD, a glyph, or a neutral
    // weight — or it does not, in which case add it to ALLOWED with a sentence.
    expect(unreviewed).toEqual([]);
  });

  it("keeps the ledger honest — every allowance carries a real reason", () => {
    // A one-word reason is how a ledger like this rots into a rubber stamp.
    for (const [file, colours] of Object.entries(ALLOWED)) {
      for (const [colour, reason] of Object.entries(colours)) {
        expect(reason.length, `${file} ${colour}`).toBeGreaterThan(80);
      }
    }
  });

  it("does not carry a stale allowance for a colour that is gone", () => {
    // An allowance that outlives its colour is an invitation: the next author
    // finds a pre-approved green sitting in the ledger and reaches for it.
    for (const [file, colours] of Object.entries(ALLOWED)) {
      const hits = gradedGreens(readFileSync(path.join(process.cwd(), file), "utf8"), file);
      const present = new Set(hits.map((h) => h.colour));
      for (const colour of Object.keys(colours)) {
        expect([...present], `${file} no longer grades with ${colour}`).toContain(colour);
      }
    }
  });

  it("CATCHES THE SHAPES THIS SHIFT REPAIRED — the detector must bite", () => {
    // Proof it is not passing vacuously. Every one of these shipped.
    const shapes: readonly string[] = [
      // DLARStrip — the two the human sweep missed.
      'verdict === "RESPONDING" ? "#5cb85c" :',
      'if (dim.resolution === "RESOLVED") {\n  return { color: "#5cb85c" };\n}',
      // PersonalEdgePanel / PersonalEdgeChip — one VM field, two surfaces.
      'vm.resolution === "RESOLVED" ? "#5cb85c" :',
      // PlaybookDNAPanel — the table shape, written the way it actually shipped.
      'const MATURITY_STYLES = {\n  ESTABLISHED: { color: "#5cb85c", glyph: "●" },\n};',
      // proof-lane, both sites.
      'status.status === "ON_PACE" ? "border-emerald-700/60" : "x"',
      'status.status === "BEHIND" ? "text-rose-300" : "text-emerald-300"',
      // /paper win-rate tiering.
      'entry.winRate >= 60 ? "text-wm-green" : "text-wm-red"',
      // Shape 3 — /proof-lane, the two lines with NO condition at all. Both
      // shapes above are structurally blind to these; they are the reason the
      // third exists.
      '<span className="text-emerald-300 font-mono">{(measured.rulesAdheredPct * 100).toFixed(0)}%</span>',
      '<span className="text-emerald-300 font-mono">{(measured.avgCaptureRatio * 100).toFixed(0)}%</span>',
    ];
    for (const shape of shapes) {
      expect(gradedGreens(shape).length, `not caught: ${shape}`).toBeGreaterThan(0);
    }
  });

  it("LEAVES A SIGN ALONE — the rule is about grades, not about green", () => {
    // §9 explicitly permits green for price direction, P&L sign and percent
    // change. If this sentinel fired on those it would be uninstallable, and an
    // uninstalled guard protects nothing.
    const signs: readonly string[] = [
      'pnl >= 0 ? "#5cb85c" : "#c05a4a"',
      'change >= 0 ? "text-wm-green" : "text-wm-red"',
      'upColor: "#5cb85c", downColor: "#c05a4a"',
      'side === "BUY" ? "#00d4aa" : "#c05a4a"',
      'realizedR > 0 ? "#5cb85c" : "#c05a4a"',
      // Shape 3's exemptions, named as fixtures so the narrow vocabulary cannot
      // be widened later without this test going red. Every one of these is a
      // SIGNED reading — a percent that can be negative is not a grade.
      '<span className="text-wm-green">{changePct}%</span>',
      'myPct >= 0 ? "text-emerald-300" : "text-rose-300"',
      'const c = bidPct > 50 ? "#5cb85c" : "#c05a4a";',
      'buyPct >= 50 ? "rgba(0,212,170,0.9)" : "rgba(255,77,106,0.9)"',
    ];
    for (const sign of signs) {
      expect(gradedGreens(sign), `false positive on a sign: ${sign}`).toEqual([]);
    }
  });

  it("does not fire on the house ivory, brass or charcoal", () => {
    expect(
      gradedGreens('verdict === "OK" ? "#ede6d3" : resolution === "X" ? "#c9a55c" : "#55503f"'),
    ).toEqual([]);
    expect(gradedGreens('status === "A" ? "rgba(201,165,92,0.85)" : "rgba(237,230,211,0.55)"')).toEqual([]);
  });

  it("reports the line a reader can actually open", () => {
    // Blanking block comments instead of deleting them is the only reason this
    // holds. A reported line that is off by a docblock sends the next reader to
    // unrelated code and teaches them the scanner is unreliable.
    const src = 'const a = 1;\n/* a long\n   docblock\n   here */\nconst c = verdict === "OK" ? "#5cb85c" : "#000000";';
    expect(gradedGreens(src)).toEqual([{ file: "<inline>", line: 5, colour: "#5cb85c" }]);
  });
});
