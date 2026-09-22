/**
 * LAYOUT ONLY — the /api/auth/me RESPONSE is stubbed inside this browser
 * context only. No password typed, no token minted, no account touched.
 *
 * THE QUESTION: does the Workspace hand now tell a trader what each named desk
 * can actually draw on the tape in front of them, or does it still list three
 * flat promises? Measured BEFORE this slice on prod TSLA at 1440x900:
 *
 *   Order Flow   The chart is arranged this way now
 *   Regime       Both volume profiles — where price has been accepted
 *   Review       Session profile and effort-against-result, after the fact
 *
 * The confession must be ELEMENT CONTENT, not `title`. A touch trader never
 * receives `title`, and they are exactly the person being misled.
 */
import { chromium } from "playwright";

const URL = "https://wealthymindsetspro.com/charts?symbol=TSLA";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: {
        id: "probe",
        email: "probe@local",
        name: "Probe",
        displayName: "Probe",
        profileComplete: true,
      },
    }),
  }),
);

const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(9000);

const press = async (name) => {
  const el = page
    .locator('button, [role="button"]')
    .filter({ hasText: new RegExp(`^${name}$`) })
    .first();
  if ((await el.count()) === 0) return false;
  await el.click();
  await page.waitForTimeout(1800);
  return true;
};

console.log("Workspace opened:", await press("Workspace"));

const tiles = await page.evaluate(() =>
  [...document.querySelectorAll("[data-equipment]")]
    .filter((el) => el.getAttribute("data-equipment").startsWith("arrange-"))
    .map((el) => ({
      id: el.getAttribute("data-equipment"),
      shortfall: el.getAttribute("data-equipment-shortfall"),
      arranged: el.getAttribute("data-equipment-arranged"),
      // ELEMENT CONTENT, read from the node the rail renders it into —
      // deliberately NOT `title`, which is what the old door had.
      note:
        el.querySelector('[data-testid="equipment-shortfall-note"]')
          ?.textContent ?? null,
      visible: el.getBoundingClientRect().height > 0,
    })),
);

console.log(JSON.stringify(tiles, null, 2));

const speaking = tiles.filter((t) => t.note);
console.log("\nDesks confessing on the glass:", speaking.length, "of", tiles.length);
console.log(
  "VERDICT:",
  tiles.length === 0
    ? "NO ARRANGE TILES FOUND — the hand did not open"
    : speaking.length > 0
      ? "PASS — at least one named desk states its shortfall before the press"
      : "FAIL — the door still lists desks as flat promises",
);

await page.screenshot({ path: "scratchpad/workspace-shortfall.png" });
await browser.close();
