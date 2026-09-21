/**
 * POST-EDIT VISUAL RECEIPT — the dimension standing band.
 *
 * The page is written by MarketCanvasPanel.sample.render.test.tsx from the
 * REAL component, so what is photographed is the panel, not a drawing of it.
 */
import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2 });
await page.goto("file:///tmp/market-canvas-standing-sample.html");
await page.waitForTimeout(250);
await page.screenshot({ path: "/tmp/standing-page.png", fullPage: true });

// The claim is that the FOUR ROWS differ at a glance and are the same LENGTH.
const rows = await page.$$('[data-testid="market-canvas-standing"]');
for (const [i, row] of rows.entries()) {
  const box = await row.boundingBox();
  const marks = await row.$$('[data-testid="market-canvas-standing-mark"]');
  const widths = await Promise.all(marks.map(async (m) => Math.round((await m.boundingBox()).width)));
  const standings = await Promise.all(marks.map((m) => m.getAttribute("data-standing")));
  const tally = standings.reduce((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {});
  console.log(
    `row ${i}: marks=${marks.length} rowWidth=${Math.round(box.width)}`,
    `markWidths=[${[...new Set(widths)].join(",")}]`,
    JSON.stringify(tally),
  );
}
await browser.close();
