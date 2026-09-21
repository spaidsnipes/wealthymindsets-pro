import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 860, height: 1400 },
  deviceScaleFactor: 3,
});
await page.goto("file:///tmp/evidence-debt-sample.html");
await page.screenshot({ path: "/tmp/evidence-page.png", fullPage: true });

// The bands are 4px tall. At page scale the four debts are not comparable, so
// crop each band on its own at high scale — the claim under test is that a
// dark mark is legible before the number is read, and that only shows when the
// band fills the frame.
const bands = await page.$$('[data-testid="decision-why-evidence-band"]');
for (const [i, band] of bands.entries()) {
  const box = await band.boundingBox();
  await page.screenshot({
    path: `/tmp/evidence-band-${i}.png`,
    clip: { x: box.x, y: box.y - 3, width: box.width, height: box.height + 6 },
  });
  const marks = await band.$$('[data-testid="decision-why-evidence-mark"]');
  const standings = await Promise.all(marks.map((m) => m.getAttribute("data-standing")));
  const tally = standings.reduce((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {});
  console.log(
    `band ${i}: resolved=${await band.getAttribute("data-resolved")}/${await band.getAttribute("data-payable")}`,
    `unpaid=${await band.getAttribute("data-unpaid")}`,
    JSON.stringify(tally),
  );
}
await browser.close();
