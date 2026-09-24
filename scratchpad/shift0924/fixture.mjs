// FIXTURE BARS — deterministic, harness-injected. NOT market data.
// Shape: open drive up, long balance (builds value), a fast excursion that
// leaves single prints, then a retrace into value. Enough to exercise every
// profile species' refusal and draw paths.
export function fixtureBars(n = 240, endSec = Math.floor(Date.UTC(2026, 8, 23, 20, 0) / 1000)) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = [];
  let px = 228;
  for (let i = 0; i < n; i++) {
    const t = endSec - (n - 1 - i) * 300;
    let drift = 0;
    if (i < 30) drift = 0.35;                  // open drive
    else if (i < 150) drift = (236 - px) * 0.05; // balance around 236
    else if (i < 165) drift = 0.9;             // fast excursion (singles)
    else drift = (238 - px) * 0.06;            // retrace into value
    const o = px;
    const c = +(o + drift + (rnd() - 0.5) * 1.1).toFixed(2);
    const h = +(Math.max(o, c) + rnd() * 0.6).toFixed(2);
    const l = +(Math.min(o, c) - rnd() * 0.6).toFixed(2);
    const v = Math.round(20000 + rnd() * 40000 + (i > 150 && i < 165 ? 60000 : 0));
    out.push({ time: t, open: o, high: h, low: l, close: c, volume: v });
    px = c;
  }
  return out;
}

// FIXTURE BARS — THREE RTH SESSIONS, deterministic, harness-injected. NOT
// market data. Day 1 balances ~230; day 2 builds value higher ~236; day 3
// trades back down through day 2's value and stops above day 1's.
export function fixtureDays() {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = [];
  const centres = [230, 236, 233.2];
  let px = 229.5;
  for (let d = 0; d < 3; d++) {
    const open = Math.floor(Date.UTC(2026, 8, 21 + d, 13, 30) / 1000);
    for (let i = 0; i < 78; i++) {
      const t = open + i * 300;
      const drift = (centres[d] - px) * 0.08;
      const o = px;
      const c = +(o + drift + (rnd() - 0.5) * 0.9).toFixed(2);
      const h = +(Math.max(o, c) + rnd() * 0.5).toFixed(2);
      const l = +(Math.min(o, c) - rnd() * 0.5).toFixed(2);
      out.push({ time: t, open: o, high: h, low: l, close: c, volume: Math.round(15000 + rnd() * 30000) });
      px = c;
    }
  }
  return out;
}

// The same three sessions, re-timed so the newest bar is the current 5m bar.
// FIXTURE — harness-injected, NOT market data. Only the clock is moved.
export function fixtureDaysNow() {
  const src = fixtureDays();
  const nowBar = Math.floor(Date.now() / 1000 / 300) * 300;
  const shift = nowBar - src[src.length - 1].time;
  return src.map(b => ({ ...b, time: b.time + shift }));
}
