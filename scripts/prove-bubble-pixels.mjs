#!/usr/bin/env node
/**
 * Bubble PIXEL proof — read back the discs that were actually painted.
 *
 * ── Why a second pixel instrument ────────────────────────────────────────────
 *
 * scripts/prove-vp-pixels.mjs closed the Volume Profile's version of this gate
 * on one observation: "canvas has no DOM" is true of vitest and FALSE of a real
 * browser, which has `getImageData()`. The delta bubbles sit on the same canvas
 * and carried the same blind spot.
 *
 * src/lib/bubbleDrawGeometry.ts now owns bubble SIZE and is unit-tested. Those
 * tests measure a NUMBER. This measures the DISC, which is the thing a human
 * reads. The gap between the two is not theoretical: the owner returns an
 * INTEGER radius, and every law about proportionality has to survive that
 * quantization before it is a claim about what anyone can see.
 *
 * ── The claim being measured ─────────────────────────────────────────────────
 *
 * A bubble is read as an AREA. The owner therefore encodes value as area:
 * r = maxR * sqrt(value / peak), so painted area is linear in value. This file
 * paints with the shipped owner, counts the painted bytes, and checks that the
 * RATIO OF PAINTED AREAS between two bubbles equals the ratio of their values.
 *
 * That is the law the three defects the owner replaced all broke, each in a way
 * that is invisible to arithmetic and obvious in pixels:
 *   · an 11px baseline gave an EMPTY zone ~19% of the peak's painted area;
 *   · a clamp made every large print paint an identical disc;
 *   · a mean normalizer resized a bubble because a DIFFERENT trade happened.
 *
 * ── Vacuity ──────────────────────────────────────────────────────────────────
 *
 * A canvas that paints nothing satisfies every law about what it painted. The
 * VACUOUS law runs first and fails loudly if the scene is empty, if any bubble
 * vanished, or if the discs overlap (which would merge two measurements into
 * one and make the proportionality law meaningless).
 *
 * ── Revive modes ─────────────────────────────────────────────────────────────
 *
 * `WM_BUBBLE_REVIVE=<mode>` swaps a defect into the SIZE decision so you can
 * see which law fires. A law that cannot be made to fail is not a measurement —
 * three of the five VP laws were written wrong the first time and were caught
 * only because their revive ran GREEN.
 *   BASELINE  | CLAMP | LINEAR_RADIUS | NO_FLOOR | MEAN_NORM
 *
 *   node scripts/prove-bubble-pixels.mjs
 *   WM_BUBBLE_REVIVE=BASELINE node scripts/prove-bubble-pixels.mjs   # expect RED
 *
 * ── SCOPE, stated so a green run is not over-read ────────────────────────────
 *
 * This proves the SIZE owner paints honest discs. It does NOT prove MainChart's
 * composed scene does: MainChart also picks colour by side, spreads siblings,
 * eases the radius up on spawn, and floats the bubbles over live price action.
 * Whether the assembled picture reads well remains HUMAN_PROOF_REQUIRED.
 *
 * Exit 0 clean, 1 on any offence, 2 if no browser could be launched — because
 * "could not measure" must never be reportable as "found nothing".
 */

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const REVIVE = process.env.WM_BUBBLE_REVIVE ?? "";
const REVIVE_MODES = ["BASELINE", "CLAMP", "LINEAR_RADIUS", "NO_FLOOR", "MEAN_NORM"];
if (REVIVE && !REVIVE_MODES.includes(REVIVE)) {
  console.error(`unknown WM_BUBBLE_REVIVE=${REVIVE}; expected one of ${REVIVE_MODES.join(" | ")}`);
  process.exit(2);
}

/* ── The scene ───────────────────────────────────────────────────────────────
 *
 * Twelve zones on one bar. The values are PERFECT SQUARES scaled to the peak,
 * and that is load-bearing rather than tidy: with v = k², the honest radius is
 * maxR·k/100 — a number the integer rounding barely perturbs — so a ratio error
 * in the painted area is the shaping function and not the pixel grid.
 *
 * Six of the twelve sit above the floor with radii spanning 12.5 → 25, which is
 * the band the proportionality law is measured in. The other six are BELOW the
 * floor by design: a zone at 0.01% of peak exists only to prove the floor is a
 * floor (it paints, it is disclosed as floored, and it does NOT paint a fifth
 * of the peak the way the old baseline formula did).
 */
const VALUES = [10000, 8100, 6400, 4900, 3600, 2500, 900, 400, 100, 25, 4, 1];
const COLS = 4;
const CELL = 130;
const CANVAS_W = COLS * CELL;
const CANVAS_H = Math.ceil(VALUES.length / COLS) * CELL;
const DISC_RGB = [0, 200, 120];

/* ── Bundle the SHIPPED owner for the browser ────────────────────────────────
 *
 * Re-typing `maxR * Math.sqrt(v / peak)` into this file would make this gate
 * measure a picture nobody ships — the mirror-testing mistake this repo already
 * paid for in deltaBubbleBinning.test.ts and in the deleted audit-bubbles.mjs.
 */
const dir = mkdtempSync(join(tmpdir(), "bubble-pixels-"));
const entry = join(dir, "entry.ts");
const bundle = join(dir, "bubblegeom.js");
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(ROOT, "src/lib/bubbleDrawGeometry"))};\n`,
);
execFileSync(join(ROOT, "node_modules/.bin/esbuild"), [
  entry, "--bundle", "--platform=browser", "--format=iife",
  "--global-name=BUBGEOM", `--outfile=${bundle}`,
], { stdio: "inherit" });

let engine = "chrome";
const browser = await chromium.launch({ channel: "chrome" }).catch(async (error) => {
  engine = "bundled-chromium";
  console.log(
    `NOTICE  installed Chrome unavailable (${error.message.split("\n")[0]}) — ` +
      "measuring with Playwright's bundled Chromium instead.",
  );
  return chromium.launch().catch((second) => {
    console.log(
      "REFUSING TO REPORT — no browser to paint with. Neither the installed " +
        `Chrome nor Playwright's bundled Chromium could launch (${second.message.split("\n")[0]}). ` +
        "Run `npx playwright install chromium`. This is NOT a clean measurement.",
    );
    process.exit(2);
  });
});

const page = await browser.newPage();
await page.addScriptTag({ path: bundle });

const measured = await page.evaluate(
  ({ VALUES, COLS, CELL, CANVAS_W, CANVAS_H, DISC_RGB, REVIVE }) => {
    const G = window.BUBGEOM;

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const peak = Math.max(...VALUES);
    const mean = VALUES.reduce((s, v) => s + v, 0) / VALUES.length;

    const bubbles = VALUES.map((value, i) => {
      // THE OWNER decides the size. Every revive below replaces this one line
      // with a formula that used to ship, so the laws are aimed at the SIZE
      // decision and not at anything else in the scene.
      let r = G.deltaBubbleRadius(value, peak);
      let floored = G.bubbleRadiusIsFloored(value, peak, { maxR: 25 });

      if (REVIVE === "BASELINE") {
        // MainChart.tsx ≈4917 as it shipped: an 11px baseline blended into the
        // ramp, so a zone carrying nothing still painted a substantial disc.
        r = Math.round(11 + Math.sqrt(value / peak) * 14);
        floored = false;
      } else if (REVIVE === "CLAMP") {
        // MainChart.tsx ≈5395 as it shipped: a ceiling that saturates.
        r = Math.round(Math.max(6, Math.min(13, 25 * Math.sqrt(value / peak))));
        floored = 25 * Math.sqrt(value / peak) < 6;
      } else if (REVIVE === "LINEAR_RADIUS") {
        // The naive encoding: radius proportional to value. Reads as area
        // proportional to value SQUARED — the picture exaggerates every lead.
        r = Math.round(Math.max(6, 25 * (value / peak)));
        floored = 25 * (value / peak) < 6;
      } else if (REVIVE === "NO_FLOOR") {
        // No legibility floor: the smallest zones round to nothing and vanish.
        // Absence reads as "no flow here", which is a false statement.
        r = Math.round(25 * Math.sqrt(value / peak));
        floored = false;
      } else if (REVIVE === "MEAN_NORM") {
        // Normalizing against the bar MEAN instead of its peak. The outlier the
        // bubble exists to show drags the mean and resizes its neighbours.
        r = G.deltaBubbleRadius(value, mean);
        floored = G.bubbleRadiusIsFloored(value, mean, { maxR: 25 });
      }

      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return {
        index: i,
        value,
        r,
        floored,
        cx: col * CELL + CELL / 2,
        cy: row * CELL + CELL / 2,
        cellX: col * CELL,
        cellY: row * CELL,
      };
    });

    ctx.fillStyle = `rgb(${DISC_RGB.join(",")})`;
    for (const b of bubbles) {
      if (b.r <= 0) continue;
      ctx.beginPath();
      ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Read the bytes back, one CELL at a time ─────────────────────────────
    const all = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
    let totalPainted = 0;
    for (let i = 0; i < all.length; i += 4) {
      if (all[i] || all[i + 1] || all[i + 2]) totalPainted++;
    }

    let cellSum = 0;
    for (const b of bubbles) {
      const px = ctx.getImageData(b.cellX, b.cellY, CELL, CELL).data;
      let painted = 0;
      // Also find the painted bounding box, so a disc that leaked into its
      // neighbour's cell is caught rather than silently double-counted.
      let minX = CELL, maxX = -1, minY = CELL, maxY = -1;
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const o = (y * CELL + x) * 4;
          if (px[o] || px[o + 1] || px[o + 2]) {
            painted++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      b.painted = painted;
      b.boxW = maxX >= 0 ? maxX - minX + 1 : 0;
      b.boxH = maxY >= 0 ? maxY - minY + 1 : 0;
      b.touchesEdge = maxX >= 0 && (minX === 0 || minY === 0 || maxX === CELL - 1 || maxY === CELL - 1);
      cellSum += painted;
    }

    return { bubbles, totalPainted, cellSum, peak, mean };
  },
  { VALUES, COLS, CELL, CANVAS_W, CANVAS_H, DISC_RGB, REVIVE },
);

await browser.close();

/* ── The laws ───────────────────────────────────────────────────────────────*/

const offences = [];
const fail = (law, detail) => offences.push({ law, detail });

const B = measured.bubbles;
const peakB = B.reduce((m, b) => (b.painted > m.painted ? b : m), B[0]);

// 1. VACUOUS. A canvas that painted nothing satisfies every law below it.
if (measured.totalPainted < 2000) {
  fail("VACUOUS", `only ${measured.totalPainted} pixels painted across the whole scene — nothing was measured`);
}
if (B.length !== VALUES.length) {
  fail("VACUOUS", `${B.length} bubbles built from ${VALUES.length} values`);
}
for (const b of B) {
  if (b.painted === 0) {
    fail("VACUOUS", `bubble ${b.index} (value ${b.value}) painted NOTHING — a zone that carried real flow is invisible, and absence reads as "no flow here"`);
  }
}
// Discs must not bleed between cells, or two measurements become one.
for (const b of B) {
  if (b.touchesEdge) {
    fail("VACUOUS", `bubble ${b.index} touches its cell edge (box ${b.boxW}x${b.boxH} in a ${CELL}px cell) — the per-bubble areas are no longer separable`);
  }
}
if (measured.cellSum !== measured.totalPainted) {
  fail("VACUOUS", `per-cell pixels sum to ${measured.cellSum} but the whole canvas holds ${measured.totalPainted} — the cells do not tile the scene`);
}

// 2. DISC_IS_A_DISC. The painted area must be the area of the circle the owner
//    asked for. Measured against the INTEGER radius the owner returned, because
//    that is what was requested; this catches a fill rule, an antialias policy
//    or a stroke silently changing the size of every bubble on the chart.
//
//    The tolerance is radius-dependent, and that is a measurement rather than a
//    convenience: a rasterized disc's boundary is O(r) pixels against an area of
//    O(r²), so the unavoidable quantization error scales as ~1/r. A flat 12%
//    was observed to leave only 2.3 points of headroom at the 6px floor — close
//    enough that an antialias policy change would report a real defect. Naming
//    the relationship keeps the law tight where it can be tight.
for (const b of B) {
  const expected = Math.PI * b.r * b.r;
  const err = Math.abs(b.painted - expected) / expected;
  const tolerance = Math.max(0.12, 1.5 / b.r);
  if (err > tolerance) {
    fail("DISC_IS_A_DISC", `bubble ${b.index} asked for r=${b.r} (area ${expected.toFixed(0)}px) and painted ${b.painted}px — ${(err * 100).toFixed(1)}% off, past the ${(tolerance * 100).toFixed(0)}% a disc of that radius can be off by through rasterization alone`);
  }
}

// 3. AREA_TRACKS_VALUE. THE LAW. Between two bubbles that earned their size,
//    the ratio of PAINTED AREAS must equal the ratio of their values.
//
//    Stated as a ratio between measurements rather than against a formula on
//    purpose: a law written against the same quantity a defect corrupts cannot
//    see the defect. That is exactly how the VP harness's SPLIT_ROUND revive
//    came back green the first time.
const earned = B.filter((b) => !b.floored && b.r >= 12);
if (earned.length < 4) {
  fail("AREA_TRACKS_VALUE", `only ${earned.length} bubbles sit above the floor with r>=12 — the scene no longer exercises the proportional band, so this law is vacuous`);
}
for (let i = 0; i < earned.length; i++) {
  for (let j = i + 1; j < earned.length; j++) {
    const a = earned[i], c = earned[j];
    const areaRatio = a.painted / c.painted;
    const valueRatio = a.value / c.value;
    const err = Math.abs(areaRatio - valueRatio) / valueRatio;
    if (err > 0.12) {
      fail("AREA_TRACKS_VALUE", `bubbles ${a.index} and ${c.index} carry ${a.value} vs ${c.value} (ratio ${valueRatio.toFixed(3)}) but painted ${a.painted} vs ${c.painted} px (ratio ${areaRatio.toFixed(3)}) — ${(err * 100).toFixed(1)}% off; the picture is of the shaping function, not the flow`);
    }
  }
}

// 4. FLOOR_IS_A_FLOOR. A zone carrying almost nothing must be visible, must be
//    DISCLOSED as floored, and must not look like a meaningful share of the
//    peak. 19% was the old baseline's answer for a zone carrying ZERO.
const floored = B.filter((b) => b.floored);
if (floored.length === 0) {
  fail("FLOOR_IS_A_FLOOR", "no bubble in the scene is floored — the floor law is not being exercised at all");
}
for (const b of floored) {
  const share = b.painted / peakB.painted;
  const valueShare = b.value / measured.peak;
  if (share > 0.09) {
    fail("FLOOR_IS_A_FLOOR", `bubble ${b.index} carries ${(valueShare * 100).toFixed(2)}% of the peak's value but painted ${(share * 100).toFixed(1)}% of its area — that is a baseline wearing a floor's name`);
  }
  if (b.painted === 0) {
    fail("FLOOR_IS_A_FLOOR", `bubble ${b.index} was floored and still painted nothing`);
  }
}
// Every floored bubble is the SAME size — the floor is one value, not a ramp.
if (new Set(floored.map((b) => b.r)).size > 1) {
  fail("FLOOR_IS_A_FLOOR", `floored bubbles painted at ${[...new Set(floored.map((b) => b.r))].join("/")}px — a floor has one height`);
}

// 5. NO_SATURATION. Distinct values above the floor paint distinct areas, and
//    exactly one bubble — the peak — is the largest.
const earnedAreas = earned.map((b) => b.painted);
if (new Set(earnedAreas).size !== earnedAreas.length) {
  fail("NO_SATURATION", `${earnedAreas.length} distinct values painted only ${new Set(earnedAreas).size} distinct areas — different flow, identical picture`);
}
if (peakB.value !== measured.peak) {
  fail("NO_SATURATION", `the largest bubble (index ${peakB.index}, ${peakB.painted}px) carries ${peakB.value}, not the bar's peak ${measured.peak}`);
}
if (B.filter((b) => b.painted === peakB.painted).length !== 1) {
  fail("NO_SATURATION", `${B.filter((b) => b.painted === peakB.painted).length} bubbles tied for largest — only the peak may reach the ceiling`);
}
// Monotone in the painted bytes, not just in the returned number.
const byValue = [...B].sort((a, b) => a.value - b.value);
for (let i = 1; i < byValue.length; i++) {
  if (byValue[i].painted < byValue[i - 1].painted) {
    fail("NO_SATURATION", `bubble ${byValue[i].index} carries MORE than ${byValue[i - 1].index} (${byValue[i].value} vs ${byValue[i - 1].value}) yet painted FEWER pixels (${byValue[i].painted} vs ${byValue[i - 1].painted})`);
  }
}

/* ── Report ─────────────────────────────────────────────────────────────────*/

console.log(`\nBUBBLE PIXEL PROOF — painted and read back through ${engine}`);
if (REVIVE) console.log(`REVIVE MODE: ${REVIVE} — a RED run here is the expected, correct result.`);
console.log(`  scene        ${CANVAS_W}x${CANVAS_H}, ${B.length} bubbles, peak value ${measured.peak}`);
console.log(`  painted      ${measured.totalPainted} px total`);
console.log(`  proportional band  ${earned.length} bubbles above the floor with r>=12`);
console.log(`  floored      ${floored.length} bubbles at the legibility minimum`);
console.log("");
for (const b of B) {
  const share = (b.painted / peakB.painted) * 100;
  console.log(
    `  bubble ${String(b.index).padStart(2)}  value ${String(b.value).padStart(5)}` +
      ` (${((b.value / measured.peak) * 100).toFixed(2).padStart(6)}% of peak)  r=${String(b.r).padStart(2)}` +
      `  painted ${String(b.painted).padStart(4)}px (${share.toFixed(2).padStart(6)}% of peak area)` +
      `${b.floored ? "  FLOORED" : ""}`,
  );
}

if (offences.length === 0) {
  console.log("\nCLEAN — 5 pixel laws hold against real painted bytes.");
  console.log("SCOPE: this proves the SIZE owner paints honest discs. It does NOT prove");
  console.log("MainChart's composed scene does — that is HUMAN_PROOF_REQUIRED.");
  process.exit(0);
}

console.log(`\n${offences.length} OFFENCE(S)`);
for (const o of offences) console.log(`  ${o.law}  ${o.detail}`);
process.exit(1);
