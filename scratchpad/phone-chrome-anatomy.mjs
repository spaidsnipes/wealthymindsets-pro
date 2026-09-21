#!/usr/bin/env node
/**
 * C-101 says the candles own 70% of the floor and that 1440 DESKTOP / 390
 * PHONE are the SAME ORGANISM. prove-charts-floor.mjs already measured the
 * phone at 45.1% and named the two eaters. This script asks the next
 * question, which is the one that decides what gets built:
 *
 *   WHAT, EXACTLY, IS INSIDE THOSE 278 PIXELS?
 *
 * D-701 SALVAGE authorises "MIGRATE LEGITIMATE ORGANS INTO WORKSPACE/TOOLS
 * DRAWERS" — not deletion. So every child gets measured and named before
 * anything moves, because a row I cannot name is a row I cannot re-home.
 *
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed in this browser context.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
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

const anatomy = await page.evaluate(() => {
  const out = [];
  const walk = (el, depth, limit) => {
    if (depth > limit) return;
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      out.push({
        depth,
        h: Math.round(r.height),
        w: Math.round(r.width),
        y: Math.round(r.y),
        sel:
          c.tagName.toLowerCase() +
          (c.className && typeof c.className === "string"
            ? "." + c.className.trim().split(/\s+/).slice(0, 3).join(".")
            : ""),
        text: (c.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
      });
      walk(c, depth + 1, limit);
    }
  };
  const res = {};
  for (const [key, sel, limit] of [
    ["header", ".wm-chart-room-header", 2],
    ["toolbar", ".wm-chart-toolbar", 2],
  ]) {
    const root = document.querySelector(sel);
    if (!root) {
      res[key] = "NOT PRESENT";
      continue;
    }
    out.length = 0;
    const rr = root.getBoundingClientRect();
    walk(root, 0, limit);
    res[key] = { self: { h: Math.round(rr.height), w: Math.round(rr.width) }, children: [...out] };
  }
  return res;
});

for (const [key, v] of Object.entries(anatomy)) {
  console.log(`\n===== ${key} =====`);
  if (typeof v === "string") {
    console.log(v);
    continue;
  }
  console.log(`self ${v.self.w}x${v.self.h}`);
  for (const c of v.children) {
    console.log(
      `${"  ".repeat(c.depth + 1)}y=${String(c.y).padStart(4)} ${String(c.w).padStart(4)}x${String(c.h).padStart(3)}  ${c.sel.slice(0, 54).padEnd(56)} ${c.text}`,
    );
  }
}

await browser.close();
