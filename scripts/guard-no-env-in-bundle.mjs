#!/usr/bin/env node
/*
 * P0 2026-11-08 — NO LOCAL .env* VALUE EVER SHIPS INSIDE THE WORKER.
 *
 * `opennextjs-cloudflare build` copies the values of .env, .env.local,
 * .env.production, .env.development(.local) and .env.test(.local) into
 * .open-next/cloudflare/next-env.mjs, and that file is bundled into the Worker
 * that is uploaded to Cloudflare. A build from a checkout holding .env.local
 * (service-role, Anthropic, broker keys) would therefore publish those keys
 * inside the deployed script. Production secrets belong in Worker secrets;
 * local values belong in .dev.vars (gitignored, never bundled).
 *
 * Runs as `postbuild:cloudflare`, so `npm run build:cloudflare` and
 * `npm run deploy:cf` stop before upload when any non-public key is present.
 * Prints key NAMES only, never values.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? process.cwd();
const outDir = path.join(root, ".open-next");
const envFile = path.join(outDir, "cloudflare", "next-env.mjs");

const problems = [];

if (fs.existsSync(envFile)) {
  const src = fs.readFileSync(envFile, "utf8");
  const re = /export const (\w+) = (\{.*\});/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let obj;
    try {
      obj = JSON.parse(m[2]);
    } catch {
      problems.push(`${m[1]}: next-env.mjs is not plain JSON — refusing to ship an unreadable env block`);
      continue;
    }
    // NEXT_PUBLIC_* are inlined into client JS by design; anything else is a server value.
    const leaked = Object.keys(obj).filter((k) => !k.startsWith("NEXT_PUBLIC_"));
    if (leaked.length) problems.push(`${m[1]}: ${leaked.join(", ")}`);
  }
}

// A stray .env* must never be served as a static asset either.
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/^\.env(\.|$)|^\.dev\.vars/.test(e.name)) problems.push(`static asset ${path.relative(root, p)}`);
  }
}
walk(path.join(outDir, "assets"));

if (problems.length) {
  console.error("\n[guard-no-env-in-bundle] REFUSED: local env values would ship inside the Worker bundle:");
  for (const p of problems) console.error("  - " + p);
  console.error(
    "Move these to .dev.vars for local runs (never bundled) and to Worker secrets for production," +
      " then rebuild. Production deploys build from a clean checkout of main.\n",
  );
  process.exit(1);
}
console.log("[guard-no-env-in-bundle] ok — no .env* values in the Worker bundle");
