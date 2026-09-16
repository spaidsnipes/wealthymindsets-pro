#!/usr/bin/env node
/**
 * Volume Profile PIXEL proof — read back what was actually painted.
 *
 * ── The gate this closes ─────────────────────────────────────────────────────
 *
 * "Live VP render geometry proof" has sat open across several batons with the
 * same one-line reason attached: *canvas has no DOM, so a unit test cannot see
 * it; this needs a different instrument, not another unit test.*
 *
 * That reason is true of vitest and FALSE of a real browser. A browser canvas
 * has `getImageData()`, which returns the actual painted bytes. The instrument
 * was never missing — it was never picked up.
 *
 * ── What is already proven elsewhere, and why that was not enough ────────────
 *
 * `src/lib/vpEngine.ts` owns WHERE THE VOLUME GOES and is tested.
 * `src/lib/vpDrawGeometry.ts` owns WHERE THE PIXELS GO and is tested.
 * `vpRenderGeometry.test.ts` holds MainChart to delegating to both.
 *
 * All three test ARITHMETIC. Every one of them would stay green if the numbers
 * were right and the picture were wrong, because nothing in the repo has ever
 * looked at a painted pixel. The draw module's own header makes three claims
 * in prose, and names them as claims about honesty:
 *
 *   • "snapping both endpoints makes adjacent populated rows share the exact
 *      boundary pixel = pixel-flush, no hairline gaps"
 *   • "bar length is DIRECTLY proportional to this level's real
 *      volume-at-price ... no aesthetic baseline and no power curve"
 *   • "the histogram never draws on top of the price labels"
 *
 * Each is a statement about pixels. Each was verified by reading the source and
 * agreeing with it. This file measures them instead.
 *
 * ── SCOPE, stated so a green run is not over-read ────────────────────────────
 *
 * This paints a profile using ONLY the shipped owners in vpDrawGeometry.ts, on
 * a real canvas, in a real browser, and reads the bytes back. It proves the
 * geometry owners produce an honest picture.
 *
 * It does NOT prove MainChart's composed scene is honest — `drawWMVP` also
 * chooses colours, draws labels and POC/VAH/VAL lines, and composites over live
 * price action. That remains HUMAN_PROOF_REQUIRED. What this removes is the
 * much larger blind spot beneath it: until now NOTHING in this repo had ever
 * observed a single painted profile pixel.
 *
 * ── The instrument proves itself ─────────────────────────────────────────────
 *
 * A pixel gate that silently paints nothing reports "no offences" forever and
 * is indistinguishable from a clean bill of health — the vacuity failure this
 * codebase has already shipped for real. So:
 *
 *   1. A POSITIVE CONTROL law fails unless a substantial number of pixels were
 *      actually painted in the colours this script chose.
 *   2. `WM_VP_REVIVE=<mode>` swaps a DEFECT into the paint path so you can see
 *      which law fires. A law that cannot be made to fail is not a measurement.
 *      Modes: ROW_HEIGHT | BAR_CURVE | SPLIT_ROUND | FITS_LIE | AXIS_BLEED
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/prove-vp-pixels.mjs
 *   WM_VP_REVIVE=BAR_CURVE node scripts/prove-vp-pixels.mjs   # expect RED
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

const REVIVE = process.env.WM_VP_REVIVE ?? "";
const REVIVE_MODES = ["ROW_HEIGHT", "BAR_CURVE", "SPLIT_ROUND", "FITS_LIE", "AXIS_BLEED"];
if (REVIVE && !REVIVE_MODES.includes(REVIVE)) {
  console.error(`unknown WM_VP_REVIVE=${REVIVE}; expected one of ${REVIVE_MODES.join(" | ")}`);
  process.exit(2);
}

/* ── The scene ──────────────────────────────────────────────────────────────
 *
 * Deliberately shaped to put every law under load:
 *   - twelve CONTIGUOUS buckets, so the hairline law has eleven boundaries;
 *   - volumes spanning three orders of magnitude, so a power curve is visible
 *     as a ratio error rather than hiding inside rounding;
 *   - a bucket at 0.5% of peak, which exists only because of the 1px floor;
 *   - up-ratios at 0, 1 and several awkward thirds, so the split remainder is
 *     exercised where independent rounding would disagree.
 *
 * TWO OF THESE NUMBERS ARE LOAD-BEARING AND WERE CHOSEN BY MEASUREMENT.
 *
 * `BOT_Y` is 517, not 520. At 520 the band height is 480/12 = exactly 40, every
 * bucket edge lands on an integer, and "snap both endpoints then subtract"
 * agrees with "round the height independently" on every single row. The
 * ROW_HEIGHT revive ran GREEN against that scene — the defect was real and the
 * fixture could not express it. 477/12 = 39.75 puts the edges off the pixel
 * grid, which is the only condition under which the two formulas disagree.
 *
 * Bucket 1's up-ratio is 0.5 against a volume that earns an ODD bar (69px).
 * Rounding both halves of an odd bar at exactly one half sends both to 35 and
 * the bar comes out 70px — one pixel of volume that was never traded. At an
 * even bar width the two formulas agree, and the SPLIT_ROUND revive ran GREEN
 * for that reason.
 */
const CANVAS_W = 900;
const CANVAS_H = 600;
const PRICE_SCALE_W = 70;
const TOP_Y = 40;
const BOT_Y = 517;

const BUCKETS = [
  { volume: 1000, upRatio: 0.5 },
  { volume: 640, upRatio: 0.5 },
  { volume: 5, upRatio: 0 },
  { volume: 880, upRatio: 1 },
  { volume: 120, upRatio: 0.666667 },
  { volume: 333, upRatio: 0.333333 },
  { volume: 47, upRatio: 0.8 },
  { volume: 700, upRatio: 0.5 },
  { volume: 12, upRatio: 0.25 },
  { volume: 455, upRatio: 0.75 },
  { volume: 90, upRatio: 0.4 },
  { volume: 260, upRatio: 0.6 },
];

const UP_RGB = [0, 200, 120];
const DOWN_RGB = [220, 60, 60];

/* ── Bundle the SHIPPED owners for the browser ─────────────────────────────
 *
 * vpDrawGeometry.ts is TypeScript and the browser cannot import it. esbuild is
 * already a direct dependency. The alternative — re-typing the four functions
 * into this file — is the exact mirror-testing mistake deltaBubbleBinning.test
 * was rewritten to stop: a copy would drift and then this gate would measure a
 * picture nobody ships.
 */
const dir = mkdtempSync(join(tmpdir(), "vp-pixels-"));
const entry = join(dir, "entry.ts");
const bundle = join(dir, "vpgeom.js");
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(ROOT, "src/lib/vpDrawGeometry"))};\n`,
);
execFileSync(join(ROOT, "node_modules/.bin/esbuild"), [
  entry, "--bundle", "--platform=browser", "--format=iife",
  "--global-name=VPGEOM", `--outfile=${bundle}`,
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
  ({ CANVAS_W, CANVAS_H, PRICE_SCALE_W, TOP_Y, BOT_Y, BUCKETS, UP_RGB, DOWN_RGB, REVIVE }) => {
    const G = window.VPGEOM;

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const maxVolume = Math.max(...BUCKETS.map((b) => b.volume));
    const bandH = (BOT_Y - TOP_Y) / BUCKETS.length;

    // ── ONE column, drawn honestly ──────────────────────────────────────────
    const layout = G.vpColumnLayout(CANVAS_W, PRICE_SCALE_W, 0, 1);
    const rows = [];
    if (layout.fits) {
      for (let i = 0; i < BUCKETS.length; i++) {
        const b = BUCKETS[i];
        const yTop = TOP_Y + i * bandH;
        const yBottom = TOP_Y + (i + 1) * bandH;

        let rect = G.vpRowRect(yTop, yBottom, 60);
        if (REVIVE === "ROW_HEIGHT") {
          // THE DEFECT: round the HEIGHT independently instead of snapping both
          // endpoints. Drifts +/-1px and leaves hairline gaps between bars.
          const y = Math.round(yTop);
          const height = Math.max(2, Math.round(yBottom - yTop));
          const gap = height >= 3 ? 1 : 0;
          rect = { y, height, drawHeight: Math.max(1, height - gap) };
        }
        if (rect === null) continue;

        let barW = G.vpBarWidth(b.volume, maxVolume, layout.width);
        if (REVIVE === "BAR_CURVE") {
          // THE DEFECT: an aesthetic power curve. Every above-median level
          // saturates toward full width — a picture of the shaping function.
          barW = Math.max(1, Math.round(layout.width * Math.pow(b.volume / maxVolume, 0.5)));
        }
        if (barW <= 0) continue;

        let split = G.vpBarSplit(barW, b.upRatio);
        if (REVIVE === "SPLIT_ROUND") {
          // THE DEFECT: round the down half too, instead of taking the
          // remainder. The two pieces can sum to barW +/- 1.
          split = {
            upWidth: Math.round(barW * b.upRatio),
            downWidth: Math.round(barW * (1 - b.upRatio)),
          };
        }

        let left = layout.right - barW;
        if (REVIVE === "AXIS_BLEED") {
          // THE DEFECT: forget the axis margin and let the bar start at the
          // canvas edge, painting over the price labels.
          left = CANVAS_W - barW;
        }

        ctx.fillStyle = `rgb(${UP_RGB.join(",")})`;
        ctx.fillRect(left, rect.y, split.upWidth, rect.drawHeight);
        ctx.fillStyle = `rgb(${DOWN_RGB.join(",")})`;
        ctx.fillRect(left + split.upWidth, rect.y, split.downWidth, rect.drawHeight);

        rows.push({ index: i, volume: b.volume, upRatio: b.upRatio, ...rect, barW });
      }
    }

    /* ── Does `fits` TELL THE TRUTH about visibility? ─────────────────────────
     *
     * The first draft of this probe asked the wrong question. It painted the
     * unfitting column and failed if any pixels appeared — and it ran GREEN,
     * because painting at negative x produces exactly nothing. That is not a
     * clean bill of health, it is the DEFECT ITSELF: "the profile was requested,
     * the work was done, and nothing appeared, with no indication that a column
     * had been dropped."
     *
     * So the law is re-founded as a biconditional, measured both ways: a column
     * reported as FITTING must paint visible pixels, and a column reported as
     * NOT FITTING must paint none. `fits` is then a TRUE PREDICTION of what the
     * trader will see, rather than an arithmetic opinion nobody checked.
     *
     * The narrow case is 90px total with a 70px price axis — a 20px usable span.
     * Column 1 wants 2px of width sitting 20px left of column 0, so its right
     * edge lands at x=-2. Solved from vpColumnLayout, not chosen by taste: for
     * two columns the edge goes negative below a 22.5px usable span.
     */
    const probe = (w, colIndex, nCols) => {
      let lay = G.vpColumnLayout(w, PRICE_SCALE_W, colIndex, nCols);
      if (REVIVE === "FITS_LIE") {
        // THE DEFECT: the inline code had no `fits` answer at all. Every column
        // was assumed drawable, so an off-canvas one was painted into the void.
        lay = { ...lay, fits: true };
      }
      const c = document.createElement("canvas");
      c.width = Math.max(1, w);
      c.height = 120;
      const cx = c.getContext("2d", { willReadFrequently: true });
      cx.fillStyle = "#000";
      cx.fillRect(0, 0, c.width, 120);
      if (lay.fits) {
        cx.fillStyle = `rgb(${UP_RGB.join(",")})`;
        cx.fillRect(lay.right - lay.width, 10, lay.width, 100);
      }
      const px = cx.getImageData(0, 0, c.width, 120).data;
      let painted = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] || px[i + 1] || px[i + 2]) painted++;
      }
      return { width: w, colIndex, nCols, fits: lay.fits, painted };
    };

    // One that must NOT fit, and — as the other half of the biconditional, so a
    // module that answered `false` to everything could not pass — one that must.
    const fitsProbes = [probe(90, 1, 2), probe(CANVAS_W, 1, 2)];

    // ── Read the bytes back ─────────────────────────────────────────────────
    const img = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
    const at = (x, y) => {
      const o = (y * CANVAS_W + x) * 4;
      return [img[o], img[o + 1], img[o + 2]];
    };
    const painted = (x, y) => {
      const [r, g, b] = at(x, y);
      return r !== 0 || g !== 0 || b !== 0;
    };

    let totalPainted = 0;
    for (let i = 0; i < img.length; i += 4) {
      if (img[i] || img[i + 1] || img[i + 2]) totalPainted++;
    }

    // Per-row: measure the painted run on the row's own middle scanline.
    const observed = rows.map((r) => {
      const y = r.y + Math.floor(r.drawHeight / 2);
      let up = 0, down = 0, total = 0, leftmost = -1, rightmost = -1;
      for (let x = 0; x < CANVAS_W; x++) {
        const [pr, pg, pb] = at(x, y);
        if (pr === 0 && pg === 0 && pb === 0) continue;
        total++;
        if (leftmost < 0) leftmost = x;
        rightmost = x;
        if (pr === UP_RGB[0] && pg === UP_RGB[1] && pb === UP_RGB[2]) up++;
        else if (pr === DOWN_RGB[0] && pg === DOWN_RGB[1] && pb === DOWN_RGB[2]) down++;
      }
      return { ...r, y_scan: y, paintedWidth: total, up, down, leftmost, rightmost };
    });

    // Hairline scan: every populated row is painted at x = right-1, because
    // bars extend LEFT from the column's right edge and every bar is >= 1px.
    // So one vertical scan there sees all twelve rows and the gaps between.
    const scanX = layout.fits ? layout.right - 1 : 0;
    const runs = [];
    let cur = null;
    for (let y = 0; y < CANVAS_H; y++) {
      const on = layout.fits ? painted(scanX, y) : false;
      if (on && cur === null) cur = { start: y, end: y };
      else if (on) cur.end = y;
      else if (cur !== null) { runs.push(cur); cur = null; }
    }
    if (cur !== null) runs.push(cur);
    const gaps = [];
    for (let i = 1; i < runs.length; i++) gaps.push(runs[i].start - runs[i - 1].end - 1);

    // Anything painted inside the price-axis lane at all.
    let axisPixels = 0;
    for (let x = CANVAS_W - PRICE_SCALE_W; x < CANVAS_W; x++) {
      for (let y = 0; y < CANVAS_H; y++) if (painted(x, y)) axisPixels++;
    }

    return {
      engineLayout: layout,
      maxVolume,
      totalPainted,
      rows: observed,
      runs: runs.length,
      gaps,
      axisPixels,
      fitsProbes,
      scanX,
    };
  },
  { CANVAS_W, CANVAS_H, PRICE_SCALE_W, TOP_Y, BOT_Y, BUCKETS, UP_RGB, DOWN_RGB, REVIVE },
);

await browser.close();

/* ── The laws ─────────────────────────────────────────────────────────────── */

const offences = [];
const fail = (law, detail) => offences.push({ law, detail });

// 0. POSITIVE CONTROL. Without this every "nothing is painted where it should
//    not be" law below is vacuously true, and a blank canvas reads as perfect.
if (measured.totalPainted < 2000) {
  fail("VACUOUS", `only ${measured.totalPainted} pixels painted — the canvas is effectively blank, so no law below means anything`);
}
if (measured.rows.length !== BUCKETS.length) {
  fail("VACUOUS", `painted ${measured.rows.length} of ${BUCKETS.length} buckets — the scene did not build`);
}

// 1. NO_HAIRLINE. Adjacent populated rows share the boundary pixel; the only
//    separation is the deliberate 1px gap. A drifting height shows up here as a
//    2px void between contiguous rows.
if (measured.runs !== BUCKETS.length) {
  fail("NO_HAIRLINE", `expected ${BUCKETS.length} painted runs down x=${measured.scanX}, observed ${measured.runs} — rows merged or split`);
}
for (let i = 0; i < measured.gaps.length; i++) {
  if (measured.gaps[i] > 1) {
    fail("NO_HAIRLINE", `a ${measured.gaps[i]}px unpainted void between contiguous rows ${i} and ${i + 1}; the separation gap is 1px, anything more is drift`);
  }
}

// 2. PROPORTIONAL. Painted width is directly proportional to volume/peak. A
//    power curve or an aesthetic baseline shows up as a ratio error, and it is
//    measured against the PAINTED bytes, not against vpBarWidth's return value.
const peak = measured.rows.reduce((m, r) => Math.max(m, r.paintedWidth), 0);
for (const r of measured.rows) {
  const expected = Math.max(1, Math.round(measured.engineLayout.width * (r.volume / measured.maxVolume)));
  if (Math.abs(r.paintedWidth - expected) > 1) {
    fail("PROPORTIONAL", `bucket ${r.index} holds ${r.volume}/${measured.maxVolume} of peak volume, so it must paint ~${expected}px of ${measured.engineLayout.width}px; it painted ${r.paintedWidth}px`);
  }
}
// The column width is FRACTIONAL — 0.13 of a usable span is rarely an integer
// — so "full width" is that value rounded, which is what vpBarWidth yields at
// ratio 1. Bounded on both sides: a peak below the floor means the POC is being
// shrunk, a peak above the ceiling means a bar is escaping its own column.
const widthFloor = Math.floor(measured.engineLayout.width);
const widthCeil = Math.ceil(measured.engineLayout.width);
if (peak > widthCeil) {
  fail("PROPORTIONAL", `a bar painted ${peak}px, escaping its own ${measured.engineLayout.width}px column`);
}
if (peak < widthFloor) {
  fail("PROPORTIONAL", `the POC painted only ${peak}px of a ${measured.engineLayout.width}px column — the peak must reach full width or the whole scale is compressed`);
}
if (measured.rows.filter((r) => r.paintedWidth >= widthFloor).length !== 1) {
  fail("PROPORTIONAL", `${measured.rows.filter((r) => r.paintedWidth >= widthFloor).length} buckets reached full width — only the POC may. This is the saturation signature of a power curve.`);
}

// 3. SPLIT_EXACT. The two halves must sum to the bar the VOLUME EARNED — not
//    to whatever got painted.
//
//    The first draft compared `up + down` against the painted total, and the
//    SPLIT_ROUND revive ran GREEN against it, correctly. If the down half is
//    rounded a pixel too wide, the painted total is a pixel too wide with it,
//    and the two agree perfectly while the bar lies about its own volume. A law
//    stated against the same quantity the defect corrupts cannot see the defect.
for (const r of measured.rows) {
  const earned = Math.max(1, Math.round(measured.engineLayout.width * (r.volume / measured.maxVolume)));
  if (r.up + r.down !== earned) {
    fail("SPLIT_EXACT", `bucket ${r.index} earned a ${earned}px bar from its volume but painted ${r.up}px up + ${r.down}px down = ${r.up + r.down}px; the down half must be the REMAINDER, never a second rounding`);
  }
}

// 4. AXIS_CLEAR. "The histogram never draws on top of the price labels."
if (measured.axisPixels > 0) {
  fail("AXIS_CLEAR", `${measured.axisPixels} profile pixels painted inside the ${PRICE_SCALE_W}px price-axis lane — the histogram is over the numbers`);
}

// 5. FITS_IS_TRUE. `fits` must be a true prediction of visibility, measured in
//    both directions: fitting => pixels appear, not fitting => none do.
for (const pr of measured.fitsProbes) {
  if (pr.fits && pr.painted === 0) {
    fail("FITS_IS_TRUE", `column ${pr.colIndex}/${pr.nCols} at ${pr.width}px was reported to FIT and painted NOTHING — the profile was requested, the work was done, and the trader sees no indication a column was dropped`);
  }
  if (!pr.fits && pr.painted > 0) {
    fail("FITS_IS_TRUE", `column ${pr.colIndex}/${pr.nCols} at ${pr.width}px was refused as not fitting, yet painted ${pr.painted} visible pixels — the module is declining to draw something the trader could have seen`);
  }
}
if (!measured.fitsProbes.some((pr) => !pr.fits) || !measured.fitsProbes.some((pr) => pr.fits)) {
  fail("FITS_IS_TRUE", `the probes no longer exercise both answers (${measured.fitsProbes.map((pr) => `${pr.width}px:${pr.fits}`).join(", ")}) — a module that answered the same thing to everything would pass`);
}

/* ── Report ───────────────────────────────────────────────────────────────── */

console.log(`\nVP PIXEL PROOF — painted and read back through ${engine}`);
if (REVIVE) console.log(`REVIVE MODE: ${REVIVE} — a RED run here is the expected, correct result.`);
console.log(`  column       ${measured.engineLayout.width}px wide, right edge x=${measured.engineLayout.right}, fits=${measured.engineLayout.fits}`);
console.log(`  painted      ${measured.totalPainted} px across ${measured.rows.length} buckets`);
console.log(`  runs / gaps  ${measured.runs} runs down x=${measured.scanX}, gaps ${JSON.stringify(measured.gaps)}`);
console.log(`  axis lane    ${measured.axisPixels} px (must be 0)`);
console.log(`  fits probes  ${measured.fitsProbes.map((pr) => `${pr.width}px fits=${pr.fits} painted=${pr.painted}`).join(" | ")}`);
console.log("");
for (const r of measured.rows) {
  console.log(`  bucket ${String(r.index).padStart(2)}  vol ${String(r.volume).padStart(5)}  painted ${String(r.paintedWidth).padStart(3)}px  up ${String(r.up).padStart(3)}  down ${String(r.down).padStart(3)}  y ${r.y}+${r.drawHeight}`);
}

if (offences.length === 0) {
  console.log(`\nCLEAN — ${5} pixel laws hold against real painted bytes.`);
  console.log("SCOPE: this proves the geometry owners paint an honest picture. It does");
  console.log("NOT prove MainChart's composed scene does — that is HUMAN_PROOF_REQUIRED.");
  process.exit(0);
}

console.log(`\n${offences.length} OFFENCE(S)`);
for (const o of offences) console.log(`  ${o.law}  ${o.detail}`);
process.exit(1);
