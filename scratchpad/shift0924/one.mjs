import { chromium } from "playwright-core";
const [,, route, out] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", e => errs.push(e.message.split("\n")[0]));
await p.goto("http://localhost:3100" + route, { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(10000);
await p.screenshot({ path: out });
console.log(route, "pageerrors:", JSON.stringify(errs.slice(0, 3)), "h1:", await p.evaluate(() => [...document.querySelectorAll("h1,h2")].map(e => e.textContent.trim()).slice(0, 3).join(" | ")));
await b.close();
