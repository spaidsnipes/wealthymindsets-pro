#!/usr/bin/env node
/**
 * DOES THE CONFESSION ARRIVE BEFORE THE PRESS?
 *
 * The prior repairs made every LIVE reading on /charts literally true while bar
 * replay is engaged, and the replay panel itself confesses that it drives
 * nothing. But that confession is readable only AFTER the instrument is picked
 * up — by which point an orange BAR REPLAY panel is sitting under a LIVE
 * masthead, and "backtest historical replay and LIVE/LAST context must be
 * impossible to confuse" has already been spent.
 *
 * So the disclosure moved up to the WORKSPACE menu. This probe measures whether
 * it is actually ON THE GLASS at that moment — text, geometry and the
 * machine-checkable attribute — and whether it SURVIVES the equipment being
 * held, which is when it matters most.
 *
 * LAYOUT ONLY — /api/auth/me stubbed in this browser context only. No password
 * typed, no token minted, no account touched.
 */
import { chromium } from "playwright";
const BASE = "https://wealthymindsetspro.com";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto(`${BASE}/charts?symbol=BTC`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(14000);

/** Every WORKSPACE entry, as the trader reads it, with its disclosure state. */
const hand = () => page.evaluate(() => {
  const btns = [...document.querySelectorAll("button[data-equipment]")];
  return btns.map((b) => {
    const r = b.getBoundingClientRect();
    return {
      id: b.getAttribute("data-equipment"),
      open: b.getAttribute("data-equipment-open") === "true",
      unbuilt: b.getAttribute("data-equipment-unbuilt") === "true",
      text: (b.textContent || "").replace(/\s+/g, " ").trim(),
      title: b.getAttribute("title"),
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  });
});

await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(1200);
const beforePress = await hand();
await page.screenshot({ path: "scratchpad/replay-menu-before-press.png" });

await page.click('button[data-equipment="bar-replay"]');
await page.waitForTimeout(1500);
const afterPress = await hand();
await page.screenshot({ path: "scratchpad/replay-menu-after-press.png" });

const pick = (list) => list.find((e) => e.id === "bar-replay") ?? null;
const b = pick(beforePress);
const a = pick(afterPress);
const SAYS = "Not wired to the chart yet";

console.log(JSON.stringify({
  workspaceEntries: beforePress.map((e) => e.id),
  barReplay: { beforePress: b, afterPress: a },
  CONFESSION_BEFORE_THE_PRESS: Boolean(b && b.unbuilt && b.text.includes(SAYS)),
  CONFESSION_SURVIVES_BEING_HELD: Boolean(a && a.unbuilt && a.text.includes(SAYS)),
  HELD: Boolean(a && a.open),
  // Nothing honest may acquire a confession it does not owe.
  OTHERS_UNMARKED: beforePress.filter((e) => e.id !== "bar-replay" && e.unbuilt).map((e) => e.id),
}, null, 1));
await browser.close();
