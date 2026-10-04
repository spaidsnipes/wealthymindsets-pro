#!/usr/bin/env node
/**
 * GUEST WALK — the non-owner walk-through the 2026-10-04 shift could not run.
 *
 * Every guest fix that night (owner-only broker routes, readiness audience,
 * capability map "once connected", plain refusals) was proven by code path and
 * the OWNER's glass. A guest's own screen needs a guest's own session. This
 * signs in as a TEST account that is not the owner, walks every room at phone
 * and desktop width, and reports what a guest actually meets.
 *
 * Credentials come only from the environment and are never written anywhere:
 *
 *   WM_GUEST_EMAIL=… WM_GUEST_PASSWORD=… node scripts/guest-walk.mjs [--base URL] [--out DIR]
 *
 * Reports, per room and width: the page reached (a redirect is a finding),
 * console errors, page exceptions, failed requests (4xx/5xx — a 403 from an
 * owner-only route is expected and listed separately), owner-refusal text that
 * leaked to the screen (codes, env-var names, "another user"), and a
 * screenshot. Exits non-zero on any unexpected failure.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const BASE = flag("base", "https://wealthymindsetspro.com");
const OUT = flag("out", "guest-walk-out");
const EMAIL = process.env.WM_GUEST_EMAIL;
const PASSWORD = process.env.WM_GUEST_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set WM_GUEST_EMAIL and WM_GUEST_PASSWORD (a test account that is NOT the owner).");
  process.exit(2);
}

const ROOMS = [
  "/charts", "/charts?symbol=NQ1!&tf=5m", "/charts?symbol=TSLA&tf=5m",
  "/scanner", "/scanner/map", "/news", "/education", "/journal", "/paper",
  "/backtesting", "/morning-prep", "/proof-lane", "/nectar", "/desk",
  "/ai-bot", "/copy-trading", "/readiness", "/lounge", "/radio", "/tv",
  "/profile", "/shop", "/creator", "/partnerships", "/research-heat",
];
const WIDTHS = [[390, 844], [1440, 900]];
/** Text a guest must never see: owner refusals leaking as codes or setup. */
const LEAK = /BROKER_ACCOUNT_NOT_AUTHORIZED|BROKER_OWNER_NOT_CONFIGURED|belong to another user|WEBULL_[A-Z_]+|TASTY_TRADE_[A-Z_]+|ALPACA_[A-Z_]+_KEY|Founder action|HTTP 403/;
/** Owner-only routes a guest is expected to be refused by. */
const OWNER_ONLY = /\/api\/broker\/(webull|tastytrade|alpaca)|\/api\/market-data\/webull|\/api\/alpaca/;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
let unexpected = 0;

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(u => !u.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  if (new URL(page.url()).pathname.startsWith("/login")) {
    console.error(`[${w}] sign-in did not leave /login — check the test account.`);
    process.exit(3);
  }

  for (const room of ROOMS) {
    const errors = [], failed = [], refused = [];
    const onConsole = m => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); };
    const onPageErr = e => errors.push(`exception: ${e.message.slice(0, 160)}`);
    const onResp = r => {
      if (r.status() < 400) return;
      const path = new URL(r.url()).pathname;
      (r.status() === 403 && OWNER_ONLY.test(path) ? refused : failed).push(`${r.status()} ${path}`);
    };
    page.on("console", onConsole); page.on("pageerror", onPageErr); page.on("response", onResp);
    await page.goto(`${BASE}${room}`, { waitUntil: "networkidle", timeout: 45000 }).catch(e => errors.push(`goto: ${e.message.slice(0, 80)}`));
    await page.waitForTimeout(4000);
    const reached = new URL(page.url()).pathname;
    const text = await page.evaluate(() => document.body.innerText);
    const leaks = [...new Set((text.match(new RegExp(LEAK, "g")) ?? []))];
    const slug = `${w}${room.replace(/[^a-z0-9]+/gi, "_")}`;
    await page.screenshot({ path: join(OUT, `${slug}.png`) });
    page.off("console", onConsole); page.off("pageerror", onPageErr); page.off("response", onResp);
    const redirected = !room.startsWith(reached);
    const bad = errors.length || failed.length || leaks.length || redirected;
    if (bad) unexpected++;
    console.log(JSON.stringify({ width: w, room, reached, errors, failed, ownerRefusals: refused.length, leaks, ok: !bad }));
  }
  await ctx.close();
}
await browser.close();
console.error(unexpected ? `${unexpected} room/width pairs need a look — screenshots in ${OUT}/` : `All rooms clean for a guest — screenshots in ${OUT}/`);
process.exit(unexpected ? 1 : 0);
