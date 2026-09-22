/**
 * D-702: the migrated popovers live inside the drawer's own DOM (so its focus
 * trap contains them), and ONE Escape dismisses only the innermost surface.
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 */
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto("http://localhost:3000/charts", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(11000);
await page.getByRole("button", { name: /^Tools/ }).first().click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Chart tools/ }).first().click();
await page.waitForTimeout(700);
const symOpen = () => page.evaluate(() => {
  const sheet = document.getElementById("chart-equipment-sheet");
  const pop = Array.from(document.querySelectorAll("div")).find(d => d.textContent.includes("to select first result") && getComputedStyle(d).position === "fixed");
  return { found: !!pop, insideDrawer: !!pop && !!sheet?.contains(pop), drawer: !!sheet };
});
await page.locator("#chart-equipment-sheet .wm-chart-symbol-search input").click();
await page.waitForTimeout(500);
const a = await symOpen();
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
const b = await symOpen();
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
const c = await symOpen();
console.log(JSON.stringify({ symbolPopoverOpen: a, afterFirstEscape: b, afterSecondEscape: c }, null, 2));
await browser.close();
