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
 *  1. Greps every `process.env.X` in src/ (deterministic, no runtime eval),
 *     and separately every env-name-shaped MENTION, which is how the
 *     registry-driven readers (providerReadiness, supabaseConfigStatus) and
 *     the injectable-env readers (providerProbeFleet, alpacaCredentials)
 *     reach the environment. The second pass exists ONLY to stop this
 *     program calling a live credential "retired" — see ENV_NAME_MENTION_RE.
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
// Shared with the two vitest-side scanners. Do NOT retype the stripper here:
// three scanners each owning a private copy is how the prose-vs-code blind
// spot survived its first repair. See src/lib/sourceScan.ts for the account.
import { stripComments } from "../src/lib/sourceScan.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = dirname(dirname(__filename));
const SRC_DIR = join(REPO_ROOT, "src");
const ENV_EXAMPLE = join(REPO_ROOT, ".env.example");
const MANIFEST_PATH = join(REPO_ROOT, "scripts", ".env-manifest.json");

const ENV_REF_RE = /process\.env\.([A-Z_][A-Z0-9_]+)/g;

/**
 * Any UPPER_SNAKE token MENTIONED as a quoted literal or a property access.
 *
 * ROOT CAUSE THIS CLOSES: `ENV_REF_RE` above matches only the one spelling
 * `process.env.FOO`. This repo reads the environment through at least two
 * other channels that spelling cannot see:
 *
 *   · BY INDEX off a const table — `providerReadiness.ts` drives its reads
 *     from PROVIDER_REQUIREMENTS, and `supabaseConfigStatus.ts` from
 *     `SERVICE_KEY_VARS = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]`.
 *     The name exists only as a quoted STRING.
 *   · DOTTED OFF AN ALIAS — the injectable-env pattern
 *     (`function f(env = process.env) { ... env.ALPACA_CANARY_SYMBOL }`,
 *     `providerProbeFleet.ts`, `alpacaCredentials.ts`). The access is dotted
 *     but the receiver is a parameter, so the literal `process.env.` prefix
 *     never appears.
 *
 * Incompleteness would be survivable. The consequence was not: the CLI printed
 * 24 actively-read credentials — SUPABASE_SERVICE_ROLE_KEY and the whole
 * ALPACA and WEBULL sets among them — under "retired candidates", advice that
 * if followed deletes live credentials from the registry and takes the host
 * down. A wrong answer stated confidently is worse than the silence it
 * replaced. (The alias channel was found only by CHECKING the three survivors
 * of the first, quoted-literal-only version of this pass — two were still
 * false. A suppression list is not allowed to be believed unexamined either.)
 *
 * This pattern deliberately OVER-matches: an unrelated `SomeEnum.MAX_RETRIES`
 * counts. That asymmetry is the point. A false positive here only means a
 * genuinely dead row keeps being listed as NOT PROVEN RETIRED and a human
 * reads one extra line. A false negative means a live credential is
 * recommended for deletion. The error is pushed entirely into the harmless
 * direction, and this pass NEVER promotes a name to "referenced" — it can only
 * WITHHOLD the retirement claim. A mention is evidence of DOUBT, never of a read.
 */
// The trailing `_` in `(?:_[A-Z0-9]*)+` is not sloppiness. This host really
// carries `FINNHUB_KEY_` and `ALPACA_BROKERAGE_KEY_SECRET_` — typo'd names that
// became load-bearing, and that `alpacaCredentials.ts` reads deliberately. A
// pattern requiring a name to END in alphanumeric excluded exactly the two
// rows most likely to be "cleaned up" by someone who had not read the history.
const ENV_NAME_MENTION_RE = /(?:["'`]|\.)([A-Z][A-Z0-9]*(?:_[A-Z0-9]*)+)/g;

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
    // Scan CODE, not commentary. A comment explaining why a retired host's
    // variable must never be read is not a read of that variable.
    const body = stripComments(readFileSync(file, "utf8"));
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
 * Scan src/ for env-name-shaped MENTIONS → { name -> file paths }.
 *
 * Same exclusions as `scanEnvReferences`: test files are skipped and comments
 * are stripped through the SHARED `stripComments`, because a comment naming a
 * retired host's variable is not a read of it — and a private copy of the
 * stripper is how the prose-vs-code blind spot survived its first repair.
 *
 * Used for exactly one purpose: withholding the "retired" claim. See the
 * account above `ENV_NAME_MENTION_RE`.
 */
export function scanEnvNameMentions() {
  const refs = new Map();
  for (const file of walk(SRC_DIR)) {
    if (/\.test\.(ts|tsx|js|jsx)$/.test(file)) continue;
    const body = stripComments(readFileSync(file, "utf8"));
    let m;
    while ((m = ENV_NAME_MENTION_RE.exec(body))) {
      const name = m[1];
      if (!refs.has(name)) refs.set(name, new Set());
      refs.get(name).add(relative(REPO_ROOT, file));
    }
  }
  const out = {};
  for (const [k, v] of [...refs.entries()].sort()) out[k] = [...v].sort();
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
  const literals = scanEnvNameMentions();
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
    // PROVEN unread: absent from dotted access AND from every quoted
    // env-name literal in src/. Only these may be called retirement
    // candidates, because acting on this list DELETES a credential.
    in_env_example_missing_code: [...envExampleNames].filter(
      (n) => !codeNames.includes(n) && !literals[n],
    ),
    // NOT PROVEN retired: this scanner cannot see the read, but the name
    // appears as a literal in shipping code, so an indexed read through a
    // const table is live. Reported separately and never as "retired".
    in_env_example_read_indirectly: [...envExampleNames]
      .filter((n) => !codeNames.includes(n) && literals[n])
      .sort(),
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
    // Where the indirect evidence came from, for the human who has to judge
    // whether a row is really dead. Restricted to .env.example rows: the raw
    // literal scan over-matches by design and is not a general index.
    indirect_reference_files: Object.fromEntries(
      drift.in_env_example_read_indirectly.map((n) => [n, literals[n]]),
    ),
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
      `[env-manifest] retirement CANDIDATES — no \`process.env.X\` read and the name is not mentioned anywhere in src/. Still a HUMAN decision: this scanner does not read scripts/, wrangler.jsonc, CI or infra: ${manifest.drift.in_env_example_missing_code.join(", ")}`,
    );
  }
  if (manifest.drift.in_env_example_read_indirectly.length > 0) {
    console.warn(
      `[env-manifest] NOT retired — no \`process.env.X\` read, but the name is mentioned in shipping code, so it is reached indirectly (const table + indexed lookup, or dotted off an injected \`env\` parameter). Do NOT delete these: ${manifest.drift.in_env_example_read_indirectly.join(", ")}`,
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
