#!/usr/bin/env node
/**
 * COMPARATOR SLOT 5 — the COMMUNITY doorway, open.
 *
 * WHY THIS SLOT EXISTS. Measured on prod 2026-09-22 at 1440x900, before the
 * fix: in equipment mode the Community block rendered `null`. Seven
 * destinations — Lounge, WM TV, WM Radio, Creator, Partnerships, Shop and the
 * trader's own Profile — had ZERO doors from the room the product calls home.
 * None of the other four comparator slots can show that, because they all
 * shoot either the chart or the equipment hands. A defect no pane can display
 * is a defect nobody can see come back.
 *
 * This is also the RUNTIME PROOF for the slice, not just a picture: it reads
 * the opened rail back and prints which of the seven destinations are actually
 * listed, so the shot cannot silently show an empty or half-populated hand.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "https://wealthymindsetspro.com";
const OUT = "public/canon/os-latest-community.png";

// The HOUSE door per the HOUSE PLAN bolt-on (CURRENT — 2026-09-22), restated
// here on purpose: a probe that imports the same list it is checking proves
// only that the list equals itself. Academy (/education) and News moved
// behind this door by the bolt-on; the seven COMMUNITY-group destinations
// keep their only door from HOME.
const EXPECTED = ["/education", "/lounge", "/tv", "/radio", "/creator", "/partnerships", "/shop", "/news", "/profile"];

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: {
      id: "layout-probe", email: "layout@probe.local",
      displayName: "Layout Probe", handle: "layout", profileComplete: true,
    } }),
  }),
);
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);

// A NAMED node, not a coordinate. The doorway is identified by the same
// testid the sentinel pins, so this shot goes red the day the identity moves
// rather than quietly photographing whatever now sits at those pixels.
const door = page.locator('[data-testid="os-market-community"]');
const doorCount = await door.count();
await door.click();
await page.waitForTimeout(900);

const readout = await page.evaluate(() => {
  const rail = document.querySelector('[data-testid="os-rail"]');
  const plates = [...document.querySelectorAll("[data-testid^='os-equipment-']")].map((b) =>
    b.getAttribute("data-testid"),
  );
  return {
    railLabel: rail?.getAttribute("aria-label") ?? null,
    hrefs: rail ? [...rail.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")) : [],
    // The doorway must stay a WORD. If it ever grows equipment chrome there
    // will be a third brass plate here, and this number is how we find out.
    equipmentPlates: plates,
    // Price must never be displaced by a media mall.
    marketStillVisible: document.querySelectorAll(".tv-lightweight-charts").length,
    doorwayPresentation: document
      .querySelector('[data-testid="os-market-community"]')
      ?.getAttribute("data-presentation") ?? null,
  };
});

await page.screenshot({ path: OUT });

const missing = EXPECTED.filter((h) => !readout.hrefs.includes(h));
console.log(JSON.stringify({
  out: OUT,
  doorwayControlsFound: doorCount,
  ...readout,
  missing,
  VERDICT:
    doorCount === 1 &&
    missing.length === 0 &&
    readout.equipmentPlates.length === 2 &&
    readout.marketStillVisible > 0
      ? "COMMUNITY DOORWAY PRESENT — seven destinations reachable from HOME, still exactly two equipment plates, market still drawn"
      : "FAIL",
}, null, 2));

await browser.close();
