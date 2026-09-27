#!/usr/bin/env node
/**
 * MASTHEAD FIT ON THE GLASS — Garden 16 §51 (round 3, 2026-09-27).
 *
 * src/lib/os/mastheadFit.test.ts pins the compact band's wrap rule as
 * arithmetic over the stylesheet. This is the browser's answer to the same
 * question: at 901, 1024, 1280, 1360, 1399 and 1440, on /charts and /journal,
 * it prints
 *   - the masthead's height,
 *   - the right edge of EVERY masthead button and link (and whether it is
 *     inside the viewport),
 *   - how many lines the feed reading stands on and its width, the mode bar's
 *     width (a non-growing mode bar is its one-row width),
 *   - document scrollWidth against innerWidth (a horizontal spill).
 *
 * SCOPE: the auth RESPONSE is stubbed so the interior routes render — layout
 * only, no password, no token, no account.
 *
 * Usage:
 *   node scripts/glass/masthead-fit.mjs http://localhost:3000
 *   node scripts/glass/masthead-fit.mjs --base http://localhost:3000 [--settle 4000]
 *   PW_CHROMIUM_PATH=/other/chrome node scripts/glass/masthead-fit.mjs …
 * Chromium defaults to /opt/pw-browsers/chromium.
 * Exit 0 clean, 1 if any control ends past the edge or the page scrolls
 * sideways, 2 if there was nothing to measure.
 */
import { chromium } from "playwright";

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
};
const positional = process.argv.slice(2).find((a, i, all) => !a.startsWith("--") && !(all[i - 1] ?? "").startsWith("--"));
const BASE = (arg("base", positional ?? "http://localhost:3000")).replace(/\/$/, "");
const SETTLE_MS = Number(arg("settle", "4000"));
const CHROMIUM = process.env.PW_CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const WIDTHS = [901, 1024, 1280, 1360, 1399, 1440];
const ROUTES = ["/charts", "/journal"];
const HEIGHT = 900;

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] }).catch((error) => {
  console.log(`REFUSING TO REPORT — no browser at ${CHROMIUM} (${String(error.message).split("\n")[0]}).`);
  process.exit(2);
});

const ctx = await browser.newContext({ viewport: { width: 1440, height: HEIGHT } });
await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: "glass-masthead-fit", email: "layout@probe.local", displayName: "Layout", handle: "layout", profileComplete: true },
    }),
  }),
);

console.log(`engine: ${CHROMIUM} · base: ${BASE}`);
const offences = [];
let measured = 0;

for (const route of ROUTES) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: HEIGHT });
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  const found = await page
    .waitForSelector('[data-testid="os-masthead"]', { timeout: 180_000 })
    .then(() => true)
    .catch(() => false);
  if (!found) {
    console.log(`\n${route}: NO MASTHEAD — nothing measured`);
    offences.push(`${route}: no masthead`);
    await page.close();
    continue;
  }
  await page.waitForTimeout(SETTLE_MS);

  for (const vw of WIDTHS) {
    await page.setViewportSize({ width: vw, height: HEIGHT });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const m = document.querySelector('[data-testid="os-masthead"]');
      const box = m.getBoundingClientRect();
      const name = (el) =>
        (el.getAttribute("aria-label") || el.textContent || el.getAttribute("href") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40);
      const controls = [...m.querySelectorAll("button, a")]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0; // visually hidden words are not controls on the glass
        })
        .map((el) => {
          const b = el.getBoundingClientRect();
          return { name: name(el), left: Math.round(b.left * 10) / 10, right: Math.round(b.right * 10) / 10, top: Math.round(b.top) };
        });
      const reading = m.querySelector(".wm-os-feed-standing");
      // Lines of TEXT (the pip is not a line): distinct text-rect tops, 4px apart or more.
      let readingLines = 0;
      if (reading) {
        const tops = [];
        const walk = document.createTreeWalker(reading, NodeFilter.SHOW_TEXT);
        for (let t = walk.nextNode(); t; t = walk.nextNode()) {
          if (!t.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(t);
          for (const c of range.getClientRects()) if (c.width > 0) tops.push(c.top);
        }
        tops.sort((a, b) => a - b);
        readingLines = tops.filter((t, i) => i === 0 || t - tops[i - 1] >= 4).length;
      }
      const centre = m.querySelector(".wm-os-masthead-center");
      return {
        height: Math.round(box.height * 10) / 10,
        controls,
        reading: reading
          ? { width: Math.round(reading.getBoundingClientRect().width * 10) / 10, lines: readingLines, text: reading.textContent.replace(/\s+/g, " ").trim().slice(0, 60) }
          : null,
        centreWidth: centre && centre.childElementCount > 0 ? Math.round(centre.getBoundingClientRect().width * 10) / 10 : null,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    measured++;
    console.log(`\n${route} @ ${vw}px   masthead height ${r.height}px   scrollWidth ${r.scrollWidth} / innerWidth ${r.innerWidth}${r.scrollWidth > r.innerWidth ? "   SPILL" : ""}`);
    if (r.centreWidth !== null) console.log(`  mode bar width ${r.centreWidth}px`);
    if (r.reading) console.log(`  feed reading ${r.reading.width}px on ${r.reading.lines} line(s): "${r.reading.text}"`);
    for (const c of r.controls) {
      const out = c.right > r.innerWidth + 0.5 || c.left < -0.5;
      console.log(`  ${out ? "OUT " : "ok  "} right ${String(c.right).padStart(7)}  (left ${c.left}, top ${c.top})  ${c.name}`);
      if (out) offences.push(`${route} @ ${vw}: ${c.name} at ${c.left}–${c.right} of ${r.innerWidth}`);
    }
    if (r.scrollWidth > r.innerWidth) offences.push(`${route} @ ${vw}: scrollWidth ${r.scrollWidth} > innerWidth ${r.innerWidth}`);
  }
  await page.close();
}

await browser.close();
if (measured === 0) {
  console.log("\nREFUSING TO REPORT — nothing was measured.");
  process.exit(2);
}
console.log(offences.length === 0 ? `\nCLEAN — ${measured} frames` : `\nOFFENCES (${offences.length}):\n  ${offences.join("\n  ")}`);
process.exit(offences.length === 0 ? 0 : 1);
