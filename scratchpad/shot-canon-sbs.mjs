#!/usr/bin/env node
/**
 * Desktop shot of the DEFAULT ROUTE, plus a census of the chrome that the
 * 2026-09-18 "Last Mile" doc lists as AUTOMATIC REJECT.
 *
 * Same auth posture as prove-charts-floor.mjs: the /api/auth/me RESPONSE is
 * stubbed inside this browser context only. No password typed, no token
 * minted, no account touched. LAYOUT ONLY.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "/tmp/wm-charts-1440.png";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      // `profileComplete` matters: without it /charts bounces to /profile?setup=1.
      // That bounce is the ONBOARDING guard doing its job, not a route defect —
      // measured, and recorded here so the next reader does not re-file it as one.
      user: {
        id: "layout-probe",
        email: "layout@probe.local",
        displayName: "Layout Probe",
        handle: "layout",
        profileComplete: true,
      },
    }),
  }),
);

const page = await ctx.newPage();
await page.goto(`${BASE}/charts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

console.log("landed URL:", page.url());

// The Last Mile §2 "automatic reject chrome" list, each as a DOM question.
const census = await page.evaluate(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const text = (document.body.innerText || "").toUpperCase();
  return {
    leftPageNav: q("nav").filter((n) => n.getBoundingClientRect().left < 80).length,
    roomsWord: text.includes("ROOMS"),
    stageFull: location.search.includes("stage=full"),
    hamburger: q('[aria-label*="menu" i], button[aria-expanded]').length,
    canvasCount: q("canvas").length,
    tvCharts: q(".tv-lightweight-charts").length,
    osRoom: q('main[data-testid="os-room"]').length,
    workspaceBtn: q("button, a").filter((b) => /workspace/i.test(b.textContent || "")).length,
    toolsBtn: q("button, a").filter((b) => /^tools$/i.test((b.textContent || "").trim())).length,
  };
});
console.log(JSON.stringify(census, null, 2));

await page.screenshot({ path: OUT });
console.log("shot:", OUT);
await browser.close();
