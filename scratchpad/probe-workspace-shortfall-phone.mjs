/**
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 *
 * THE BINDING STANDARD: phone and iPad are primary, and a ticket is not closed
 * without a screenshot. The Workspace shortfall slice put a four-line warn-ink
 * block inside a rail tile that was sized for a one-line hint. On desktop it
 * reads. The question here is whether the same block survives 360, 390 and 834
 * — or whether it overflows the tile, pushes Review below the fold, or gets
 * clipped to a half-sentence, which is a worse lie than the flat hint it
 * replaced.
 */
import { chromium } from "playwright";

const WIDTHS = [
  { w: 360, h: 800, name: "360" },
  { w: 390, h: 844, name: "390" },
  { w: 834, h: 1112, name: "834" },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });

for (const { w, h, name } of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: w < 800,
    hasTouch: w < 900,
  });
  await ctx.route("**/api/auth/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "probe", email: "p@l", name: "Probe", displayName: "Probe", profileComplete: true },
      }),
    }),
  );
  const page = await ctx.newPage();
  await page.goto("https://wealthymindsetspro.com/charts?symbol=TSLA", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(10000);

  const ws = page.locator('button, [role="button"]').filter({ hasText: /^Workspace$/ }).first();
  const opened = (await ws.count()) > 0;
  if (opened) {
    await ws.click();
    await page.waitForTimeout(2200);
  }

  const tiles = await page.evaluate(() =>
    [...document.querySelectorAll('[data-equipment^="arrange-"]')].map((el) => {
      const r = el.getBoundingClientRect();
      const note = el.querySelector('[data-testid="equipment-shortfall-note"]');
      const nr = note?.getBoundingClientRect();
      return {
        id: el.getAttribute("data-equipment"),
        shortfall: el.getAttribute("data-equipment-shortfall"),
        tile: { y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width) },
        // CLIPPED is the failure mode that matters: a confession cut to half a
        // sentence tells the trader less than the flat hint did.
        noteClipped: note ? note.scrollHeight > note.clientHeight + 1 : null,
        noteOverflowsTile: nr ? nr.bottom > r.bottom + 1 : null,
        belowFold: r.y + r.height > window.innerHeight,
        chars: note?.textContent.trim().length ?? 0,
      };
    }),
  );

  console.log(`\n── ${name}px ─────────────────────────────`);
  console.log("workspace control found:", opened);
  console.log(JSON.stringify(tiles, null, 2));
  await page.screenshot({ path: `scratchpad/workspace-shortfall-${name}.png` });
  await ctx.close();
}

await browser.close();
