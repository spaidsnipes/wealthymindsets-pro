import { chromium } from "playwright-core";
import { fixtureWeekNow } from "./fixture.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.route("**/api/auth/me", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "floor-instrument-no-real-account", email: "x@localhost.invalid", displayName: "F", handle: "floor", profileComplete: true } }) }));
await ctx.route("**/api/yahoo?*type=candles*", r => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ candles: fixtureWeekNow(), barFidelity: "INDICATIVE", sessionKnown: false }) }));
const p = await ctx.newPage();
await p.goto("http://localhost:3100/journal", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(9000);
await p.screenshot({ path: "scratchpad/shift0924/house_journal.png" });
await p.locator('[data-testid="os-market-rooms"]').first().click(); await p.waitForTimeout(1200);
const rooms = await p.$$eval('#wm-os-rail a', els => els.map(e => e.textContent.trim()));
await p.screenshot({ path: "scratchpad/shift0924/house_rooms_open.png" });
await p.locator('[data-testid="os-market-community"]').first().click(); await p.waitForTimeout(1200);
const house = await p.$$eval('#wm-os-rail a', els => els.map(e => e.textContent.trim()));
await p.screenshot({ path: "scratchpad/shift0924/house_community_open.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(600);
await p.locator('[data-testid="os-market-home"]').first().click(); await p.waitForTimeout(12000);
console.log("ROOMS door :", rooms.join(" | "));
console.log("HOUSE door :", house.join(" | "));
console.log("MARKET door ->", new URL(p.url()).pathname);
await p.screenshot({ path: "scratchpad/shift0924/house_back_to_market.png" });
await b.close();
