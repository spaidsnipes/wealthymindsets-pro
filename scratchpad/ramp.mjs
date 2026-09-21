const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = hex => { const [r, g, b] = hex.replace("#", "").match(/../g).map(h => parseInt(h, 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const text = { hero: "#ede6d3", body: "#c0b8a0", muted: "#8a8271", dim: "#55503f" };
const surf = { deepest: "#050506", deep: "#0b0b0d", mid: "#131317", raised: "#1c1c22", highest: "#26262d" };

console.log("CANONICAL RAMP — text × surface\n");
console.log("           " + Object.keys(surf).map(s => s.padStart(8)).join(""));
for (const [t, th] of Object.entries(text)) {
  console.log(t.padEnd(11) + Object.values(surf).map(sh => ratio(th, sh).toFixed(2).padStart(8)).join(""));
}

console.log("\nworst surface is `highest` (#26262d). AA 4.5 needs:");
for (const [t, th] of Object.entries(text)) {
  const r = ratio(th, surf.highest);
  console.log(`  ${t.padEnd(6)} ${r.toFixed(2)}  ${r >= 4.5 ? "AA pass" : r >= 3 ? "large-text/non-text only (3:1)" : "FAILS EVEN 3:1"}`);
}

// What would dim need to be to clear 4.5 on `highest`? And is it still distinct from muted?
const target = L(surf.highest) * 0 + 0; // solve: (Lt+0.05)/(Ls+0.05) = 4.5
const Ls = L(surf.highest);
const needL = 4.5 * (Ls + 0.05) - 0.05;
console.log(`\ndim would need relative luminance >= ${needL.toFixed(4)}`);
console.log(`muted  luminance = ${L(text.muted).toFixed(4)}`);
console.log(`dim    luminance = ${L(text.dim).toFixed(4)}`);
console.log(`=> a compliant dim must be at/above ${(needL / L(text.muted) * 100).toFixed(0)}% of muted's luminance`);
