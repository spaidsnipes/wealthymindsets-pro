#!/usr/bin/env node
/** Big Trades vs Delta Bubbles — separate stress tests. */

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
    levels.push({ priceLevel: +Number(px).toFixed(dp), bid: rt.bid, ask: rt.ask, total });
  }
  if (!levels.length) return [];
  const barMean = levels.reduce((s, l) => s + l.total, 0) / levels.length;
  const threshold = Math.max(minLot, barMean * 1.35);
  const pickMap = new Map();
  for (const l of levels.filter(x => x.total >= threshold).sort((a, z) => z.total - a.total).slice(0, 5)) {
    pickMap.set(l.priceLevel, l);
  }
  const topBuy = levels.filter(l => l.ask >= l.bid && l.ask >= minLot).sort((a, z) => z.ask - a.ask)[0];
  const topSell = levels.filter(l => l.bid > l.ask && l.bid >= minLot).sort((a, z) => z.bid - a.bid)[0];
  if (topBuy?.total >= minLot) pickMap.set(topBuy.priceLevel, topBuy);
  if (topSell?.total >= minLot) pickMap.set(topSell.priceLevel, topSell);
  return [...pickMap.values()].sort((a, z) => z.total - a.total).slice(0, 8);
}

function getDeltaBubbleLevels(realData, bar, base) {
  if (!realData || realData.size === 0) return [];
  const priceTick = base > 100 ? 0.01 : 0.0001;
  const dp = base > 100 ? 2 : 4;
  const minLot = minBigTradeLot(base);
  const tickEntries = [];
  let lo = bar.low, hi = bar.high;
  for (const [px, rt] of realData) {
    const p = Number(px);
    tickEntries.push({ price: p, bid: rt.bid, ask: rt.ask });
    lo = Math.min(lo, p); hi = Math.max(hi, p);
  }
  let range = hi - lo;
  if (range <= 0) range = priceTick * 6;
  const numLev = Math.max(6, Math.min(10, Math.floor(range / priceTick * 1.5) || 6));
  const levelStep = range / numLev;
  const levels = [];
  for (let i = 0; i < numLev; i++) {
    const priceLevel = +Number(lo + i * levelStep + levelStep / 2).toFixed(dp);
    const half = levelStep / 2;
    let bid = 0, ask = 0;
    for (const t of tickEntries) {
      if (Math.abs(t.price - priceLevel) < half) { bid += t.bid; ask += t.ask; }
    }
    const total = bid + ask;
    if (total < minLot) continue;
    levels.push({ priceLevel, bid, ask, total, delta: ask - bid });
  }
  if (!levels.length) return [];
  const meanAbsDelta = levels.reduce((s, l) => s + Math.abs(l.delta), 0) / levels.length;
  const threshold = Math.max(minLot, meanAbsDelta * 1.35);
  const pickMap = new Map();
  for (const l of levels.filter(x => Math.abs(x.delta) >= threshold).sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta)).slice(0, 5)) {
    pickMap.set(l.priceLevel, l);
  }
  return [...pickMap.values()].slice(0, 6);
}

let passed = 0, failed = 0;
function assert(name, cond) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

console.log("\n=== Big Trades — exact tick prices ===");
{
  const data = new Map([
    [417.17, { bid: 0, ask: 80 }],
    [417.50, { bid: 0, ask: 65 }],
    [416.89, { bid: 55, ask: 0 }],
    [417.20, { bid: 1, ask: 1 }],
  ]);
  const levels = getRealBigTradeLevels(data, 405);
  assert("multiple exact prices on same bar", levels.length >= 2);
  assert("417.17 preserved", levels.some(l => l.priceLevel === 417.17));
  assert("416.89 sell print preserved", levels.some(l => l.priceLevel === 416.89));
  assert("buy and sell same bar", levels.some(l => l.ask > l.bid) && levels.some(l => l.bid > l.ask));
  assert("noise 417.20 excluded", !levels.some(l => l.priceLevel === 417.2));
}

console.log("\n=== Delta Bubbles — separate bucketing ===");
{
  const bar = { low: 416.8, high: 417.6 };
  const data = new Map([
    [417.05, { bid: 0, ask: 120 }],
    [417.45, { bid: 90, ask: 0 }],
    [417.25, { bid: 20, ask: 20 }],
  ]);
  const levels = getDeltaBubbleLevels(data, bar, 405);
  assert("delta zones found", levels.length >= 1);
  assert("bucket centers differ from raw ticks", levels.some(l => !data.has(l.priceLevel)));
}

console.log("\n=== Separation — different outputs ===");
{
  const bar = { low: 417, high: 417.6 };
  const data = new Map([
    [417.17, { bid: 0, ask: 50 }],
    [417.50, { bid: 0, ask: 35 }],
  ]);
  const bt = getRealBigTradeLevels(data, 405);
  const dt = getDeltaBubbleLevels(data, bar, 405);
  assert("big trades use exact ticks", bt.every(l => data.has(l.priceLevel)));
  assert("paths differ", JSON.stringify(bt) !== JSON.stringify(dt));
}

console.log(`\n${"=".repeat(40)}\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);