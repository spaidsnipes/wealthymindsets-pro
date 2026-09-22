/**
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 *
 * THE QUESTION the Founder's finish-line order asks: does the top shell
 * physically offer ROOMS, WORKSPACE and COMMUNITY as top-level destinations,
 * or is one of them buried?
 *
 * Measured, not remembered: enumerate every control in the masthead, then open
 * each hand and enumerate what it actually contains.
 */
import { chromium } from "playwright";

const URL = "https://wealthymindsetspro.com/charts?symbol=TSLA";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: "probe", email: "probe@local", name: "Probe", displayName: "Probe", profileComplete: true },
    }),
  }),
);
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(9000);

const masthead = await page.evaluate(() => {
  const head = document.querySelector("header") ?? document.body;
  return [...head.querySelectorAll('button, a[href], [role="button"]')]
    .map((el) => ({
      tag: el.tagName,
      text: (el.textContent ?? "").trim().slice(0, 40),
      href: el.getAttribute("href"),
      testid: el.getAttribute("data-testid"),
      expanded: el.getAttribute("aria-expanded"),
    }))
    .filter((c) => c.text || c.testid);
});
console.log("MASTHEAD CONTROLS:\n" + JSON.stringify(masthead, null, 1));

const openHand = async (label) => {
  const el = page.locator('button, [role="button"]').filter({ hasText: new RegExp(`^${label}$`) }).first();
  if ((await el.count()) === 0) return null;
  await el.click();
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const rail = document.querySelector('[data-testid="os-rail"]');
    if (!rail) return { rail: null };
    return {
      ariaLabel: rail.getAttribute("aria-label"),
      headings: [...rail.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => h.textContent.trim()),
      entries: [...rail.querySelectorAll('a[href], button')].map((el) => ({
        text: (el.textContent ?? "").trim().slice(0, 34),
        href: el.getAttribute("href"),
        equipment: el.getAttribute("data-equipment"),
      })),
    };
  });
};

for (const hand of ["Rooms", "Workspace", "Tools"]) {
  const out = await openHand(hand);
  console.log(`\n=== ${hand} ===\n` + JSON.stringify(out, null, 1));
}

await browser.close();
