/**
 * POST-EXTRACTION VISUAL RECEIPT — the dimension standing band.
 *
 * The page is written by DimensionStandingBand.sample.render.test.tsx from the
 * REAL component, so what is measured is the band that ships, not a drawing of
 * it.
 *
 * Two claims, and only a measurement settles either:
 *
 *   1. THE TWO SCALES DRAW THE SAME BOARD. The pill used to SPELL this reading
 *      and once said "7 unresolved" beside a panel saying "RESOLVED (4)" —
 *      eleven marks on a board of eight. Mark COUNT and mark ORDER must match
 *      column for column, row for row.
 *
 *   2. THE PILL BAND FITS ITS CHIP. 3px of band in a ~10px row. A component
 *      test can assert `height:3px`; only a browser can say whether the chip
 *      grew to accommodate it, and whether the marks are still distinguishable
 *      at that size.
 */
import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 980, height: 1400 }, deviceScaleFactor: 3 });
await page.goto("file:///tmp/dimension-standing-band-sample.html");
await page.waitForTimeout(200);
await page.screenshot({ path: "/tmp/standing-band-page.png", fullPage: true });

const read = async (el) => {
  const marks = await el.$$("[data-standing]");
  if (marks.length === 0) return null;
  const rows = await Promise.all(
    marks.map(async (m) => ({
      standing: await m.getAttribute("data-standing"),
      box: await m.boundingBox(),
    })),
  );
  return {
    // MEASURED and MISSING both begin with M, and a receipt that cannot tell
    // the half-lit bucket from the dark one is blind to the exact confusion
    // that put eleven marks on a board of eight.
    order: rows.map((r) => ({ RESOLVED: "R", MEASURED: "~", MISSING: "." })[r.standing]).join(""),
    count: rows.length,
    geo: [...new Set(rows.map((r) => `${r.box.width.toFixed(2)}x${r.box.height.toFixed(2)}`))],
  };
};

const sections = await page.$$("section");
let disagreements = 0;
for (const s of sections) {
  const note = (await (await s.$("div")).innerText()).trim();
  const panel = await read(await s.$('[data-surface="panel"]'));
  const pill = await read(await s.$('[data-surface="pill"]'));
  const chip = await (await s.$('[data-surface="pill"] span')).boundingBox();

  if (!panel && !pill) {
    console.log(`\n${note}\n  BOTH DRAW NOTHING (H1 — the house has not looked)`);
    continue;
  }
  const agree = panel && pill && panel.order === pill.order;
  if (!agree) disagreements += 1;
  console.log(`\n${note}`);
  console.log(`  panel  ${panel.order}  n=${panel.count}  mark=[${panel.geo.join(", ")}]`);
  console.log(`  pill   ${pill.order}  n=${pill.count}  mark=[${pill.geo.join(", ")}]`);
  console.log(
    `  ${agree ? "AGREE" : "*** DISAGREE ***"}   chipHeight=${chip.height.toFixed(2)}px`,
  );
}

console.log(
  `\n  ${disagreements === 0 ? "ALL ROWS AGREE — one board, two sizes." : `${disagreements} ROW(S) DISAGREE — the extraction bought nothing.`}`,
);

// Magnify the disputed reading so a human can see the pill band is legible.
const disputed = sections[1];
const b = await disputed.boundingBox();
await page.screenshot({
  path: "/tmp/standing-band-zoom.png",
  clip: { x: b.x, y: b.y, width: Math.min(b.width, 620), height: b.height },
});
await browser.close();
console.log("\n  page: file:///tmp/standing-band-page.png\n  zoom: file:///tmp/standing-band-zoom.png");
