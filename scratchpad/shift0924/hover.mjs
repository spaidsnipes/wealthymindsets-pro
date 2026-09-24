import { chromium } from "playwright-core";
import { fixtureDays } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureDays(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(25000);
const readTip = async () => p.evaluate(() => {
  const els = [...document.querySelectorAll("body *")].filter(e =>
    e.tagName !== "STYLE" && e.tagName !== "SCRIPT" && /Bar under your cursor/.test(e.innerText || ""));
  els.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
  const box = els.find(e => /5M BAR/.test(e.innerText || "")) || els[0];
  return (box?.innerText || "").replace(/\s+/g, " ").slice(0, 110);
});
for (const x of [400, 600, 800]) {
  await p.mouse.move(x, 500, { steps: 5 }); await p.waitForTimeout(700);
  console.log(x, JSON.stringify(await readTip()));
}
await b.close();
