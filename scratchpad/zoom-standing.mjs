import { chromium } from "playwright-core";
const sharp = (await import("sharp")).default;
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2 });
await p.goto("file:///tmp/market-canvas-standing-sample.html");
// Row 1 is the only board where RESOLVED, MEASURED and MISSING sit side by side.
const row = (await p.$$('[data-testid="market-canvas-standing"]'))[1];
const box = await row.boundingBox();
const shot = await p.screenshot({ clip: { x: box.x, y: box.y + 12, width: box.width, height: 20 } });
await sharp(shot).resize(Math.round(box.width * 2), 40, { kernel: "nearest" })
  .png().toFile("/tmp/standing-row1.png");

// And the numeric truth: mean luminance of each mark, left to right.
const marks = await row.$$('[data-testid="market-canvas-standing-mark"]');
for (const [i, m] of marks.entries()) {
  const mb = await m.boundingBox();
  const s = await p.screenshot({ clip: { x: mb.x + 8, y: mb.y + 1, width: 30, height: 4 } });
  const { data } = await sharp(s).greyscale().raw().toBuffer({ resolveWithObject: true });
  const mean = data.reduce((a, v) => a + v, 0) / data.length;
  console.log(`mark ${i}  ${await m.getAttribute("data-standing")}\tmean=${mean.toFixed(1)}`);
}
await b.close();
