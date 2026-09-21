#!/usr/bin/env node
/**
 * Before building a "missing Tools button", PROVE the gap is real.
 *
 * The earlier census matched /^tools$/i on trimmed text. A control labelled
 * "LENSES" or "OVERLAYS" would have read as 0 and sent me off building a
 * duplicate of something that already ships. So: dump EVERY visible control
 * label in the persistent chrome and read them, instead of asking one
 * yes/no question I already guessed the answer to.
 *
 * Same LAYOUT-ONLY auth posture as shot-canon-sbs.mjs: the /api/auth/me
 * RESPONSE is stubbed in this browser context only. No password, no token.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

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
console.log("landed URL:", page.url());

const controls = await page.evaluate(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  return [...document.querySelectorAll("button, a[href], [role='button']")]
    .filter(vis)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48),
        aria: el.getAttribute("aria-label") || "",
        testId: el.getAttribute("data-testid") || "",
        href: el.getAttribute("href") || "",
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
});

console.log(`visible controls: ${controls.length}`);
for (const c of controls) {
  console.log(
    `${String(c.y).padStart(4)},${String(c.x).padStart(4)} ${String(c.w).padStart(4)}x${String(c.h).padStart(3)} ${c.tag.padEnd(6)} ` +
      `${(c.testId || "-").padEnd(28)} ${(c.text || "(no text)").padEnd(50)} aria=${c.aria || "-"}${c.href ? ` href=${c.href}` : ""}`,
  );
}

await browser.close();
