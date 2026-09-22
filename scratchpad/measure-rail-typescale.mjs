#!/usr/bin/env node
/**
 * RAIL TYPE-SCALE + BLOCK-COUNT CENSUS.
 *
 * Same auth posture as shot-canon-sbs.mjs: the /api/auth/me RESPONSE is stubbed
 * inside this browser context only. No password typed, no token minted.
 * LAYOUT / READ ONLY.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "/tmp/wm-rail.png";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

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

const report = await page.evaluate(() => {
  const rail = document.querySelector(".wm-decision-spine--rail");
  if (!rail) return { error: "no rail" };
  const r = rail.getBoundingClientRect();
  const vis = (el) => {
    const b = el.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };
  // Top-level blocks = direct element children of the section that paint,
  // plus, inside each, the visible text runs a trader actually reads.
  const topLevel = [...rail.children]
    .filter((el) => el.tagName !== "STYLE" && vis(el))
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute("data-testid"),
      h: Math.round(el.getBoundingClientRect().height),
      text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 70),
    }));

  // The census the eye performs: every visible text-bearing leaf run in the
  // rail, which is what "12+ blocks" was counting.
  const runs = [...rail.querySelectorAll("span, code, div, summary")]
    .filter((el) => {
      if (!vis(el)) return false;
      if (el.closest(".wm-spine-sr-only")) return false;
      if (el.classList.contains("wm-spine-sr-only")) return false;
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join("");
      return own.length > 0;
    })
    .map((el) => {
      const cs = getComputedStyle(el);
      return {
        testid: el.getAttribute("data-testid"),
        fs: cs.fontSize,
        lh: cs.lineHeight,
        text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 46),
      };
    });

  const label = (sel) => {
    const el = rail.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { fs: cs.fontSize, lh: cs.lineHeight, text: el.textContent.trim().slice(0, 30) };
  };

  // LABEL sample: first uppercase brass heading in each open cell.
  const labels = [...rail.querySelectorAll("span")]
    .filter((el) => vis(el) && getComputedStyle(el).textTransform === "uppercase")
    .filter((el) => /^(decision|market|now|next|risk|why|state|now · state)$/i.test(el.textContent.trim()))
    .map((el) => {
      const cs = getComputedStyle(el);
      return { text: el.textContent.trim(), fs: cs.fontSize, lh: cs.lineHeight };
    });

  return {
    rail: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    frameW: window.innerWidth,
    pctOfFrame: +((r.width / window.innerWidth) * 100).toFixed(1),
    scrolls: rail.scrollHeight > rail.clientHeight + 1,
    scrollH: rail.scrollHeight,
    clientH: rail.clientHeight,
    topLevelCount: topLevel.length,
    topLevel,
    labels,
    nextValue: label('[data-testid="spine-next"]'),
    nowState: label('[data-testid="spine-now-state"]'),
    decisionId: label('[data-testid="spine-decision-id"], [data-testid="spine-decision-absent"]'),
    visibleRunCount: runs.length,
    runs,
  };
});

console.log(JSON.stringify(report, null, 2));
await page.screenshot({ path: OUT });
console.log("shot:", OUT);
await browser.close();
