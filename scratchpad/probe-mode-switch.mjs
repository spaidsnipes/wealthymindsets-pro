#!/usr/bin/env node
/**
 * WALK THE CLICK PATH, DON'T THEORIZE IT.
 *
 * Workspace plate → MODE → EXECUTE, and then read back whether the product
 * actually re-organised: `.wm-sanctuary[data-mode]` is the shell's own
 * published reading of the committed state. A relocated control that renders
 * but no longer commits is the quiet failure this walks past.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: "p", email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);

const mode = () => page.evaluate(() => document.querySelector(".wm-sanctuary")?.getAttribute("data-mode") ?? null);
const step = [{ at: "landed", mode: await mode() }];

await page.click('[data-testid="os-equipment-workspace"]');
await page.waitForTimeout(500);
step.push({ at: "workspace picked up", mode: await mode(),
  modeGroupVisible: await page.isVisible('[data-testid="os-rail"] #wm-experience-modes') });

await page.click('[data-testid="os-rail"] #wm-experience-modes button:has-text("EXECUTE")');
await page.waitForTimeout(600);
step.push({ at: "EXECUTE pressed", mode: await mode(),
  current: await page.getAttribute('[data-testid="os-rail"] #wm-experience-modes [aria-current="true"]', "aria-current"),
  currentLabel: await page.textContent('[data-testid="os-rail"] #wm-experience-modes [aria-current="true"]') });

await page.screenshot({ path: "scratchpad/shot-mode-in-workspace.png" });
console.log(JSON.stringify(step, null, 2));
await browser.close();
