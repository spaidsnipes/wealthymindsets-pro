#!/usr/bin/env node
/**
 * Stress-test delta bubble level selection + tape source logic.
 * Run: node scripts/audit-bubbles.mjs
 */

const AGGRESSOR = new Set(["finnhub", "polygon", "alpaca", "binance"]);

function minBigTradeLot(symBase) {
  return symBase > 10_000 ? 2 : symBase > 100 ? 15 : symBase > 1 ? 0.05 : 0.001;
}

function getDeltaBubbleLevels(realData, bar, base) {
  if (!realData || realData.size === 0) return [];
  const priceTick = base > 10_000 ? 0.25 : base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
  const dp = base > 100 ? 2 : 4;
  const minLot = minBigTradeLot(base);

  const tickEntries = [];
  let lo = bar.low, hi = bar.high;
  for (const [px, rt] of realData) {
    const p = Number(px);
    tickEntries.push({ price: p, bid: rt.bid, ask: rt.ask });
    lo = Math.min(lo, p);
    hi = Math.max(hi, p);
  }

  let range = hi - lo;
  if (range <= 0) range = priceTick * 6;

  const numLev = Math.max(6, Math.min(10, Math.floor(range / priceTick * 1.5) || 6));
  const levelStep = range / numLev;
  const bucketLo = lo;

  const levels = [];
  for (let i = 0; i < numLev; i++) {
    const priceLevel = +Number(bucketLo + i * levelStep + levelStep / 2).toFixed(dp);
    const half = levelStep / 2;
    let bid = 0, ask = 0;
    for (const t of tickEntries) {
      if (Math.abs(t.price - priceLevel) < half) {
        bid += t.bid;
        ask += t.ask;
      }
    }
    const total = bid + ask;
    if (total < minLot) continue;
    levels.push({ priceLevel, bid, ask, total, delta: ask - bid });
  }
  if (levels.length === 0) return [];

  const meanAbsDelta = levels.reduce((s, l) => s + Math.abs(l.delta), 0) / levels.length;
  const threshold = Math.max(minLot, meanAbsDelta * 1.35);

  const pickMap = new Map();
  for (const l of levels
    .filter(x => Math.abs(x.delta) >= threshold)
    .sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta))
    .slice(0, 5)) {
    pickMap.set(l.priceLevel, l);
  }
  const topBuy = levels.filter(l => l.delta > 0).sort((a, z) => z.delta - a.delta)[0];
  const topSell = levels.filter(l => l.delta < 0).sort((a, z) => a.delta - z.delta)[0];
  if (topBuy && topBuy.delta >= minLot) pickMap.set(topBuy.priceLevel, topBuy);
  if (topSell && Math.abs(topSell.delta) >= minLot) pickMap.set(topSell.priceLevel, topSell);

  return [...pickMap.values()]
    .sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta))
    .slice(0, 6);
}

function simulateTapeSource(restQuoteSource, wsTapeSource) {
  const tape = wsTapeSource;
  return {
    displaySource: tape ?? restQuoteSource,
    tapeSource: tape,
    bubblesEnabled: AGGRESSOR.has(tape ?? ""),
  };
}

let passed = 0;
let failed = 0;

function assert(name, cond) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

console.log("\n=== Tape source preservation ===");
{
  const s = simulateTapeSource("yahoo", "finnhub");
  assert("finnhub WS + yahoo REST → display finnhub", s.displaySource === "finnhub");
  assert("tapeSource stays finnhub", s.tapeSource === "finnhub");
  assert("bubbles enabled", s.bubblesEnabled);
}
{
  const s = simulateTapeSource("yahoo", null);
  assert("yahoo only → no bubbles", !s.bubblesEnabled);
}

console.log("\n=== Delta bucket — TSLA bar ===");
{
  const bar = { low: 416.8, high: 417.6, time: 1720000000 };
  const data = new Map([
    [417.05, { bid: 0, ask: 50 }],
    [417.45, { bid: 35, ask: 0 }],
    [417.20, { bid: 1, ask: 1 }],
  ]);
  const levels = getDeltaBubbleLevels(data, bar, 405);
  assert("finds buy-dominant bucket", levels.some(l => l.delta > 0));
  assert("finds sell-dominant bucket", levels.some(l => l.delta < 0));
  assert("filters noise below min lot", !levels.some(l => l.total < 15));
}

console.log("\n=== Determinism ===");
{
  const bar = { low: 7530, high: 7536, time: 1 };
  const data = new Map([
    [7533.25, { bid: 0, ask: 120 }],
    [7533.5, { bid: 80, ask: 0 }],
  ]);
  const a = JSON.stringify(getDeltaBubbleLevels(data, bar, 7533));
  const b = JSON.stringify(getDeltaBubbleLevels(data, bar, 7533));
  assert("identical runs", a === b);
}

console.log("\n=== Delta threshold — whale only ===");
{
  const bar = { low: 194.0, high: 194.6, time: 2 };
  const data = new Map();
  for (let i = 0; i < 20; i++) {
    data.set(194.4 + i * 0.01, { bid: 5, ask: 5 });
  }
  data.set(194.55, { bid: 0, ask: 500 });
  const levels = getDeltaBubbleLevels(data, bar, 194);
  assert("at most 6 bubbles", levels.length <= 6);
  assert("whale delta included", levels.some(l => l.delta >= 400));
}

console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);