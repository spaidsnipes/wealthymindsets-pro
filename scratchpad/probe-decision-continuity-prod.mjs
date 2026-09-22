#!/usr/bin/env node
/**
 * DECISION_ID CONTINUITY — the one Garden 10 gate that has never been measured
 * on production. The exit receipt has carried "NOT MEASURED" on this line; an
 * unmeasured gate is a hole, so this closes it.
 *
 * THE CONTRACT UNDER TEST (src/lib/traderMemory/decisionContinuity.ts +
 * ChartsDashboard.tsx:2020):
 *   1. A decision born on an instrument is found again on RELOAD.
 *   2. Moving the camera to another instrument must NOT carry that identity —
 *      a TSLA decision appearing on BTC is the aliasing failure the owner's
 *      own header names.
 *   3. RETURNING must find the SAME id, not mint a second one.
 *
 * A birth requires a live permission crossing, which a probe cannot force. So
 * the probe seeds a VALID envelope — the exact shape `readSceneDecision`
 * vouches for, written to the real key — which exercises the read/scope half
 * of the contract end to end. A malformed seed would be rejected and the probe
 * would read as a false failure, so the seed shape is the test's own premise.
 *
 * LAYOUT ONLY — /api/auth/me RESPONSE stubbed in this browser context only.
 */
import { chromium } from "playwright";

const BASE = "https://wealthymindsetspro.com";
const OWNER = "p"; // must match the stubbed user's id below
const SEEDED_ID = "wmd_probe-continuity-0001";

const envelope = (underlying) => JSON.stringify({
  version: 1,
  owner: OWNER,
  underlying,
  identity: {
    lawVersion: "wm.decision-identity.v1",
    decisionId: SEEDED_ID,
    bornAt: Date.now(),
    bornFrom: "PERMISSION_GRANTED",
    bornOnDeviceId: "probe-device",
  },
});

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ user: { id: OWNER, email: "l@p.local", displayName: "P", handle: "p", profileComplete: true } }) }));
const page = await ctx.newPage();

const readIdentity = () => page.evaluate(() => {
  const host = document.querySelector("[data-b501-decision-id]");
  const id = document.querySelector("[data-chart-identity]");
  return {
    symbol: id ? (id.innerText || "").replace(/\s+/g, " ").trim() : null,
    decisionId: host?.getAttribute("data-b501-decision-id") ?? null,
    bornFrom: host?.getAttribute("data-b501-born-from") ?? null,
  };
});

const visit = async (symbol) => {
  await page.goto(`${BASE}/charts?symbol=${symbol}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  return readIdentity();
};

// Establish the origin, then seed a BTC decision and nothing for ETH.
await page.goto(`${BASE}/charts?symbol=BTC`, { waitUntil: "domcontentloaded" });
await page.evaluate(([key, value]) => localStorage.setItem(key, value),
  [`wm:decision-identity:v1:${encodeURIComponent(OWNER)}:${encodeURIComponent("BTC")}`, envelope("BTC")]);

const onBtc      = await visit("BTC");   // 1. found after a full reload
const onEth      = await visit("ETH");   // 2. must NOT leak across instruments
const backOnBtc  = await visit("BTC");   // 3. same id, not a second one

console.log(JSON.stringify({
  onBtc, onEth, backOnBtc,
  survivesReload:   onBtc.decisionId === SEEDED_ID,
  noCrossInstrumentLeak: onEth.decisionId === null,
  sameIdOnReturn:   backOnBtc.decisionId === SEEDED_ID,
}, null, 1));
await browser.close();
