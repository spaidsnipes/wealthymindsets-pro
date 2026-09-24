// SHOW RAW: overlay pixels before → raw → restored. FIXTURE bars.
import { chromium } from "playwright-core";
import { fixtureExhaustNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candles: fixtureExhaustNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/charts?symbol=AAPL&tf=5m", { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(16000);
await p.getByRole("button", { name: /^Workspace/ }).first().click(); await p.waitForTimeout(900);
await p.getByRole("button", { name: /^Order Flow/ }).first().click(); await p.waitForTimeout(2000);
await p.keyboard.press("Escape"); await p.mouse.move(1590, 990); await p.waitForTimeout(1200);
const read = () => p.evaluate(() => {
  const c = [...document.querySelectorAll("canvas")].find(c => c.dataset.raw !== undefined);
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let k = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) k++;
  return { raw: c.dataset.raw, lens: c.dataset.questionLens, px: k };
});
console.log("before", JSON.stringify(await read()));
await p.getByTestId("show-raw").click(); await p.mouse.move(1590, 990); await p.waitForTimeout(1200);
console.log("raw", JSON.stringify(await read()));
await p.screenshot({ path: "scratchpad/shift0924/raw_on.png" });
await p.getByTestId("show-raw").click(); await p.mouse.move(1590, 990); await p.waitForTimeout(1200);
console.log("restored", JSON.stringify(await read()));
await b.close();
