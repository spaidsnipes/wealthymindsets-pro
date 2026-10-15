#!/usr/bin/env node
/**
 * INVENTION LEDGER — generated from the repository's own census, never typed by hand
 * (Founder's Garden 19 finish-line order §1, 2026-10-15).
 *
 * Reads src/lib/canon/inventionCensus.ts (the canonical registry: id, name, family, status,
 * owner file, surface) and, optionally, a serving-receipts JSON written by a browser read
 * (`{ "<id>": { "receipt": "...", "visible": "VISIBLE|OFF_CAMERA|NO_EVENT|SILENT|NOT_READ", "proof": "path", "build": "sha" } }`),
 * and writes docs/operations/INVENTION_LEDGER.md with one row per invention and the order's
 * independently testable states. A state the repository cannot establish by itself is written
 * as exactly that (NOT READ), never as green.
 *
 *   node scripts/invention-ledger.mjs [--receipts path.json] [--out docs/operations/INVENTION_LEDGER.md]
 */
import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const OUT = flag("out", "docs/operations/INVENTION_LEDGER.md");
const RECEIPTS = flag("receipts", null);

const tmp = join(process.cwd(), ".next", "invention-ledger");
mkdirSync(tmp, { recursive: true });
const bundle = join(tmp, "census.cjs");
await build({
  entryPoints: [join(process.cwd(), "src/lib/canon/inventionCensus.ts")],
  bundle: true, platform: "node", format: "cjs", outfile: bundle, logLevel: "silent",
  alias: { "@": join(process.cwd(), "src") },
});
const { INVENTION_CENSUS } = createRequire(import.meta.url)(bundle);
const receipts = RECEIPTS && existsSync(RECEIPTS) ? JSON.parse(readFileSync(RECEIPTS, "utf8")) : {};

const surfaceWords = s => !s ? "—" : s.kind === "NONE" ? "none" : `${s.kind}${s.key ? ":" + s.key : ""}${s.part ? ":" + s.part : ""}${s.mode ? ":" + s.mode : ""}`;
const exists = p => (p ? existsSync(join(process.cwd(), p.split(":")[0])) : false);

const rows = INVENTION_CENSUS.map(e => {
  const r = receipts[e.id] ?? null;
  const registered = "YES";
  const exposed = e.surface && e.surface.kind !== "NONE" ? "YES" : "NO SURFACE";
  const ownerOnDisk = e.owner ? (exists(e.owner) ? "YES" : "MISSING FILE") : "NO OWNER";
  const built = e.status;
  const visible = r?.visible ?? "NOT READ";
  const receipt = r?.receipt ?? "—";
  const proof = r?.proof ?? "—";
  const buildSha = r?.build ?? "—";
  const complete = built === "BUILT" && exposed === "YES" && ownerOnDisk === "YES" && visible === "VISIBLE" ? "COMPLETE (serving read)" : built === "BUILT" && visible === "NOT READ" ? "BUILT · NOT READ" : visible === "NO_EVENT" ? "BUILT · NO CURRENT EVENT (read)" : built;
  return `| ${e.id} | ${e.name.replace(/\|/g, "/")} | ${e.family} | ${registered} | ${exposed} (${surfaceWords(e.surface)}) | ${ownerOnDisk}${e.owner ? ` \`${e.owner}\`` : ""} | ${built}${e.gap ? ` — ${e.gap}` : ""} | ${visible} | ${receipt} | ${proof} | ${buildSha} | **${complete}** |`;
});

const counts = {};
for (const e of INVENTION_CENSUS) counts[e.status] = (counts[e.status] ?? 0) + 1;
const read = Object.keys(receipts).length;

const md = `# INVENTION LEDGER (generated)

Generated ${new Date().toISOString()} by \`scripts/invention-ledger.mjs\` from \`src/lib/canon/inventionCensus.ts\` (${INVENTION_CENSUS.length} entries: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · ")}) and ${read} serving receipt${read === 1 ? "" : "s"}.

**Law (order §0):** registered ≠ exposed ≠ built ≠ painted ≠ visible. The columns are the order's independently testable states as far as the repository and a browser read can establish them. Anything this file cannot establish is written NOT READ. "COMPLETE (serving read)" needs a VISIBLE browser read on the named build; everything else is not complete.

Columns: 1 registered in the census · 2 exposed through an interface (surface) · 3 owner file on disk · 4 build status (census) · 5 visibility on serving (browser read) · 6 the overlay receipt read · 7 proof path · 8 build read · verdict.

| ID | Invention | Family | Registered | Exposed | Owner | Built | Visible | Receipt | Proof | Build | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
writeFileSync(OUT, md);
console.log(`wrote ${OUT}: ${INVENTION_CENSUS.length} rows, ${read} receipts`);
