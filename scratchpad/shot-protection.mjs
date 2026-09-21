import { chromium } from 'playwright-core';
import os from 'node:os';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
await p.goto('file://' + os.tmpdir() + '/protection-line-sample.html');
await p.waitForTimeout(300);
await p.screenshot({ path: '/tmp/protection-line-after.png', fullPage: true });
console.log('shot ok');
await b.close();
