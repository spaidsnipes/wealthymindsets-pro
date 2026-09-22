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
await page.locator("#chart-equipment-sheet .wm-chart-symbol-search input").click();
await page.waitForTimeout(600);
const r = await page.evaluate(() => {
  const sheet = document.getElementById("chart-equipment-sheet");
  // The INNERMOST node carrying the footer sentence, then its popover root.
  const leaf = Array.from(document.querySelectorAll("span")).find(s => s.textContent.trim() === "↵ to select first result");
  const root = leaf?.closest('div[style*="fixed"]');
  const focusables = root ? root.querySelectorAll('button,input,[tabindex]') : [];
  return {
    popoverFound: !!root,
    popoverInsideDrawer: !!root && !!sheet?.contains(root),
    popoverFocusables: focusables.length,
    drawerContainsDocumentActive: !!sheet?.contains(document.activeElement),
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
