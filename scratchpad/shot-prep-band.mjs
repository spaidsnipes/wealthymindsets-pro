/**
 * POST-EXTRACTION VISUAL RECEIPT — the prep checklist band.
 *
 * The page is written by PrepChecklistBand.sample.render.test.tsx from the REAL
 * component, so what is measured is the band that ships, not a drawing of it.
 *
 * The claim: /command-deck and /journal now render one instrument. Before the
 * extraction the deck drew it 76px wide and the journal 72px.
 */
import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 3 });
await page.goto("file:///tmp/prep-checklist-band-sample.html");
await page.waitForTimeout(200);
await page.screenshot({ path: "/tmp/prep-band-page.png", fullPage: true });

const rooms = await page.$$("[data-room]");
for (const el of rooms) {
  const room = await el.getAttribute("data-room");
  const band = await el.$('[data-testid$="-band"]');
  if (!band) { console.log(`${room.padEnd(15)} NO BAND DRAWN (H1 — nothing observed draws nothing)`); continue; }
  const box = await band.boundingBox();
  const marks = await band.$$('[data-testid$="-mark"]');
  const geo = await Promise.all(marks.map(async (m) => {
    const b = await m.boundingBox();
    return `${b.width.toFixed(2)}x${b.height.toFixed(2)}`;
  }));
  const done = await band.getAttribute("data-done");
  const total = await band.getAttribute("data-total");
  console.log(
    `${room.padEnd(15)} ${done}/${total}  bandWidth=${box.width.toFixed(2)}  marks=${marks.length}  markGeo=[${[...new Set(geo)].join(", ")}]`,
  );
}

// Magnify the first pair so a human can see the two rooms are one instrument.
const first = await page.$("section");
const b = await first.boundingBox();
await page.screenshot({ path: "/tmp/prep-band-zoom.png", clip: { x: b.x, y: b.y, width: Math.min(b.width, 420), height: b.height } });
await browser.close();
console.log("\n  page: file:///tmp/prep-band-page.png\n  zoom: file:///tmp/prep-band-zoom.png");
