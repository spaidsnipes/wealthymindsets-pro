#!/usr/bin/env node
/**
 * Stress-test bubble level selection + tape source logic (extracted from MainChart/useWebSocket).
 * Run: node scripts/audit-bubbles.mjs
 */

const AGGRESSOR = new Set(["finnhub", "polygon", "alpaca", "binance"]);

function minBigTradeLot(symBase) {
  return symBase > 10_000 ? 2 : symBase > 100 ? 15 : symBase > 1 ? 0.05 : 0.001;
}

function getRealBigTradeLevels(realData, base) {
  if (!realData || realData.size === 0) return [];
  const dp = base > 100 ? 2 : 4;
  const minLot = minBigTradeLot(base);
  const levels = [];
  for (const [px, rt] of realData) {
    const total = rt.bid + rt.ask;
    if (total < minLot) continue;
    levels.push({
      priceLevel: +Number(px).toFixed(dp),
      bid: rt.bid,
      ask: rt.ask,
      total,
    });
  }
  if (levels.length === 0) return [];
  const barMean = levels.reduce((s, l) => s + l.total, 0) / levels.length;
  const threshold = Math.max(minLot, barMean * 1.35);
  const pickMap = new Map();
  for (const l of levels.filter(x => x.total >= threshold).sort((a, z) => z.total - a.total).slice(0, 5)) {
    pickMap.set(l.priceLevel, l);
  }
  const topBuy = levels.filter(l => l.ask >= l.bid && l.ask >= minLot).sort((a, z) => z.ask - a.ask)[0];
  const topSell = levels.filter(l => l.bid > l.ask && l.bid >= minLot).sort((a, z) => z.bid - a.bid)[0];
  if (topBuy && topBuy.total >= minLot) pickMap.set(topBuy.priceLevel, topBuy);
  if (topSell && topSell.total >= minLot) pickMap.set(topSell.priceLevel, topSell);
  return [...pickMap.values()].sort((a, z) => z.total - a.total).slice(0, 6);
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
{
  const s = simulateTapeSource("yahoo", "binance");
  assert("binance crypto tape preserved", s.displaySource === "binance" && s.bubblesEnabled);
}

console.log("\n=== TSLA min lot (15 shares) ===");
{
  const data = new Map([
    [417.17, { bid: 0, ask: 50 }],
    [417.18, { bid: 0, ask: 10 }], // below min lot total but ask side
    [417.19, { bid: 30, ask: 0 }],
    [417.20, { bid: 1, ask: 1 }],  // quote noise — should never spawn
  ]);
  const levels = getRealBigTradeLevels(data, 405);
  assert("filters sub-15 lot noise at 417.20", !levels.some(l => l.priceLevel === 417.2));
  assert("keeps 50-lot buy at 417.17", levels.some(l => l.priceLevel === 417.17 && l.ask >= 50));
  assert("includes top sell 417.19", levels.some(l => l.priceLevel === 417.19));
}

console.log("\n=== Determinism (same input → same output) ===");
{
  const data = new Map([
    [7533.25, { bid: 0, ask: 120 }],
    [7533.5, { bid: 80, ask: 0 }],
    [7534.0, { bid: 40, ask: 40 }],
  ]);
  const a = JSON.stringify(getRealBigTradeLevels(data, 7533));
  const b = JSON.stringify(getRealBigTradeLevels(data, 7533));
  assert("identical runs", a === b);
}

console.log("\n=== Threshold: only big trades, not every level ===");
{
  const data = new Map();
  for (let i = 0; i < 20; i++) {
    data.set(194.4 + i * 0.01, { bid: 5, ask: 5 }); // small lots
  }
  data.set(194.55, { bid: 0, ask: 500 }); // one whale
  const levels = getRealBigTradeLevels(data, 194);
  assert("at most 6 bubbles", levels.length <= 6);
  assert("whale 194.55 included", levels.some(l => l.priceLevel === 194.55));
  assert("not all 20 micro levels", levels.length < 10);
}

console.log("\n=== Dedupe key stability ===");
{
  const barTime = 1720000000;
  const px = 417.17;
  const key = String(barTime) + ":" + px;
  assert("dedupe key format", key === "1720000000:417.17");
}

console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);