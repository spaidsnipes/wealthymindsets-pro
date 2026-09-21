import { readFileSync } from "node:fs";
const PICKERS = ["src/components/ui/SymbolSearch.tsx","src/components/layout/MainLayout.tsx","src/components/chart/ChartToolbar.tsx"];
const re = /\{\s*sym:\s*"([^"]+)"[^}]*?(?:name|label):\s*"([^"]*)"[^}]*?cat:\s*"([A-Za-z]+)"/g;
const byBase = new Map();
for (const p of PICKERS) {
  const src = readFileSync(p, "utf8"); let m;
  while ((m = re.exec(src)) !== null) {
    if (m[3] !== "Crypto" || m[1].includes(".")) continue;
    const base = m[1].replace(/(USDT|USDC|USD)$/, "") || m[1];
    const nm = m[2].replace(/\s*\/\s*USD$/i, "").trim();
    if (!byBase.has(base)) byBase.set(base, new Map());
    byBase.get(base).set(p.split("/").pop(), nm);
  }
}
const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
let n = 0;
for (const [base, m] of [...byBase].sort()) {
  const names = [...new Set([...m.values()].map(norm))];
  if (names.length > 1) { n++; console.log(`${base.padEnd(10)} ${[...m].map(([f, v]) => `${f}="${v}"`).join("  |  ")}`); }
}
console.log(`\ncrypto bases=${byBase.size}  bases whose pickers DISAGREE on the name=${n}`);
