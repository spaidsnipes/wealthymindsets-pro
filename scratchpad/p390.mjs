import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto("http://localhost:3000/charts", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(11000);
console.log(JSON.stringify(await page.evaluate(() => {
  const tv = document.querySelector(".tv-lightweight-charts");
  const cr = tv?.getBoundingClientRect();
  const id = document.querySelector("[data-chart-identity]");
  const ir = id?.getBoundingClientRect();
  return { vh: innerHeight, candlesTop: cr ? Math.round(cr.top) : null,
    pct: cr ? +((cr.top/innerHeight)*100).toFixed(1) : null,
    toolbar: !!document.querySelector(".wm-chart-toolbar"),
    identity: ir ? { x: Math.round(ir.x), y: Math.round(ir.y), w: Math.round(ir.width), text: id.textContent.trim() } : null,
    assetClassVisible: !!document.querySelector(".wm-chart-room-header--market-home") };
})), null, 2);
await page.screenshot({ path: "scratchpad/d702-after-390.png" });
await browser.close();
