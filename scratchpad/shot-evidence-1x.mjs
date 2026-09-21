import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 820, height: 1200 } });
await p.goto("file:///tmp/evidence-debt-sample.html");
await p.screenshot({ path: "/tmp/evidence-1x.png", fullPage: true });
await b.close();
