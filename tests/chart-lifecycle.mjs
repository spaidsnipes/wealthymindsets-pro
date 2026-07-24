// Automated chart-lifecycle regression test (Playwright, no test-runner needed).
// Asserts the create-once fix: the chart container is NEVER removed and the
// chart canvas is NEVER absent during symbol/timeframe changes — including under
// throttled network + CPU (the condition that made the blank visible on the
// founder's machine). Run: node tests/chart-lifecycle.mjs
import { chromium } from "playwright";
import fs from "fs";

const URL = process.env.WM_URL || "https://wealthymindsets-pro.vercel.app/charts";
const OUT = process.env.WM_OUT || "/private/tmp/claude-501/-Users-dspaidnoosleep/25c6b90b-9b87-40e1-bb72-458d9eda1f47/scratchpad";
fs.mkdirSync(OUT, { recursive: true });

// Injected probe: count container removals + poll the min chart-canvas count
// (0 = blank plot) every 50ms so an empty-but-present chart is also caught.
const PROBE = `(function(){
  window.__rm = 0; window.__minCanvas = 99; window.__samples = 0;
  var last = !!document.querySelector('.tv-lightweight-charts');
  new MutationObserver(function(){
    var p = !!document.querySelector('.tv-lightweight-charts');
    if(!p && last) window.__rm++;
    last = p;
  }).observe(document.body,{childList:true,subtree:true});
  setInterval(function(){
    var n = document.querySelectorAll('.tv-lightweight-charts canvas').length;
    if(n < window.__minCanvas) window.__minCanvas = n;
    window.__samples++;
  }, 50);
})()`;

const results = {};

async function run(label, opts = {}) {
  const { latency = 0, kbps = 0, cpuRate = 1 } = opts;
  const browser = await chromium.launch();
  // Fresh context = cold cache (item: cold-cache test).
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, bypassCSP: true });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  if (latency || kbps) {
    await client.send("Network.emulateNetworkConditions", {
      offline: false, latency,
      downloadThroughput: kbps ? (kbps * 1024) / 8 : -1,
      uploadThroughput: kbps ? (kbps * 1024) / 8 : -1,
    });
  }
  if (cpuRate > 1) await client.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".tv-lightweight-charts", { timeout: 90000 });
  await page.waitForTimeout(4000);
  await page.evaluate(PROBE);
  await page.screenshot({ path: `${OUT}/${label}-before.png` });

  // Symbol switches (data refetch — the blank trigger) via watchlist rows.
  for (const s of ["AAPL", "NVDA", "SPY", "TSLA", "QQQ"]) {
    try { await page.locator(`text=${s}`).first().click({ timeout: 3000 }); } catch {}
    await page.waitForTimeout(1500);
  }
  // Timeframe switches.
  for (const tf of ["1m", "5m", "15m", "30m", "1h", "D", "W", "M"]) {
    try { await page.getByRole("button", { name: tf, exact: true }).first().click({ timeout: 2500 }); } catch {}
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: `${OUT}/${label}-after.png` });

  const m = await page.evaluate(() => ({
    containerRemovals: window.__rm,
    minCanvasCount: window.__minCanvas,
    samples: window.__samples,
    canvasNow: document.querySelectorAll(".tv-lightweight-charts canvas").length,
  }));
  results[label] = m;
  await browser.close();
}

await run("warm", {});
await run("cold-throttled-slow3g-cpu4x", { latency: 400, kbps: 400, cpuRate: 4 });

const pass = Object.values(results).every(r => r.containerRemovals === 0 && r.minCanvasCount >= 1);
console.log(JSON.stringify(results, null, 2));
fs.writeFileSync(`${OUT}/lifecycle-results.json`, JSON.stringify(results, null, 2));
console.log(pass ? "\nLIFECYCLE TEST: PASS (0 removals, chart canvas never absent)" : "\nLIFECYCLE TEST: FAIL");
process.exit(pass ? 0 : 1);
