#!/usr/bin/env node
/**
 * GENERATE /wm/grain-256.webp — the sanctuary's film grain.
 *
 * ── WHY A SCRIPT AND NOT A CHECKED-IN BLOB ───────────────────────────────────
 *
 * A binary in `public/` that nobody can regenerate is vocabulary without a
 * producer. If someone later asks "why is the grain this strong?" or "is this
 * tile actually seamless?", a blob can only be believed. This script is the
 * owner; the tile is its output; `grainTile.enforcement.test.ts` measures the
 * shipped file and fails if it drifts from what this produces.
 *
 * Run: node scripts/generate-grain-tile.mjs
 *
 * ── WHAT THE CANON SPECIFIES ─────────────────────────────────────────────────
 *
 * 256x256 seamless monochrome noise, ~8 KB (8-12 KB ceiling), rendered at
 * opacity 0.06 with `mix-blend-mode: overlay`. The Canon names SVG
 * `feTurbulence` as the shape being approximated: `fractalNoise`,
 * `baseFrequency` 0.7-0.9, 3-4 octaves, `stitchTiles="stitch"` — and calls that
 * filter a DEV FALLBACK, to be rasterised into a tile for production.
 * Rasterising it is exactly this script's job.
 *
 * `baseFrequency` is cycles per user unit, so 0.8 is a lattice spacing of
 * ~1.25px. At that frequency the base octave is already near pixel scale, which
 * is what makes it read as film grain rather than as clouds. So the octaves
 * here are lattice cell sizes 4, 2 and 1 pixels with amplitude halving — the
 * fractalNoise 1/f falloff, landing on pixel scale at the last octave.
 *
 * ── THE TWO PROPERTIES THAT ARE NOT COSMETIC ─────────────────────────────────
 *
 * SEAMLESS is structural, not a blur applied afterwards. Every octave's lattice
 * size divides 256 and the lattice is indexed modulo its period, so the tile
 * wraps by construction. There is no seam to hide because no pixel near the
 * edge was ever computed differently from one in the middle.
 *
 * MEAN 128 is a truth constraint, not a taste one. Under `mix-blend-mode:
 * overlay`, mid-grey is the identity value: it leaves the pixel beneath it
 * unchanged. A tile whose mean sits above or below 128 silently lifts or
 * crushes the luminance of THE ENTIRE ROOM, and would do it invisibly — it
 * would look like a theme change nobody committed. So the samples are
 * re-centred on exactly 128 after generation, and the test pins it.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SIZE = 256;

/** Octaves as [lattice cell size in px, amplitude]. Each size divides SIZE. */
const OCTAVES = [
  [4, 1.0],
  [2, 0.5],
  [1, 0.25],
];

/**
 * Deterministic so the tile is reproducible. A grain tile that differs every
 * time it is generated could never be verified against a checked-in asset.
 */
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
}

/** Value lattice of `period` x `period`, sampled modulo — hence tileable. */
function lattice(period, rand) {
  const v = new Float64Array(period * period);
  for (let i = 0; i < v.length; i++) v[i] = rand() * 2 - 1;
  return v;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function samples() {
  const rand = makeRandom(0x5eed_1a5e);
  const raw = new Float64Array(SIZE * SIZE);

  for (const [cell, amplitude] of OCTAVES) {
    const period = SIZE / cell;
    const grid = lattice(period, rand);

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (cell === 1) {
          // At pixel scale there is nothing to interpolate; interpolating would
          // only blur the grain back toward the octave above it.
          raw[y * SIZE + x] += amplitude * grid[y * period + x];
          continue;
        }
        const fx = x / cell;
        const fy = y / cell;
        const x0 = Math.floor(fx) % period;
        const y0 = Math.floor(fy) % period;
        // The modulo on x0+1 / y0+1 is the whole seamlessness argument: the
        // right edge interpolates back into column 0.
        const x1 = (x0 + 1) % period;
        const y1 = (y0 + 1) % period;
        const tx = smoothstep(fx - Math.floor(fx));
        const ty = smoothstep(fy - Math.floor(fy));

        const top = grid[y0 * period + x0] * (1 - tx) + grid[y0 * period + x1] * tx;
        const bot = grid[y1 * period + x0] * (1 - tx) + grid[y1 * period + x1] * tx;
        raw[y * SIZE + x] += amplitude * (top * (1 - ty) + bot * ty);
      }
    }
  }

  return raw;
}

/**
 * Grey levels either side of 128 at the extremes.
 *
 * Deliberately narrow. The layer is attenuated to 0.06 opacity, so a tile with
 * blown highlights would clip to white/black speckle under overlay instead of
 * reading as grain — and wide swings are also the expensive part of the file,
 * because high-amplitude pixel-scale detail is exactly what WebP cannot
 * predict.
 */
const SPREAD = 44;

/** `bias` shifts every sample; the calibration loop below uses it. */
function quantise(raw, bias) {
  let mean = 0;
  for (const s of raw) mean += s;
  mean /= raw.length;

  let peak = 0;
  for (const s of raw) peak = Math.max(peak, Math.abs(s - mean));

  const bytes = Buffer.alloc(SIZE * SIZE);
  for (let i = 0; i < raw.length; i++) {
    const centred = ((raw[i] - mean) / peak) * SPREAD;
    bytes[i] = Math.max(0, Math.min(255, Math.round(128 + centred + bias)));
  }
  return bytes;
}

async function decodedMean(webp) {
  const px = await sharp(webp).greyscale().raw().toBuffer();
  let sum = 0;
  for (const b of px) sum += b;
  return sum / px.length;
}

/**
 * ── WHY THE MEAN IS MEASURED AFTER DECODE, NOT BEFORE ENCODE ────────────────
 *
 * The first version of this script centred the source bytes on 128 and stopped
 * there, which felt like enough. It was not. WebP's lossy path is a transform
 * codec: it does not promise to preserve the DC level of a block, and measuring
 * the decoded tile showed the mean landing near 128.32 — a third of a grey
 * level of unrequested lift across every pixel of the room, permanently, from a
 * file nobody would ever think to re-open.
 *
 * That is small, and smallness is the danger: it is exactly the size of defect
 * that survives review forever. The browser composites the DECODED tile, so the
 * decoded mean is the only number that was ever the real one. This loop biases
 * the source until what actually ships is neutral, and the enforcement test
 * measures the shipped file the same way for the same reason.
 */
async function main() {
  const raw = samples();
  const out = resolve(dirname(fileURLToPath(import.meta.url)), "../public/wm/grain-256.webp");

  let bias = 0;
  let encoded = null;
  let mean = 0;

  for (let attempt = 0; attempt < 12; attempt++) {
    const bytes = quantise(raw, bias);
    encoded = await sharp(bytes, { raw: { width: SIZE, height: SIZE, channels: 1 } })
      .webp({ quality: 72, effort: 6 })
      .toBuffer();
    mean = await decodedMean(encoded);
    if (Math.abs(mean - 128) < 0.01) break;
    bias += (128 - mean) * 0.9;
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encoded);
  process.stdout.write(
    `grain-256.webp  ${SIZE}x${SIZE}  ${encoded.length} bytes  ` +
      `decoded mean ${mean.toFixed(4)}  (bias ${bias.toFixed(4)})\n`,
  );
}

main();
