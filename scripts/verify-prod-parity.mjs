#!/usr/bin/env node
/**
 * DOES THE FOUNDER'S GLASS HOLD THE COMMIT I JUST PUSHED?
 *
 * `git push` proves a commit reached GitHub. It proves nothing about the host.
 * On 2026-09-12 three commits sat on `main`, every local gate green, while
 * production had not moved in twelve days — the deploy credential had expired
 * and no part of the pipeline said so.
 *
 * This script asks production which commit it is, and compares. It reports four
 * distinct states because collapsing them is how the original failure hid:
 *
 *   MATCH      prod's server bundle is built from the local revision.
 *   DRIFT      prod answered with a DIFFERENT commit. It is behind (or ahead).
 *   UNSTAMPED  prod answered, but does not know its own commit. Nothing can be
 *              concluded — this is not a pass.
 *   UNREACHABLE the receipt could not be read at all. Also not a pass.
 *
 * Exit code is 0 only for MATCH.
 *
 * SCOPE: this compares SERVER bundles. A browser holding cached client chunks
 * is a separate question. MATCH here is necessary for a founder-visible change
 * to be live; it is not sufficient. Do not quote it as "verified on screen".
 *
 * Usage:  node scripts/verify-prod-parity.mjs [origin] [--rev <sha>]
 */

import { execFileSync } from "node:child_process";

const DEFAULT_ORIGIN = "https://wealthymindsetspro.com";

function localRevision(argv) {
  const at = argv.indexOf("--rev");
  if (at !== -1) {
    const given = argv[at + 1];
    if (!given) {
      console.error("--rev was given with no revision after it.");
      process.exit(2);
    }
    return given;
  }
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function describeLocal(sha) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%h %s", sha], { encoding: "utf8" }).trim();
  } catch {
    return sha.slice(0, 7);
  }
}

/**
 * How far behind, in commits, IF prod's revision is an ancestor of ours. Returns
 * null when the relationship is unknown — prod may be running a commit this
 * clone has never fetched, and inventing a number there would be a guess
 * wearing a receipt's clothes.
 */
function commitsAhead(prodSha, localSha) {
  try {
    const n = execFileSync("git", ["rev-list", "--count", `${prodSha}..${localSha}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Number.parseInt(n, 10);
  } catch {
    return null;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const origin = (argv[0] && !argv[0].startsWith("--") ? argv[0] : DEFAULT_ORIGIN).replace(/\/$/, "");
  const local = localRevision(argv);
  const url = `${origin}/api/build-identity`;

  let payload;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("application/json")) {
      // The exact shape of the original failure: the route did not exist, the
      // request fell through to the app shell, and a 200 came back with HTML.
      // A status code is not an answer to the question that was asked.
      console.error(`UNREACHABLE — ${url} answered ${res.status} with ${type || "no content-type"}, not JSON.`);
      console.error("  The build-identity route is not deployed on this origin.");
      process.exit(1);
    }
    payload = await res.json();
  } catch (err) {
    console.error(`UNREACHABLE — could not read ${url}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (payload.state !== "STAMPED" || typeof payload.sha !== "string") {
    console.error(`UNSTAMPED — ${origin} is running a build that does not know its own commit.`);
    console.error(`  ${payload.note ?? "(no note)"}`);
    console.error("  Nothing can be concluded about parity. This is not a pass.");
    process.exit(1);
  }

  if (payload.sha === local) {
    console.log(`MATCH — ${origin} serves ${describeLocal(local)}`);
    console.log(`  built at ${payload.builtAt ?? "(unstated)"}`);
    console.log("  Scope: server bundle only. A cached browser is a separate question.");
    process.exit(0);
  }

  const behind = commitsAhead(payload.sha, local);
  console.error(`DRIFT — ${origin} is NOT serving the local revision.`);
  console.error(`  prod : ${payload.sha} (built ${payload.builtAt ?? "unstated"})`);
  console.error(`  local: ${local} — ${describeLocal(local)}`);
  if (behind !== null && behind > 0) {
    console.error(
      behind === 1
        ? "  1 commit on this revision has not reached the host."
        : `  ${behind} commits on this revision have not reached the host.`,
    );
  } else if (behind === null) {
    console.error("  This clone cannot relate the two revisions; prod may be on a commit never fetched here.");
  }
  process.exit(1);
}

await main();
