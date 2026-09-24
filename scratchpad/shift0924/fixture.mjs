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
