#!/usr/bin/env node
/**
 * WM Pro — Environment Manifest Program (SHIFT-K K-Bkt 5B).
 *
 * Canon anchors:
 *  - ATH/WOW Hosting Independence & Platform Transfer Runbook §A3
 *    (ENV_NAME / CANONICAL_OR_ALIAS / REQUIRED / SECRET_OR_PUBLISHABLE /
 *     SERVICE / PURPOSE / PRODUCTION / PREVIEW / DEVELOPMENT /
 *     ROTATION_OWNER / CLOUDFLARE_DESTINATION / NOTES)
 *  - ATH/WOW Hosting Independence Runbook §A4 (Secret Classification enum)
 *  - ATH_WOW_SUPER_BUILDER_CONTRACT §11.10 (Environment Truth Law)
 *
 * What this does:
 *  1. Greps every `process.env.X` in src/ (deterministic, no runtime eval).
 *  2. Emits a JSON manifest at scripts/.env-manifest.json.
 *  3. Compares code names against the Runbook seed list and surfaces
 *     discrepancies (rename candidates, missing, extra).
 *
 * How to use:
 *   node scripts/env-manifest.mjs           # write manifest + print summary
 *   node scripts/env-manifest.mjs --check   # exit 1 if drift vs .env.example
 *
 * The vitest test at scripts/env-manifest.test.ts imports this module
 * to prove the manifest matches .env.example so a new `process.env.X`
 * cannot silently land without registry entry.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = dirname(dirname(__filename));
const SRC_DIR = join(REPO_ROOT, "src");
const ENV_EXAMPLE = join(REPO_ROOT, ".env.example");
const MANIFEST_PATH = join(REPO_ROOT, "scripts", ".env-manifest.json");

const ENV_REF_RE = /process\.env\.([A-Z_][A-Z0-9_]+)/g;

/** Recursively walk src/ collecting .ts/.tsx/.js/.mjs files. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|jsx?|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Scan src/ and return { name -> string[] file paths that reference it }.
 * Excludes .test.* files so documentation of the pattern (e.g. a comment
 * "process.env.NAME") in a test does not create false-positive drift.
 * Same exclusion as src/lib/envManifest.test.ts (team's drift-lock).
 */
export function scanEnvReferences() {
  const refs = new Map();
  for (const file of walk(SRC_DIR)) {
    if (/\.test\.(ts|tsx|js|jsx)$/.test(file)) continue;
    const body = readFileSync(file, "utf8");
    let m;
    while ((m = ENV_REF_RE.exec(body))) {
      const name = m[1];
      if (!refs.has(name)) refs.set(name, new Set());
      refs.get(name).add(relative(REPO_ROOT, file));
    }
  }
  const out = {};
  for (const [k, v] of [...refs.entries()].sort()) {
    out[k] = [...v].sort();
  }
  return out;
}

/**
 * Classify a variable by name-only heuristic.
 * Runbook §A4 enum: PUBLIC/PUBLISHABLE, SERVER_SECRET, OAUTH_TOKEN,
 * DATABASE_SECRET, SIGNING_SECRET, SERVICE_PRIVATE.
 */
export function classify(name) {
  if (name === "NODE_ENV") return "RUNTIME_META";
  if (name.startsWith("NEXT_PUBLIC_")) return "PUBLIC_PUBLISHABLE";
  if (name === "JWT_SECRET") return "SIGNING_SECRET";
  if (name.endsWith("_REFRESH_TOKEN")) return "OAUTH_TOKEN";
  if (name === "SUPABASE_SERVICE_ROLE_KEY") return "DATABASE_SECRET";
  if (name.endsWith("_SECRET")) return "SERVER_SECRET";
  if (name.endsWith("_KEY")) return "SERVER_SECRET";
  if (name.endsWith("_ID")) return "SERVER_SECRET";
  return "SERVICE_PRIVATE";
}

/**
 * Cloudflare destination per Runbook §A5.
 * Public/publishable vars become non-secret Worker vars; secrets become
 * Worker secrets (installed via `wrangler secret put`).
 */
export function cloudflareDestination(classification) {
  if (classification === "PUBLIC_PUBLISHABLE") return "worker_var";
  if (classification === "RUNTIME_META") return "worker_var";
  return "worker_secret";
}

/**
 * Runbook §A3 seed list — names the runbook expects to see.
 * Purpose: surface rename/alias drift between the runbook and the code.
 * NOT authoritative — if runbook and code disagree, this program reports
 * the diff for reconciliation by the next shift.
 */
export const RUNBOOK_SEED_A3 = [
  "ATH_TEAM_BIGDATA_KEY",
  "TWELVE_DATA_ATH_TEAM_KEY",
  "OPEN_ROUTER_CHATBOT_ATH_TEAM_KEY",
  "ALPACA_BROKERAGE_KEY",
  "ALPACA_BROKERAGE_SECRET",
  "GEMINI_KEY",
  "GEMINI_API_KEY",
  "GEMINI_API_KEY_WMPROBOT_THREE",
  "GEMINI_API_KEY_BOT_NUMBER_TWO",
  "JWT_SECRET",
  "FINNHUB_KEY",
  "TASTYTRADE_REFRESH_TOKEN",
  "TASTYTRADE_CLIENT_ID",
  "TASTY_TRADE_CLIENT_ID",
  "TASTY_TRADE_CLIENT_SECRET",
  "WEBULL_APP_KEY",
  "WEBULL_APP_SECRET",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_USER",
  "POSTGRES_HOST",
  "POSTGRES_PASSWORD",
  "POSTGRES_DATABASE",
  "SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "NEXT_PUBLIC_LIVEKIT_URL",
  "NEXT_PUBLIC_FINNHUB_KEY",
  "NEXT_PUBLIC_POLYGON_KEY",
  "XAI_API_KEY",
  "ANTHROPIC_API_KEY",
];

/**
 * Rename candidates — variables the runbook lists under one spelling but
 * the codebase spells differently. Surface for reconciliation.
 * Format: [code_name, runbook_name].
 */
export const KNOWN_ALIAS_MAP = [
  ["ALPACA_PAPER_KEY", "ALPACA_BROKERAGE_KEY"],
  ["ALPACA_PAPER_SECRET", "ALPACA_BROKERAGE_SECRET"],
  ["ALPACA_KEY", "ALPACA_BROKERAGE_KEY"],
  ["ALPACA_SECRET", "ALPACA_BROKERAGE_SECRET"],
  ["WEBULL_CLIENT_ID", "WEBULL_APP_KEY"],
];

/**
 * Parse .env.example into { name -> true } so we can lock drift.
 */
export function parseEnvExampleNames() {
  let text;
  try {
    text = readFileSync(ENV_EXAMPLE, "utf8");
  } catch {
    return new Set();
  }
  const out = new Set();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/^\s*#.*$/, "").trim();
    if (!line) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const name = line.slice(0, eq).trim();
    if (/^[A-Z_][A-Z0-9_]+$/.test(name)) out.add(name);
  }
  return out;
}

/**
 * Build the full manifest object.
 */
export function buildManifest() {
  const refs = scanEnvReferences();
  const codeNames = Object.keys(refs);
  const envExampleNames = parseEnvExampleNames();
  const runbookSeed = new Set(RUNBOOK_SEED_A3);
  const aliasFromCode = new Map(KNOWN_ALIAS_MAP);
  const aliasToRunbook = new Set(KNOWN_ALIAS_MAP.map(([, r]) => r));

  const entries = codeNames.map((name) => {
    const classification = classify(name);
    return {
      name,
      classification,
      required: !name.startsWith("NEXT_PUBLIC_") && name !== "NODE_ENV",
      cloudflare_destination: cloudflareDestination(classification),
      service: inferService(name),
      referencing_files: refs[name],
      in_env_example: envExampleNames.has(name),
      in_runbook_seed: runbookSeed.has(name),
      runbook_alias: aliasFromCode.get(name) ?? null,
    };
  });

  // NODE_ENV is set by Node/Next itself — it does not belong in
  // .env.example and does not need to be installed on Cloudflare
  // (the Workers runtime provides it). Exempt from drift-lock.
  const FRAMEWORK_PROVIDED = new Set(["NODE_ENV"]);

  const drift = {
    in_code_missing_env_example: codeNames.filter(
      (n) => !envExampleNames.has(n) && !FRAMEWORK_PROVIDED.has(n),
    ),
    in_env_example_missing_code: [...envExampleNames].filter(
      (n) => !codeNames.includes(n),
    ),
    in_runbook_missing_code: [...runbookSeed].filter(
      (n) => !codeNames.includes(n) && !aliasToRunbook.has(n),
    ),
    rename_candidates: KNOWN_ALIAS_MAP.filter(([code]) =>
      codeNames.includes(code),
    ),
  };

  return {
    generated_by: "scripts/env-manifest.mjs",
    canon: [
      "ATH/WOW Hosting Independence Runbook §A3 (manifest schema)",
      "ATH/WOW Hosting Independence Runbook §A4 (classification enum)",
      "ATH_WOW_SUPER_BUILDER_CONTRACT §11.10 (Environment Truth Law)",
    ],
    entry_count: entries.length,
    entries,
    drift,
  };
}

/**
 * Infer service from name prefix — heuristic only. The authoritative
 * SERVICE field belongs in the human-maintained portion of the registry;
 * this is a first-pass guess so the manifest isn't empty.
 */
export function inferService(name) {
  const n = name.toUpperCase();
  if (n.startsWith("SUPABASE") || n.startsWith("NEXT_PUBLIC_SUPABASE"))
    return "supabase";
  if (n.startsWith("ALPACA")) return "alpaca";
  if (n.startsWith("TASTYTRADE") || n.startsWith("TASTY_TRADE"))
    return "tastytrade";
  if (n.startsWith("WEBULL")) return "webull";
  if (n.startsWith("FINNHUB") || n.startsWith("NEXT_PUBLIC_FINNHUB"))
    return "finnhub";
  if (n.startsWith("POLYGON") || n.startsWith("NEXT_PUBLIC_POLYGON"))
    return "polygon";
  if (n.startsWith("FMP")) return "fmp";
  if (n.startsWith("LIVEKIT") || n.startsWith("NEXT_PUBLIC_LIVEKIT"))
    return "livekit";
  if (n.startsWith("RESEND")) return "resend";
  if (n.startsWith("GEMINI")) return "gemini";
  if (n === "JWT_SECRET") return "auth";
  if (n === "NEXT_PUBLIC_APP_URL" || n === "NEXT_PUBLIC_SITE_URL")
    return "app";
  if (n === "NODE_ENV") return "runtime";
  return "unclassified";
}

function main() {
  const manifest = buildManifest();
  const checkOnly = process.argv.includes("--check");
  if (!checkOnly) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
    console.log(
      `[env-manifest] wrote ${relative(REPO_ROOT, MANIFEST_PATH)} (${manifest.entry_count} entries)`,
    );
  }
  console.log(
    `[env-manifest] code refs: ${manifest.entry_count}, env.example: ${manifest.entries.filter((e) => e.in_env_example).length}, runbook seed present: ${manifest.entries.filter((e) => e.in_runbook_seed).length}`,
  );
  if (manifest.drift.in_code_missing_env_example.length > 0) {
    console.error(
      `[env-manifest] DRIFT: code uses vars missing from .env.example: ${manifest.drift.in_code_missing_env_example.join(", ")}`,
    );
    if (checkOnly) process.exit(1);
  }
  if (manifest.drift.in_env_example_missing_code.length > 0) {
    console.warn(
      `[env-manifest] retired candidates in .env.example not referenced by code: ${manifest.drift.in_env_example_missing_code.join(", ")}`,
    );
  }
  if (manifest.drift.rename_candidates.length > 0) {
    console.warn(
      `[env-manifest] rename candidates (code → runbook seed):\n  ${manifest.drift.rename_candidates.map(([c, r]) => `${c} → ${r}`).join("\n  ")}`,
    );
  }
}

const isEntry =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? "");
if (isEntry) main();
