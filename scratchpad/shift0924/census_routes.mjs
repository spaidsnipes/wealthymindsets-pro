import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const ROUTES = ["/heatmaps","/scanner","/journal","/backtesting","/education","/lounge","/radio","/news","/settings"];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
for (const r of ROUTES) {
  try {
    await p.goto("http://localhost:3100" + r, { waitUntil: "domcontentloaded", timeout: 120000 });
    await p.waitForTimeout(r === "/charts" ? 20000 : 9000);
    const name = r.replace(/\//g, "") || "root";
    await p.screenshot({ path: `scratchpad/shift0924/route_${name}.png` });
    const info = await p.evaluate(() => {
      const shell = document.querySelector("[data-os-shell],[data-wm-os],.wm-os-shell") ? "OS" : "?";
      const gold = [...document.querySelectorAll("p, li")].filter(e => {
        const c = getComputedStyle(e).color; const t = (e.textContent || "").trim();
        return t.length > 120 && /rgb\((2[0-5]\d|1[6-9]\d), (1[3-9]\d), ([0-9]{1,2}|[1-9]\d)\)/.test(c);
      }).length;
      const longText = [...document.querySelectorAll("p")].filter(e => (e.textContent || "").trim().length > 160).length;
      const h = [...document.querySelectorAll("h1,h2")].map(e => (e.textContent || "").trim()).slice(0, 4);
      return { path: location.pathname, shell, goldParagraphs: gold, longParagraphs: longText, headings: h };
    });
    console.log(r.padEnd(15), JSON.stringify(info));
  } catch (e) { console.log(r, "ERR", e.message.split("\n")[0]); }
}
await b.close();
