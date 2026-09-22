#!/usr/bin/env node
/**
 * HOME REACHABILITY CENSUS — which of the 21 registered destinations can a
 * trader actually reach from HOME (/charts) on the desktop, without leaving?
 *
 * WHY THIS AND NOT A CODE READ. The registry documents a deliberate decision
 * about what the compact Rooms DOORWAY lists ("discover, compare markets,
 * replay, review, or research" — wmDestinations.ts ~380). That decision is
 * about the doorway's CONTENTS. It is not, and does not claim to be, a
 * decision that the rooms it omits are unreachable from home. The difference
 * between those two statements is invisible in source and obvious in a census,
 * so this counts doors rather than arguing about intent.
 *
 * It opens EVERY hand and EVERY doorway in turn and unions the hrefs, so a
 * destination only counts as unreachable if no surface on HOME offers it.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "https://wealthymindsetspro.com";

// The 21 registered destinations, restated rather than imported: a census that
// imports the list it is auditing can only prove the list equals itself.
const REGISTERED = {
  ROOM: ["/morning-prep", "/command-deck", "/charts", "/heatmaps", "/nectar", "/paper", "/journal"],
  TOOL: ["/scanner", "/news", "/education", "/proof-lane", "/copy-trading", "/backtesting", "/ai-bot"],
  COMMUNITY: ["/lounge", "/tv", "/radio", "/creator", "/partnerships", "/shop", "/profile"],
};

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

const hrefsNow = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.startsWith("/")),
  );

const reached = new Set(await hrefsNow());
const perSurface = { "closed (masthead + page)": [...reached] };

// Every hand and every doorway the masthead offers, by NAME, not by pixel.
for (const testid of [
  "os-market-rooms",
  "os-market-community",
  "os-equipment-workspace",
  "os-equipment-tools",
]) {
  const el = page.locator(`[data-testid="${testid}"]`);
  if ((await el.count()) === 0) {
    perSurface[testid] = "CONTROL ABSENT";
    continue;
  }
  await el.click();
  await page.waitForTimeout(800);
  const found = await hrefsNow();
  perSurface[testid] = found;
  for (const h of found) reached.add(h);
  // Close it again so the next surface is measured on its own, not stacked.
  await el.click();
  await page.waitForTimeout(400);
}

// Prefix-aware: /nectar/TSLA is a door INTO the Passport room.
const isReached = (href) => [...reached].some((h) => h === href || h.startsWith(href + "/"));

const verdict = {};
for (const [group, hrefs] of Object.entries(REGISTERED)) {
  verdict[group] = {
    reachable: hrefs.filter(isReached),
    NO_DOOR_FROM_HOME: hrefs.filter((h) => !isReached(h)),
  };
}

console.log(JSON.stringify({ perSurface, verdict }, null, 2));
await browser.close();
