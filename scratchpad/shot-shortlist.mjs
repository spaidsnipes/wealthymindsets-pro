import { chromium } from 'playwright-core';
import { tmpdir } from 'node:os';
import path from 'node:path';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 420 }, deviceScaleFactor: 8 });
await page.goto('file://' + path.join(tmpdir(), 'expression-shortlist-sample.html'));
const bars = await page.$$('[data-testid="expression-quote-bar"]');
for (let i = 0; i < bars.length; i++) {
  const b = await bars[i].boundingBox();
  await page.screenshot({ path: `/tmp/bar-${i}.png`, clip: { x: b.x, y: b.y - 2, width: b.width, height: b.height + 4 } });
  console.log(i, JSON.stringify(b));
}
await browser.close();
