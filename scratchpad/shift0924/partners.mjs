import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/partnerships", { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(12000);
console.log((await p.locator("main, body").first().innerText()).replace(/\s+/g, " ").slice(0, 300));
await p.screenshot({ path: "scratchpad/shift0924/partnerships.png" });
await b.close();
