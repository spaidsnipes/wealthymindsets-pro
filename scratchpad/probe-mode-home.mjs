#!/usr/bin/env node
/**
 * WHERE DOES THE MODE CHIP ACTUALLY STAND?
 *
 * Reads the /charts masthead text verbatim, then opens the Workspace plate and
 * reads that panel — so "relocated, not deleted" is a measurement rather than a
 * claim. Also resolves the mode group's aria relationship in whichever place it
 * ends up, because a control that moves and loses its announcement has not been
 * moved, it has been replaced with a quieter copy of itself.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 * No credentials, no token minted.
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

const readMasthead = () => page.evaluate(() => {
  const mh = document.querySelector(".wm-os-masthead");
  return {
    text: (mh?.innerText || "").replace(/\s+/g, " ").trim(),
    h: Math.round(mh?.getBoundingClientRect().height ?? 0),
    modeGroupInMasthead: !!mh?.querySelector('#wm-experience-modes, [data-testid="experience-mode-chip"]'),
  };
});

const before = await readMasthead();

// Pick up the Workspace plate.
const plate = await page.$('[data-testid="os-equipment-workspace"]');
let workspace = { opened: false };
if (plate) {
  await plate.click();
  await page.waitForTimeout(600);
  workspace = await page.evaluate(() => {
    const rail = document.querySelector('[data-testid="os-rail"]');
    if (!rail) return { opened: false };
    const rr = rail.getBoundingClientRect();
    const nav = rail.querySelector("#wm-experience-modes");
    const chip = rail.querySelector('[data-testid="experience-mode-chip"]');
    const modeButtons = nav
      ? [...nav.querySelectorAll("button")].map((b) => {
          const k = b.getBoundingClientRect();
          return {
            label: (b.textContent || "").trim(),
            current: b.getAttribute("aria-current"),
            h: Math.round(k.height),
            // Does this button stand INSIDE the panel's own box, or is it
            // clipped by the 210px equipment rail?
            overflowsRight: Math.round(k.right - rr.right),
          };
        })
      : [];
    return {
      opened: true,
      railLabel: rail.getAttribute("aria-label"),
      railWidth: Math.round(rr.width),
      text: (rail.innerText || "").replace(/\s+/g, " ").trim(),
      hasModeGroup: !!nav,
      hasChip: !!chip,
      chipAriaControls: chip?.getAttribute("aria-controls") ?? null,
      chipAriaExpanded: chip?.getAttribute("aria-expanded") ?? null,
      modeButtons,
    };
  });
}

console.log(JSON.stringify({ masthead: before, workspacePanel: workspace }, null, 2));
await browser.close();
