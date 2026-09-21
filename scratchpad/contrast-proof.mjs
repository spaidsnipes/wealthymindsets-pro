// Before/after contrast for the structural-neutral reconciliation map.
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = hex => {
  const [r, g, b] = hex.replace("#", "").match(/../g).map(h => parseInt(h, 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// text token: [old, new]
const TEXT = {
  "wm-text": ["#E8EDF3", "#ede6d3"],
  "wm-text-muted": ["#8B95A5", "#8a8271"],
  "wm-text-dim": ["#5A6575", "#55503f"],
  "wm-gold": ["#F0B429", "#d4af37"],
};
// surface token: [old, new] — the backgrounds text actually sits on
const SURF = {
  "wm-black": ["#000000", "#050506"],
  "wm-dark": ["#0A0A0A", "#0b0b0d"],
  "wm-surface": ["#111111", "#131317"],
  "wm-card": ["#161616", "#1c1c22"],
  "wm-muted": ["#2D3748", "#1c1c22"],
};

console.log("text            on surface        before   after    delta   AA(4.5)");
const rows = [];
for (const [t, [t0, t1]] of Object.entries(TEXT)) {
  for (const [s, [s0, s1]] of Object.entries(SURF)) {
    const before = ratio(t0, s0), after = ratio(t1, s1);
    rows.push({ t, s, before, after, delta: after - before });
    const flag = after >= 4.5 ? "pass" : before >= 4.5 ? "REGRESSED BELOW AA" : "(was already below)";
    console.log(
      `${t.padEnd(15)} ${s.padEnd(16)} ${before.toFixed(2).padStart(6)}  ${after.toFixed(2).padStart(6)}  ${(after - before >= 0 ? "+" : "") + (after - before).toFixed(2)}`.padEnd(60) + flag,
    );
  }
}
const newlyFailing = rows.filter(r => r.before >= 4.5 && r.after < 4.5);
const worst = rows.reduce((a, b) => (b.delta < a.delta ? b : a));
console.log("\nnewly-failing pairs:", newlyFailing.length);
console.log("largest contrast loss:", worst.t, "on", worst.s, worst.delta.toFixed(2));
console.log("border #222222 vs new brass line rgba(139,106,41,0.35) over #0b0b0d:");
// composite the translucent brass over the deep surface
const over = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
const brass = over([139, 106, 41], [11, 11, 13], 0.35);
const hex = "#" + brass.map(c => c.toString(16).padStart(2, "0")).join("");
console.log("  old border #222222 vs surface #0A0A0A ->", ratio("#222222", "#0A0A0A").toFixed(2));
console.log("  new border", hex, "vs surface #0b0b0d ->", ratio(hex, "#0b0b0d").toFixed(2));
