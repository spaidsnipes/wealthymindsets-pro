import { readFileSync } from "node:fs";
const PICKERS = [
  "src/components/ui/SymbolSearch.tsx",
  "src/components/layout/MainLayout.tsx",
  "src/components/chart/ChartToolbar.tsx",
];
// sym + (name|label) + cat, in any order after sym
const re = /\{\s*sym:\s*"([^"]+)"[^}]*?(?:name|label):\s*"([^"]*)"[^}]*?cat:\s*"([A-Za-z]+)"/g;
const rows = new Map();
for (const p of PICKERS) {
  const src = readFileSync(p, "utf8");
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[3] !== "Crypto") continue;
    if (m[1].includes(".")) continue;                 // venue-pinned, refused
    const base = m[1].replace(/(USDT|USDC|USD)$/, "") || m[1];
    if (!rows.has(base)) rows.set(base, m[2]);
  }
}
const list = [...rows.entries()].sort();
console.log("crypto bases offered:", list.length);
const H = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", Accept: "application/json" };
const out = [];
for (const [base, declared] of list) {
  const yf = `${base}-USD`;
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yf}?interval=1d&range=5d`, { headers: H });
    if (!r.ok) { out.push({ base, declared, yf, status: r.status, longName: null, price: null }); continue; }
    const j = await r.json();
    const m = j?.chart?.result?.[0]?.meta;
    out.push({ base, declared, yf, status: 200, longName: m?.longName ?? null, price: m?.regularMarketPrice ?? null });
  } catch (e) { out.push({ base, declared, yf, status: "ERR", longName: null, price: null }); }
  await new Promise((r) => setTimeout(r, 120));
}
const norm = (s) => (s ?? "").toUpperCase().replace(/\s*\/?\s*USD$/, "").replace(/[^A-Z0-9]/g, "");
console.log("\n=== NAME MISMATCH (label owner != number owner) ===");
let mism = 0, zero = 0, unres = 0;
for (const r of out) {
  if (r.longName == null) { unres++; continue; }
  const a = norm(r.declared), b = norm(r.longName);
  if (a && b && a !== b && !b.includes(a) && !a.includes(b)) { mism++; console.log(`  ${r.base.padEnd(9)} picker="${r.declared}"  yahoo="${r.longName}"  px=${r.price}`); }
}
console.log("\n=== PRICE IS EXACTLY ZERO (manufactured) ===");
for (const r of out) if (r.longName != null && (r.price === 0 || r.price == null)) { zero++; console.log(`  ${r.base.padEnd(9)} "${r.longName}" regularMarketPrice=${r.price}`); }
console.log("\n=== NO YAHOO TICKER ===");
for (const r of out) if (r.longName == null) console.log(`  ${r.base.padEnd(9)} "${r.declared}" status=${r.status}`);
console.log(`\nTOTALS  offered=${out.length}  nameMismatch=${mism}  zeroPrice=${zero}  unresolved=${unres}`);
