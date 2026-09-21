import { chromium } from 'playwright-core';
import os from 'node:os';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1160, height: 760 }, deviceScaleFactor: 2 });
await p.goto('file://' + os.tmpdir() + '/decision-rail-sample.html');
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/decision-rail-after.png', fullPage: true });
console.log('shot ok');
await b.close();
