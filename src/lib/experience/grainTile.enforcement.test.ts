import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * THE GRAIN TILE — measured, not admired.
 *
 * `/wm/grain-256.webp` is the sanctuary's film grain. The Canon locks it to a
 * 256x256 seamless monochrome tile under 12 KB, composited at 0.06 opacity with
 * `mix-blend-mode: overlay`. `scripts/generate-grain-tile.mjs` produces it.
 *
 * A binary asset is the easiest thing in a repo to ship wrong and never notice:
 * nothing about a `.webp` announces its dimensions, its weight, or whether it
 * actually tiles. So the properties the room depends on are asserted against
 * THE DECODED PIXELS OF THE SHIPPED FILE, not against the script that made it.
 * Testing the generator would only prove the generator agrees with itself; the
 * browser composites the file.
 */

/**
 * `sharp` ships real typings, but its package.json "exports" map does not
 * expose them under this project's module resolution, so a plain
 * `import sharp from "sharp"` is an implicit `any` and tsc rejects it.
 *
 * Loaded through `createRequire` with the two calls this file makes declared
 * explicitly. That keeps the `any` contained to one line here instead of
 * shadowing the package's real types with an ambient `.d.ts`, which would
 * silently degrade every other file that ever imports sharp.
 */
interface SharpImage {
  metadata(): Promise<{ format?: string; width?: number; height?: number }>;
  greyscale(): { raw(): { toBuffer(): Promise<Buffer> } };
}
const sharp = createRequire(__filename)("sharp") as (input: Buffer) => SharpImage;

const TILE = resolve(__dirname, "../../../public/wm/grain-256.webp");
const SIZE = 256;

const file = readFileSync(TILE);

async function pixels(): Promise<Buffer> {
  return sharp(file).greyscale().raw().toBuffer();
}

describe("grain tile — the shipped asset, decoded", () => {
  it("is 256x256, which is what the CSS background-size promises", async () => {
    const meta = await sharp(file).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([SIZE, SIZE]);
  });

  it("stays under the weight ceiling", () => {
    // The Canon's window is ~8 KB, ceiling 12 KB. This layer is fixed to the
    // viewport on every route, so it is on the critical path of every first
    // paint in the product.
    expect(file.length).toBeGreaterThan(2_000); // a tiny file means it stopped being noise
    expect(file.length).toBeLessThanOrEqual(12_288);
  });

  /**
   * THE ONE THAT IS NOT COSMETIC.
   *
   * Under `mix-blend-mode: overlay`, mid-grey is the identity value — it leaves
   * the pixel beneath unchanged. A tile whose mean sits off 128 lifts or
   * crushes the luminance of THE ENTIRE ROOM, uniformly and invisibly, and it
   * would read as a theme change nobody committed.
   *
   * This is measured after decode on purpose. Centring the source bytes is not
   * sufficient: WebP's lossy path does not preserve a block's DC level, and the
   * first calibrated build of this tile came back at 128.32 despite perfectly
   * centred input. The decoded value is the only one the browser ever sees.
   */
  it("is neutral under overlay — decoded mean is 128", async () => {
    const px = await pixels();
    let sum = 0;
    for (const b of px) sum += b;
    const mean = sum / px.length;
    expect(
      Math.abs(mean - 128),
      `decoded mean is ${mean.toFixed(4)}. Overlay treats 128 as identity, so ` +
        `any drift here is a uniform luminance shift applied to every route.`,
    ).toBeLessThan(0.05);
  });

  it("stays inside the amplitude the blend expects", async () => {
    const px = await pixels();
    let min = 255;
    let max = 0;
    for (const b of px) {
      if (b < min) min = b;
      if (b > max) max = b;
    }
    // Neither clipped to the rails (which would speckle rather than grain) nor
    // so flat that the layer is doing nothing.
    expect(min).toBeGreaterThan(8);
    expect(max).toBeLessThan(247);
    expect(max - min).toBeGreaterThan(24);
  });

  /**
   * SEAMLESS, proven by arithmetic rather than by eye.
   *
   * The tile repeats, so column 255 sits against column 0 and row 255 against
   * row 0 on screen. If the generator's lattice did not wrap, those junctions
   * would be discontinuous while interior neighbours were smooth, and the
   * result is the classic visible grid across the viewport.
   *
   * So: compare the mean absolute difference across the wrap junction to the
   * mean across interior neighbours. On a seamless tile the junction is just
   * another neighbour and the two numbers agree. A hard seam would make the
   * junction dramatically larger — the ratio, not an absolute threshold, is
   * what makes this robust to the tile's amplitude changing.
   *
   * ── THE THRESHOLD WAS FALSIFIED, NOT GUESSED ─────────────────────────────
   *
   * The dominant octave of this tile is pixel-scale noise, where neighbouring
   * columns are uncorrelated by design. That raises a fair objection: if any
   * two columns differ by about the same amount, does this assertion actually
   * distinguish a wrapping tile from a non-wrapping one, or does it pass for
   * every possible input? An assertion that cannot fail is worse than none.
   *
   * So it was run against deliberately broken tiles. Measured ratios:
   *
   *   shipped tile ............................ 1.18
   *   shipped tile, last column inverted ...... 3.32
   *   non-wrapping horizontal gradient ...... 255.0
   *
   * Real seams land multiples away, so 1.5 separates them with room to spare.
   * The shipped tile is not at exactly 1.00 because WebP encodes in macroblocks
   * and has no notion of wrapping, so the edge blocks are quantised slightly
   * differently from interior ones — a property of the codec, not of a seam.
   */
  it("wraps in both axes — no seam at the junction", async () => {
    const px = await pixels();
    const at = (x: number, y: number) => px[y * SIZE + x];

    const meanAbs = (f: (i: number) => number, n: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f(i);
      return s / n;
    };

    const interiorX = meanAbs(
      () => {
        const x = Math.floor(Math.random() * (SIZE - 1));
        const y = Math.floor(Math.random() * SIZE);
        return Math.abs(at(x, y) - at(x + 1, y));
      },
      4_000,
    );
    const junctionX = meanAbs(i => Math.abs(at(SIZE - 1, i) - at(0, i)), SIZE);

    const interiorY = meanAbs(
      () => {
        const x = Math.floor(Math.random() * SIZE);
        const y = Math.floor(Math.random() * (SIZE - 1));
        return Math.abs(at(x, y) - at(x, y + 1));
      },
      4_000,
    );
    const junctionY = meanAbs(i => Math.abs(at(i, SIZE - 1) - at(i, 0)), SIZE);

    expect(
      junctionX / interiorX,
      `the right/left junction is ${junctionX.toFixed(2)} against an interior ` +
        `neighbour mean of ${interiorX.toFixed(2)}. The tile does not wrap ` +
        `horizontally, so it will draw a visible grid across the viewport.`,
    ).toBeLessThan(1.5);
    expect(
      junctionY / interiorY,
      `the top/bottom junction is ${junctionY.toFixed(2)} against an interior ` +
        `neighbour mean of ${interiorY.toFixed(2)}. The tile does not wrap ` +
        `vertically.`,
    ).toBeLessThan(1.5);
  });

  /**
   * THE REVIVE-ATTEMPT, and it found a real hole.
   *
   * Every assertion above measures the FILE. All six of them would still pass
   * if someone deleted the `background-image` from the shell tomorrow: the tile
   * would sit in `public/` being perfectly seamless and perfectly neutral, and
   * reaching nobody. That is the same failure `surfaceElementReach` exists to
   * catch, one layer down — an asset that exists is not an asset that ships.
   *
   * Measured, not assumed: the full suite was green BEFORE this test existed,
   * while the shell was still painting the old crosshatch. Nothing in 7,900
   * assertions had an opinion about what the room's grain actually was.
   */
  it("is the grain the shell actually paints", () => {
    const shell = readFileSync(
      resolve(__dirname, "../../components/experience/WMExperienceShell.tsx"),
      "utf8",
    );
    expect(
      shell,
      "the shell stopped referencing the tile. The asset is still in public/ " +
        "and every other assertion here still passes, which is exactly why " +
        "this one has to exist.",
    ).toContain("/wm/grain-256.webp");

    // The crosshatch must not come back. It was two repeating-linear-gradients
    // at 3px, close enough to HiDPI pixel pitch to moiré against the candle
    // canvas — motion with no owner, which the sanctuary's own rules forbid.
    const grainBlock = shell.slice(
      shell.indexOf(".wm-sanctuary::after"),
      shell.indexOf(".wm-sanctuary::after") + 600,
    );
    expect(grainBlock).not.toMatch(/repeating-linear-gradient/);
  });

  it("has a producer — the tile is regenerable, not a mystery blob", () => {
    const script = readFileSync(
      resolve(__dirname, "../../../scripts/generate-grain-tile.mjs"),
      "utf8",
    );
    expect(script).toContain("public/wm/grain-256.webp");
    // Determinism is what makes the asset auditable at all: a tile that came
    // out different on every run could never be checked against this file.
    expect(script).toMatch(/seed|makeRandom/);
  });
});
