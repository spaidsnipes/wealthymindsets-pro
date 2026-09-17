import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  compileVpRenderReceipt,
  type VpColumnAttempt,
  type VpDeclineReason,
} from "./vpRenderReceipt";

/**
 * The receipt exists to answer ONE question the rest of the VP stack cannot:
 * did the profile the trader asked for actually reach the screen?
 *
 * `vpEngine` knows where the volume goes and `vpDrawGeometry` knows where the
 * pixels go, and BOTH can be perfectly right while the trader looks at an empty
 * right-hand lane — because the draw loop returned early and said nothing.
 */

const drew = (profile: "FIXED" | "SESSION", rows: number): VpColumnAttempt => ({
  profile,
  declined: null,
  rows,
});

const refused = (
  profile: "FIXED" | "SESSION",
  declined: VpDeclineReason,
): VpColumnAttempt => ({ profile, declined, rows: 0 });

describe("compileVpRenderReceipt — nothing requested is not nothing drawn", () => {
  it("an empty frame reports zero of everything and makes no complaint", () => {
    // VP toggled OFF is not a failure to draw VP. If this ever produced a note,
    // every chart in the product would carry a permanent grievance about a
    // feature the trader deliberately turned off.
    expect(compileVpRenderReceipt([])).toEqual({
      requested: 0,
      drawn: 0,
      declined: 0,
      rows: 0,
      note: null,
    });
  });

  it("silence on success — a drawn profile earns no note", () => {
    // Absence of a complaint is not a certificate. This module counts; it does
    // not look at pixels, so it must never issue an all-clear.
    expect(compileVpRenderReceipt([drew("FIXED", 61)]).note).toBeNull();
  });
});

describe("compileVpRenderReceipt — each decline keeps its own reason", () => {
  const REASONS: readonly VpDeclineReason[] = [
    "NO_BARS",
    "FLAT_RANGE",
    "NO_VOLUME",
    "NO_BUCKETS",
    "NO_ROOM",
  ];

  it("all five of drawWMVP's early returns are expressible and distinct", () => {
    // Collapsing these into one "EMPTY" would send the trader to fix the wrong
    // thing: NO_BARS is a data problem (widen the range), NO_ROOM is a layout
    // problem (widen the pane). Same blank lane, opposite remedies.
    const notes = REASONS.map((r) => compileVpRenderReceipt([refused("FIXED", r)]).note);
    expect(new Set(notes).size).toBe(REASONS.length);
    for (const n of notes) expect(n).toBeTruthy();
  });

  it("the note names the profile, so a two-column frame is not ambiguous", () => {
    const note = compileVpRenderReceipt([
      drew("FIXED", 48),
      refused("SESSION", "NO_BARS"),
    ]).note;
    expect(note).toContain("Session VP");
    expect(note).not.toContain("Fixed VP");
  });

  it("counts a partial frame as partial — this is the reported regression shape", () => {
    // "Session VP disappeared while Fixed VP still draws" is a real
    // Founder-reported bug (WM-VP-SESSION-EMPTY-FIX). A single did-it-draw
    // boolean would have read TRUE through the whole of it.
    const r = compileVpRenderReceipt([drew("FIXED", 48), refused("SESSION", "NO_BARS")]);
    expect(r).toMatchObject({ requested: 2, drawn: 1, declined: 1, rows: 48 });
  });

  it("both declined — two complaints, both kept", () => {
    const r = compileVpRenderReceipt([
      refused("FIXED", "NO_ROOM"),
      refused("SESSION", "NO_ROOM"),
    ]);
    expect(r).toMatchObject({ requested: 2, drawn: 0, declined: 2, rows: 0 });
    expect(r.note!.match(/not drawn/g)).toHaveLength(2);
  });

  it("requested always equals drawn + declined — no attempt is dropped", () => {
    const frames: VpColumnAttempt[][] = [
      [],
      [drew("FIXED", 1)],
      [refused("FIXED", "NO_VOLUME")],
      [drew("FIXED", 30), drew("SESSION", 12)],
      [drew("FIXED", 30), refused("SESSION", "FLAT_RANGE")],
      [refused("FIXED", "NO_BUCKETS"), refused("SESSION", "NO_ROOM")],
    ];
    for (const f of frames) {
      const r = compileVpRenderReceipt(f);
      expect(r.drawn + r.declined, JSON.stringify(f)).toBe(r.requested);
      expect(r.requested).toBe(f.length);
    }
  });
});

describe("compileVpRenderReceipt — the row count is the evidence, not the claim", () => {
  it("a 'drawn' column that painted zero rows is DECLINED anyway", () => {
    // THE LOAD-BEARING RULE. The draw loop can clear every guard and still
    // `continue` past every single bucket — all of them off-screen — and then
    // report success. A column with no rows on it is not a column the trader
    // can see, and a receipt that takes the caller's word over the row count
    // has stopped recording work and started certifying it.
    const r = compileVpRenderReceipt([{ profile: "FIXED", declined: null, rows: 0 }]);
    expect(r).toMatchObject({ requested: 1, drawn: 0, declined: 1, rows: 0 });
    expect(r.note).toContain("Fixed VP not drawn");
  });

  it("one painted row is enough to count as drawn — a thin profile is still a profile", () => {
    expect(compileVpRenderReceipt([drew("SESSION", 1)])).toMatchObject({
      drawn: 1,
      declined: 0,
      rows: 1,
    });
  });

  it("rows sum across drawn columns only", () => {
    const r = compileVpRenderReceipt([
      drew("FIXED", 61),
      { profile: "SESSION", declined: "NO_ROOM", rows: 999 },
    ]);
    // A declined column claiming 999 rows is a contradiction; the decline wins
    // and its rows are not banked. Otherwise a broken caller could inflate the
    // measurement channel the live geometry proof reads.
    expect(r.rows).toBe(61);
  });

  it("junk row counts never corrupt the total", () => {
    for (const junk of [Number.NaN, Number.POSITIVE_INFINITY, -7, 0.5]) {
      const r = compileVpRenderReceipt([{ profile: "FIXED", declined: null, rows: junk }]);
      expect(Number.isFinite(r.rows), String(junk)).toBe(true);
      expect(r.rows, String(junk)).toBeGreaterThanOrEqual(0);
    }
    expect(
      compileVpRenderReceipt([{ profile: "FIXED", declined: null, rows: 12.9 }]).rows,
    ).toBe(12);
  });
});

/**
 * SENTINEL — the receipt must be STAMPED, not merely computed.
 *
 * A compiler with no caller is the failure mode this repo has hit repeatedly:
 * `vpRenderGeometry.test.ts` exists because vpDrawGeometry once had a full
 * green suite and ZERO production callers while MainChart computed its own
 * arithmetic inline. The same trap is open here — `compileVpRenderReceipt`
 * could pass every test above while `drawWMVP` kept returning `undefined`.
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had.
 */
describe("SENTINEL — MainChart publishes the receipt it compiles", () => {
  const REL = "src/components/chart/MainChart.tsx";
  /**
   * COMMENT-STRIPPED. Every claim below is also DISCUSSED in prose in that
   * file, which is precisely how a source-scanning test goes green while the
   * renderer still says nothing.
   */
  const src = fs
    .readFileSync(path.join(process.cwd(), REL), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("this is still the renderer — the suite cannot go vacuous by a rename", () => {
    expect(src, REL).toContain("function drawWMVP");
    expect(src, REL).toContain("function runWMVP");
  });

  it("the compiler is imported and CALLED, not just imported", () => {
    // An import alone satisfies `includes("compileVpRenderReceipt")` and guards
    // nothing — the exact hole that was found in the feed-publisher Sentinel.
    expect(src).toMatch(/compileVpRenderReceipt\s*\(/);
  });

  it("all five declines are named in the renderer, none left as a bare return", () => {
    for (const reason of ["NO_BARS", "FLAT_RANGE", "NO_VOLUME", "NO_BUCKETS", "NO_ROOM"]) {
      expect(src, `${REL} → ${reason}`).toContain(`"${reason}"`);
    }
  });

  it("drawWMVP has no bare `return;` left — every exit reports its outcome", () => {
    // The whole point. A `return;` inside drawWMVP is a decline that vanishes.
    const start = src.indexOf("function drawWMVP");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("function runWMVP", start);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end);
    // The nested drawVALevel closure legitimately uses a bare `return;`, so
    // only count exits at drawWMVP's own indentation (8 spaces).
    const bare = body.match(/^ {8}(?:if \([^\n]*\) )?return;\s*$/gm);
    expect(bare, `bare returns in drawWMVP: ${JSON.stringify(bare)}`).toBeNull();
  });

  it("the outcome reaches the DOM — the measurement channel exists", () => {
    // Without the stamp the receipt is computed and discarded, and the VP
    // render gate remains unclosable from outside the renderer: the profile is
    // a canvas bitmap with no element to inspect and no text to read.
    expect(src).toMatch(/vpRequested/);
    expect(src).toMatch(/vpDrawn\s*=/);
    expect(src).toMatch(/vpDeclined/);
    expect(src).toMatch(/vpRows/);
  });

  it("an unrequested frame CLEARS the stamp rather than writing zeros", () => {
    // `data-vp-drawn="0"` means the VP was asked for and produced nothing.
    // Its absence means no VP was asked for. Leaving a stale `0` on a chart
    // with VP switched off would manufacture a permanent false defect for any
    // reader of this channel — including the live geometry proof.
    expect(src).toMatch(/delete\s+ds\.vpRequested/);
  });
});
