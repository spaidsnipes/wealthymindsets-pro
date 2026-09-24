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

// SIX RTH SESSIONS ending at the current 5m bar. FIXTURE — harness-injected,
// NOT market data. Enough bars (468) for the FAR semantic depth (>= 300).
export function fixtureWeekNow() {
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const centres = [226, 229, 233, 230.5, 236, 233.2];
  const out = [];
  let px = 225.5;
  const nowBar = Math.floor(Date.now() / 1000 / 300) * 300;
  const days = centres.length;
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 78; i++) {
      const t = nowBar - ((days - 1 - d) * 86400) - (77 - i) * 300;
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

// SCENARIO FIXTURE — "exhaust": the 3-session fixture, then a 7-bar up push
// whose volume fades bar by bar, then three bars that fail to exceed its
// high. Harness-injected, NOT market data; exists to show the Exhaustion
// anatomy on the glass. The compiler and the paint are the real ones.
export function fixtureExhaustNow() {
  const src = fixtureDays();
  const nowBar = Math.floor(Date.now() / 1000 / 300) * 300;
  const tail = [];
  let px = src[src.length - 1].close;
  const vols = [62000, 58000, 51000, 30000, 22000, 16000, 12000];
  for (let k = 0; k < 7; k++) {
    const o = px, c = +(px + 0.55 + k * 0.05).toFixed(2);
    tail.push({ open: o, close: c, high: +(c + 0.12).toFixed(2), low: +(o - 0.08).toFixed(2), volume: vols[k] });
    px = c;
  }
  const top = tail[tail.length - 1].high;
  for (const [o, c] of [[px, px - 0.2], [px - 0.2, px - 0.35], [px - 0.35, px - 0.6]]) {
    tail.push({ open: +o.toFixed(2), close: +c.toFixed(2), high: +(Math.min(top - 0.05, Math.max(o, c) + 0.1)).toFixed(2), low: +(Math.min(o, c) - 0.15).toFixed(2), volume: 14000 });
  }
  const all = [...src.map(b => ({ ...b })), ...tail];
  const shift = nowBar - (src[src.length - 1].time + tail.length * 300);
  let t = src[src.length - 1].time;
  return all.map((b, i) => {
    if (i >= src.length) t += 300;
    return { ...b, time: (i < src.length ? b.time : t) + shift };
  });
}

/**
 * FIXTURE — a rising staircase (higher highs AND higher lows) that ends in an
 * exhausted up-push: structure leans UP, exhaustion leans DOWN. Built to make
 * H-401 draw; NOT market data.
 */
export function fixtureContradictNow() {
  const nowBar = Math.floor(Date.now() / 1000 / 300) * 300;
  const bars = [];
  let px = 200;
  // Six legs: up 8 bars, pull back 4 bars, each leg higher than the last. Extremes are
  // STRICT (the detector refuses equal highs/lows as pivots): a pullback bar's high sits
  // under the leg's top, a new leg's first low sits above the pullback's low.
  for (let leg = 0; leg < 6; leg++) {
    for (let k = 0; k < 8; k++) { const o = px, c = +(px + 0.45).toFixed(2); bars.push({ open: o, close: c, high: +(c + 0.1).toFixed(2), low: +(o - 0.05).toFixed(2), volume: 30000 + ((k * 7919) % 9000) }); px = c; }
    for (let k = 0; k < 4; k++) { const o = px, c = +(px - 0.4).toFixed(2); bars.push({ open: o, close: c, high: +(o + 0.05).toFixed(2), low: +(c - 0.1).toFixed(2), volume: 22000 + ((k * 6007) % 7000) }); px = c; }
  }
  // Final up-push: effort fades as it extends, then three bars fail to exceed it.
  const vols = [62000, 58000, 51000, 30000, 22000, 16000, 12000];
  for (let k = 0; k < 7; k++) { const o = px, c = +(px + 0.55 + k * 0.05).toFixed(2); bars.push({ open: o, close: c, high: +(c + 0.12).toFixed(2), low: +(o - 0.08).toFixed(2), volume: vols[k] }); px = c; }
  const top = bars[bars.length - 1].high;
  for (const [o, c] of [[px, px - 0.2], [px - 0.2, px - 0.35], [px - 0.35, px - 0.6]]) {
    bars.push({ open: +o.toFixed(2), close: +c.toFixed(2), high: +(Math.min(top - 0.05, Math.max(o, c) + 0.1)).toFixed(2), low: +(Math.min(o, c) - 0.15).toFixed(2), volume: 14000 });
  }
  // Borrow real session timestamps from the exhaustion fixture (its tail ends "now").
  const times = fixtureExhaustNow().map(b => b.time).slice(-bars.length);
  void nowBar;
  return bars.map((b, i) => ({ ...b, time: times[i] }));
}
