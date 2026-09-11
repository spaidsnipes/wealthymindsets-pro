#!/usr/bin/env node
/**
 * WM Pro — GHOST HOST RETIREMENT RECEIPT.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * On 2026-09-11, commit f3db244 on main carried four status writers:
 *
 *   Workers Builds: wealthymindsets-pro     cloudflare-workers-and-pages  SUCCESS
 *   typecheck · sentinels · build           github-actions                SUCCESS
 *   Vercel – wealthymindsets-pro            (retired host)                FAILURE
 *   Vercel – project-6bui2                  (retired host)                FAILURE
 *
 * Every gate that WM actually runs on passed. GitHub's rolled-up
 * `commits/<sha>/status.state` was nevertheless `failure`, because a rolled-up
 * state is the WORST of its members and two of the members belong to a host
 * that has not served WM Pro since 2026-08-24.
 *
 * That is FALSE-RED. It is more corrosive than a plain outage, because it
 * inverts the meaning of the one signal a human glances at. A red dot that
 * means nothing teaches people to ignore red dots — and the next red dot will
 * be real. It also makes main-branch protection unusable: a required-checks
 * rule reading the rolled-up state would block every merge forever, for a
 * reason nobody could fix from inside the repository.
 *
 * ── Why the repo-local compost was not enough ────────────────────────────────
 *
 * WM's SOURCE is already clean. There is no vercel.json, no `@vercel/*`
 * dependency, no `process.env.VERCEL*` read, no `x-vercel-ip-*` header read;
 * `.vercel` is gitignored; `hostNeutrality.test.ts` fails if any of that comes
 * back. All of it passes, and NONE of it can see this defect — because the
 * ghost does not live in the source. It lives in a GitHub App installation
 * owned outside the repository, and it writes against WM commits whether or
 * not WM mentions Vercel anywhere.
 *
 * A retirement that only deletes the code it can reach is a retirement that
 * reports itself complete while the retired thing is still talking.
 *
 * ── What this script is ──────────────────────────────────────────────────────
 *
 * The executable half of Garden G12 (RETIREMENT / COMPOST) for host status
 * writers. It asks GitHub who is currently writing status against a WM commit
 * and separates CURRENT writers from RETIRED ones, so the answer is evidence
 * rather than recollection.
 *
 * It is deliberately NOT in the secret-free Sentinel CI workflow: it needs
 * network and a GitHub token, and a Sentinel that cannot run offline is a
 * Sentinel that gets skipped. The offline half — that the repo itself carries
 * zero coupling to a retired host, and that THIS script and its npm script
 * still exist — lives in `src/lib/ops/ghostHostRetirement.test.ts` and does
 * run on every push.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   npm run receipt:ghost-host              # current origin/main
 *   npm run receipt:ghost-host -- <sha>     # a specific commit
 *
 * Exit 0 = no retired host wrote a status against that commit (GREEN EXIT).
 * Exit 1 = at least one ghost writer remains.
 * Exit 2 = the question could not be asked (no `gh`, not authenticated).
 *          UNKNOWN is not green. It exits non-zero and says so by name.
 *
 * ── Green exit criterion (OWNER/ADMIN ACTION REQUIRED) ───────────────────────
 *
 * This script cannot remove a ghost writer, and it does not pretend to. The
 * removal is an account action in the Vercel dashboard — disconnect the Git
 * integration for BOTH projects (`wealthymindsets-pro` and `project-6bui2`),
 * or uninstall the Vercel GitHub App from the repository. Then push a normal
 * commit and run this script against it. Green is: the real gates still report,
 * and zero retired writers appear.
 */

import { execFileSync } from "node:child_process";

/**
 * Hosts that may currently write status against WM Pro source.
 *
 * Matched against the GitHub App slug for check-runs. Commit *statuses* (the
 * older API, which is what Vercel uses) carry no app slug in the rolled-up
 * response, so those are matched on context instead.
 */
const CURRENT_WRITERS = new Set(["cloudflare-workers-and-pages", "github-actions"]);

/**
 * Retired hosts. Named rather than inferred: "anything not current is retired"
 * would turn a brand-new legitimate integration into a false ghost on its first
 * run, which is the same class of error this script exists to remove.
 */
const RETIRED_WRITER_RE = /vercel|netlify|heroku|render\.com|railway/i;

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function repoSlug() {
  const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const match = /github\.com[:/](.+?)(?:\.git)?$/.exec(url);
  if (!match) throw new Error(`origin is not a GitHub remote: ${url}`);
  return match[1];
}

function resolveSha(argv) {
  const explicit = argv.find(a => /^[0-9a-f]{7,40}$/i.test(a));
  if (explicit) return explicit;
  return execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim();
}

function main() {
  const argv = process.argv.slice(2);
  let slug, sha;
  try {
    slug = repoSlug();
    sha = resolveSha(argv);
  } catch (error) {
    console.error(`UNKNOWN — could not resolve repo/commit: ${error.message}`);
    process.exit(2);
  }

  let statuses, checkRuns;
  try {
    statuses = JSON.parse(gh(["api", `repos/${slug}/commits/${sha}/status`]));
    checkRuns = JSON.parse(gh(["api", `repos/${slug}/commits/${sha}/check-runs`]));
  } catch (error) {
    // The honest failure. Without an answer from GitHub this script knows
    // nothing, and knowing nothing is never the same as knowing it is clean.
    console.error("UNKNOWN — could not ask GitHub who is writing status.");
    console.error("Install and authenticate the `gh` CLI, then re-run.");
    console.error(String(error.stderr ?? error.message).trim().split("\n").slice(0, 3).join("\n"));
    process.exit(2);
  }

  const writers = [
    ...(statuses.statuses ?? []).map(s => ({
      name: s.context,
      api: "commit-status",
      state: s.state,
      url: s.target_url ?? "",
    })),
    ...(checkRuns.check_runs ?? []).map(c => ({
      name: c.name,
      api: "check-run",
      app: c.app?.slug ?? "",
      state: c.conclusion ?? c.status,
      url: c.html_url ?? "",
    })),
  ];

  const ghosts = writers.filter(w => RETIRED_WRITER_RE.test(`${w.name} ${w.app ?? ""}`));
  const current = writers.filter(w => !ghosts.includes(w));
  const unrecognised = current.filter(w => w.app && !CURRENT_WRITERS.has(w.app));

  console.log(`GHOST HOST RETIREMENT RECEIPT`);
  console.log(`repo      ${slug}`);
  console.log(`commit    ${sha}`);
  console.log(`asked at  ${new Date().toISOString()}`);
  console.log("");
  console.log(`ROLLED-UP GITHUB STATE   ${statuses.state}`);
  console.log(`  GitHub reports the WORST member, not the state of the gates WM runs.`);
  console.log("");
  console.log(`CURRENT WRITERS (${current.length})`);
  for (const w of current) console.log(`  ${String(w.state).toUpperCase().padEnd(10)} ${w.name}  [${w.app ?? w.api}]`);
  console.log("");
  console.log(`RETIRED / GHOST WRITERS (${ghosts.length})`);
  if (ghosts.length === 0) {
    console.log(`  none — no retired host wrote a status against this commit`);
  } else {
    for (const w of ghosts) console.log(`  ${String(w.state).toUpperCase().padEnd(10)} ${w.name}  [${w.app ?? w.api}]  ${w.url}`);
  }

  if (unrecognised.length > 0) {
    console.log("");
    console.log(`UNRECOGNISED WRITERS (${unrecognised.length}) — neither current nor known-retired.`);
    console.log(`  Classify each one before trusting this receipt; an unclassified writer`);
    console.log(`  is an UNKNOWN, and UNKNOWN may not be painted green by assumption.`);
    for (const w of unrecognised) console.log(`  ${String(w.state).toUpperCase().padEnd(10)} ${w.name}  [${w.app}]`);
  }

  console.log("");
  if (ghosts.length > 0) {
    console.log(`VERDICT  RED — RETIREMENT_DEBT / GHOST_HOST.`);
    console.log(`  ${ghosts.length} retired writer(s) still emit release signal against current WM source.`);
    console.log(`  Any of them failing turns the rolled-up state red regardless of WM's real gates.`);
    console.log(`  OWNER/ADMIN ACTION REQUIRED: disconnect the Git integration for each retired`);
    console.log(`  project, or uninstall its GitHub App from ${slug}. Then push a normal commit`);
    console.log(`  and re-run this receipt. Green exit is: real gates still report, zero ghosts.`);
    process.exit(1);
  }
  console.log(`VERDICT  GREEN — no retired host writes status against this commit.`);
  console.log(`  Today's green is tomorrow's baseline. Re-run after any host/integration change.`);
}

main();
