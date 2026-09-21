const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = hex => { const [r, g, b] = hex.replace("#", "").match(/../g).map(h => parseInt(h, 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// The SECOND owner (tailwind.config.ts `wm` scale)
const twSurf = { black: "#000000", dark: "#0A0A0A", surface: "#111111", card: "#161616", border: "#222222", muted: "#2D3748" };
const twText = { text: "#E8EDF3", "text-muted": "#8B95A5", "text-dim": "#5A6575" };

// Candidate replacements for `text-dim`, drawn from the CANONICAL owner
const cand = { "WM.text.muted": "#8a8271", "WM.text.body": "#c0b8a0" };

const table = (label, texts) => {
  console.log(`\n${label}`);
  console.log("             " + Object.keys(twSurf).map(s => s.padStart(9)).join(""));
  for (const [t, th] of Object.entries(texts)) {
    console.log(t.padEnd(13) + Object.values(twSurf).map(sh => ratio(th, sh).toFixed(2).padStart(9)).join(""));
  }
};

table("TAILWIND `wm` TEXT RAMP — as shipped", twText);
table("CANDIDATES from the canonical owner", cand);

console.log("\nAA 4.5 pass/fail for text-dim as shipped:");
for (const [s, sh] of Object.entries(twSurf)) {
  const r = ratio(twText["text-dim"], sh);
  console.log(`  bg-wm-${s.padEnd(8)} ${r.toFixed(2)}  ${r >= 4.5 ? "pass" : r >= 3 ? "FAILS AA (non-text only)" : "FAILS EVEN 3:1"}`);
}

console.log("\nAA 4.5 pass/fail for WM.text.muted on the same surfaces:");
for (const [s, sh] of Object.entries(twSurf)) {
  const r = ratio(cand["WM.text.muted"], sh);
  console.log(`  bg-wm-${s.padEnd(8)} ${r.toFixed(2)}  ${r >= 4.5 ? "pass" : r >= 3 ? "FAILS AA" : "FAILS EVEN 3:1"}`);
}
