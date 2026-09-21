#!/usr/bin/env node
/**
 * CANON-VS-OS SHOOTER — DESKTOP ONLY (Founder directive 2026-09-21:
 * "THIS WHOLE 5HR SHIFT WILL BE ALL BROWSER, DONT WORK ON NO DAMN PHONE OR IPAD").
 *
 * Publishes into public/canon/ so the comparator page the Founder has open in
 * Chrome follows the build without anyone pressing anything.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed in this browser context.
 * No password typed, no token minted, no account touched.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = "public/canon";
const browser = await chromium.launch({ channel: "chrome" });

async function shoot({ tag, openTools }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.route("**/api/auth/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "layout-probe", email: "layout@probe.local", displayName: "Layout Probe", handle: "layout", profileComplete: true },
      }),
    }),
  );
  const page = await ctx.newPage();
  await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  if (openTools) {
    await page.locator('[data-testid="os-equipment-tools"]').click();
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: `${OUT}/${tag}.png` });
  console.log(`${OUT}/${tag}.png`);
  await ctx.close();
}

await shoot({ tag: "os-latest" });
await shoot({ tag: "os-latest-tools", openTools: true });
await browser.close();
