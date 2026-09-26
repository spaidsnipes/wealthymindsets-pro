#!/usr/bin/env node
/**
 * COMMAND DECK proof — the §11 control, pressed in a real browser on a served
 * /charts. 2026-09-26, Garden 16 §10 + §11.
 *
 * ── Why a render test was not enough ─────────────────────────────────────────
 * The vitest suite proves what the drawer RENDERS for a given room state, and
 * that the control is a button that names a region which exists. It cannot
 * press anything: this repo has no DOM test environment. Every law below is a
 * law about a PRESS — what the address does, whether the chart survives, where
 * focus goes, whether the right rail hears the phase — and a static render has
 * no press to observe. So they are observed here, on the served room.
 *
 * ── The laws ────────────────────────────────────────────────────────────────
 *   LAW 0  POSITIVE CONTROL. The control and a drawn chart are on the page.
 *          Without both, every law below would pass over nothing — exit 2.
 *   LAW 1  The control is a BUTTON with no href, named "Command Deck", on one
 *          line, closed, with no dangling aria-controls.
 *   LAW 2  Pressing it opens the deck IN PLACE: aria-expanded true,
 *          aria-controls resolves to the drawer, the drawer is at DRAWER
 *          depth, the path is still /charts, symbol and timeframe unchanged,
 *          and every chart canvas that was on the page is STILL the same node.
 *   LAW 3  The drawer is above the pane's own chrome: the point at the centre
 *          of the drawer's title hits the drawer, not a chart control.
 *   LAW 4  The phase control is WIRED: pressing In Trade changes the chain
 *          headline under it ("Managing — …") AND changes what the right rail
 *          says (the rail reads the same one chain).
 *   LAW 5  Escape puts it down and focus comes home to the control; the
 *          address drops only equip/stage; the chart is still the same nodes.
 *   LAW 6  The drawer's own Close does the same.
 *   LAW 7  One thing over price: opening the deck puts the Workspace hand down.
 *
 * ── SCOPE, stated so a green run is not over-read ────────────────────────────
 * The auth RESPONSE is stubbed so the interior route renders — layout only: no
 * password, no token, no account. Market data is whatever the served build's
 * providers answer (with no keys: NO BAR HISTORY, honestly). It proves the
 * control and the drawer behave; it does NOT prove how the composed scene
 * reads beside a Founder plate — that remains HUMAN_PROOF_REQUIRED at 1440.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *   node scripts/prove-command-deck.mjs --base http://localhost:3000
 *   PW_CHROMIUM_PATH=/path/to/chrome node scripts/prove-command-deck.mjs …
 * Exit 0 clean, 1 on any offence, 2 if there was nothing to measure.
 */
import { chromium } from "playwright";

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
};
const BASE = arg("base", "http://localhost:3000");
const SYMBOL = arg("symbol", "TSLA");
const TF = arg("tf", "1D");
const SETTLE_MS = Number(arg("settle", "8000"));

let engine = "chrome";
const launch = process.env.PW_CHROMIUM_PATH
  ? chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH, args: ["--no-sandbox"] }).then((b) => {
      engine = `executable:${process.env.PW_CHROMIUM_PATH}`;
      return b;
    })
  : chromium.launch({ channel: "chrome" }).catch(() => {
      engine = "bundled-chromium";
      return chromium.launch();
    });
const browser = await launch.catch((error) => {
  console.log(`REFUSING TO REPORT — no browser could be launched (${String(error.message).split("\n")[0]}).`);
  process.exit(2);
});

const offences = [];
const law = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) offences.push(name);
};

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { id: "prove-command-deck", email: "layout@probe.local", displayName: "Layout", handle: "layout", profileComplete: true },
    }),
  }),
);
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));

await page.goto(`${BASE}/charts?symbol=${encodeURIComponent(SYMBOL)}&tf=${encodeURIComponent(TF)}`, {
  waitUntil: "domcontentloaded",
  timeout: 180_000,
});
const found = await page
  .waitForSelector('[data-testid="os-command-deck"]', { timeout: 180_000 })
  .then(() => true)
  .catch(() => false);
await page.waitForTimeout(SETTLE_MS);

// ── LAW 0 ─────────────────────────────────────────────────────────────────
const canvases = await page.evaluate(() => {
  const list = [...document.querySelectorAll('[data-testid="os-room"] canvas')];
  window.__wmChartNodes = list;
  return list.length;
});
if (!found || canvases === 0) {
  console.log(
    `REFUSING TO REPORT — nothing to measure (control ${found ? "present" : "absent"}, ${canvases} chart canvases). ` +
      "A proof that pressed nothing is not a clean run.",
  );
  await browser.close();
  process.exit(2);
}
console.log(`engine: ${engine} · base: ${BASE} · chart canvases: ${canvases}`);

const read = () =>
  page.evaluate(() => {
    const b = document.querySelector('[data-testid="os-command-deck"]');
    const word = b?.querySelector(".wm-os-equipment-plate-word");
    const controls = b?.getAttribute("aria-controls") ?? null;
    const aside = document.querySelector('[data-testid="room-equipment"]');
    return {
      tag: b?.tagName ?? null,
      href: b?.getAttribute("href") ?? null,
      label: b?.getAttribute("aria-label") ?? null,
      wordLines: word ? word.getClientRects().length : 0,
      expanded: b?.getAttribute("aria-expanded") ?? null,
      controls,
      resolves: controls ? document.getElementById(controls) === aside && aside !== null : false,
      equipment: aside?.getAttribute("data-equipment") ?? null,
      stage: aside?.getAttribute("data-equipment-stage") ?? null,
      path: location.pathname,
      params: Object.fromEntries(new URLSearchParams(location.search)),
      chartIntact: (window.__wmChartNodes ?? []).every((c) => c.isConnected),
      focusIsControl: document.activeElement === b,
      workspaceOpen: !!document.querySelector('[data-testid="os-rail"]'),
    };
  });

// ── LAW 1 ─────────────────────────────────────────────────────────────────
const closed = await read();
law(
  "LAW 1  the control is a closed BUTTON named Command Deck, on one line, no href",
  closed.tag === "BUTTON" && closed.href === null && closed.label === "Command Deck" &&
    closed.expanded === "false" && closed.controls === null && closed.wordLines === 1,
  JSON.stringify({ tag: closed.tag, href: closed.href, label: closed.label, expanded: closed.expanded, controls: closed.controls, lines: closed.wordLines }),
);

// ── LAW 2 ─────────────────────────────────────────────────────────────────
const control = page.locator('[data-testid="os-command-deck"]');
await control.click();
await page.waitForTimeout(1_000);
const open = await read();
law(
  "LAW 2  pressed: the deck opens in place over the same chart",
  open.expanded === "true" && open.controls === "wm-command-deck" && open.resolves &&
    open.equipment === "command-deck" && open.stage === "drawer" && open.path === "/charts" &&
    open.params.symbol === SYMBOL && open.params.tf === TF && open.params.equip === "command-deck" &&
    open.chartIntact,
  JSON.stringify({ expanded: open.expanded, controls: open.controls, resolves: open.resolves, stage: open.stage, path: open.path, params: open.params, chartIntact: open.chartIntact }),
);

// ── LAW 3 ─────────────────────────────────────────────────────────────────
// A GRID, not one point. The first version sampled only the title's centre and
// stayed green with the drawer pushed back under the pane's chrome, because
// the "D" data-window toggle overlaps the drawer's left edge BELOW the title
// row. Every 12px inside the drawer's box (1px in from its border) must hit
// the drawer itself.
const covered = await page.evaluate(() => {
  const aside = document.querySelector('[data-testid="room-equipment"]');
  if (!aside) return { sampled: 0, escaped: [] };
  const r = aside.getBoundingClientRect();
  const escaped = [];
  let sampled = 0;
  for (let y = r.top + 2; y < Math.min(r.bottom - 2, window.innerHeight - 1); y += 12) {
    for (let x = r.left + 2; x < r.right - 2; x += 12) {
      sampled += 1;
      const hit = document.elementFromPoint(x, y);
      // `next dev` draws its own indicator badge in a <nextjs-portal> at the
      // bottom-left. It is dev-server chrome that no build renders, so it is
      // the one element excused — by name, not by region.
      if (hit?.tagName === "NEXTJS-PORTAL") continue;
      if (!hit || !aside.contains(hit)) {
        escaped.push(`${Math.round(x)},${Math.round(y)}:${hit?.getAttribute("title") ?? hit?.tagName ?? "none"}`);
      }
    }
  }
  return { sampled, escaped };
});
law(
  "LAW 3  the drawer is above the pane's own chrome, at every point of it",
  covered.sampled > 100 && covered.escaped.length === 0,
  `${covered.sampled} points sampled, ${covered.escaped.length} hit something else${covered.escaped.length ? `: ${covered.escaped.slice(0, 4).join(" ")}` : ""}`,
);

// ── LAW 4 ─────────────────────────────────────────────────────────────────
const railText = () =>
  page.evaluate(() => (document.querySelector(".wm-decision-spine--rail")?.textContent ?? "").replace(/\s+/g, " "));
const headline = () =>
  page.evaluate(() => document.querySelector('[data-testid="command-deck-chain-headline"]')?.textContent ?? null);
const railBefore = await railText();
const headlineBefore = await headline();
await page.locator('[data-testid="command-deck-phase"] button[data-phase="POSITION"]').click();
await page.waitForTimeout(1_500);
const railAfter = await railText();
const headlineAfter = await headline();
const pressed = await page.evaluate(() =>
  [...document.querySelectorAll('[data-testid="command-deck-phase"] button[aria-pressed="true"]')].map((b) => b.getAttribute("data-phase")),
);
law(
  "LAW 4  the phase control drives the one chain, and the right rail hears it",
  headlineBefore !== null && /^Preparing — /.test(headlineBefore) &&
    headlineAfter !== null && /^Managing — /.test(headlineAfter) &&
    railBefore.length > 0 && railBefore !== railAfter &&
    pressed.length === 1 && pressed[0] === "POSITION",
  JSON.stringify({ headlineBefore, headlineAfter, railChanged: railBefore !== railAfter, pressed }),
);
// Put the phase back where the room started, from INSIDE the drawer.
await page.locator('[data-testid="command-deck-phase"] button[data-phase="PREPARATION"]').focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(600);

// ── LAW 5 ─────────────────────────────────────────────────────────────────
await page.keyboard.press("Escape");
await page.waitForTimeout(900);
const escaped = await read();
law(
  "LAW 5  Escape puts it down; focus comes home; only equip/stage leave the address",
  escaped.expanded === "false" && escaped.controls === null && escaped.equipment === null &&
    escaped.focusIsControl && escaped.path === "/charts" && escaped.params.symbol === SYMBOL &&
    escaped.params.tf === TF && !("equip" in escaped.params) && !("stage" in escaped.params) && escaped.chartIntact,
  JSON.stringify({ expanded: escaped.expanded, focusIsControl: escaped.focusIsControl, params: escaped.params, chartIntact: escaped.chartIntact }),
);

// ── LAW 6 ─────────────────────────────────────────────────────────────────
await control.click();
await page.waitForTimeout(900);
await page.locator('[data-testid="equipment-close"]').click();
await page.waitForTimeout(900);
const closedByX = await read();
law(
  "LAW 6  the drawer's Close puts it down and focus comes home",
  closedByX.expanded === "false" && closedByX.equipment === null && closedByX.focusIsControl && closedByX.chartIntact,
  JSON.stringify({ expanded: closedByX.expanded, focusIsControl: closedByX.focusIsControl }),
);

// ── LAW 7 ─────────────────────────────────────────────────────────────────
await page.locator('[data-testid="os-equipment-workspace"]').click();
await page.waitForTimeout(500);
const workspaceWasOpen = (await read()).workspaceOpen;
await control.click();
await page.waitForTimeout(900);
const oneThing = await read();
law(
  "LAW 7  one thing over price: the deck puts the Workspace hand down",
  workspaceWasOpen && !oneThing.workspaceOpen && oneThing.expanded === "true" && oneThing.stage === "drawer",
  JSON.stringify({ workspaceWasOpen, workspaceOpenAfter: oneThing.workspaceOpen, stage: oneThing.stage }),
);
// And pressing the held control puts it down (the aria-expanded promise).
await control.click();
await page.waitForTimeout(900);
const toggled = await read();
law("LAW 7b pressing the held control puts it down", toggled.expanded === "false" && toggled.equipment === null);

if (pageErrors.length > 0) console.log(`page errors seen (not graded): ${pageErrors.join(" | ")}`);
await browser.close();
if (offences.length > 0) {
  console.log(`\n${offences.length} offence(s).`);
  process.exit(1);
}
console.log("\nclean — every law held.");
