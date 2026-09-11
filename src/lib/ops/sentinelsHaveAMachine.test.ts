/**
 * sentinelsHaveAMachine — a guard that only runs when asked does not guard.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * On 2026-09-11 this repository held 498 test files and 5,585 tests, among them
 * every Sentinel written to enforce the Garden Pass gates — provider rights
 * review, single-owner vocabularies, front-door authority, canonical store
 * ownership. `ls -a` showed NO `.github` directory at all. No workflows, no
 * hooks, and GitHub reports zero rulesets.
 *
 * So not one of those 5,585 assertions ran anywhere except on a human's laptop,
 * when that human remembered to type `vitest`. The Sentinels were themselves
 * PARTIAL_FRUIT: code with no running consumer. Each one documented an
 * intention to enforce something, and enforced nothing. The push they were
 * written for is the tired one at 2am, and that is exactly the push they missed.
 *
 * ── Why nothing could see it ─────────────────────────────────────────────────
 *
 * ABSENCE HAS NO FILE TO TYPECHECK. A missing workflow emits no error, no
 * warning, no red mark. The suite was green precisely BECAUSE nothing ran it.
 * That is the accidentally-correct silence this codebase keeps rediscovering:
 * nothing objected, so it read as approval.
 *
 * ── What this file is ────────────────────────────────────────────────────────
 *
 * The machine, guarded by the machine. Deleting `sentinels.yml` fails here.
 * Quietly dropping the `vitest` step while leaving the file in place — the far
 * likelier drift, because it still LOOKS like CI — also fails here.
 *
 * This is deliberately circular: this test is run BY the workflow it checks.
 * Circularity is not the weakness it looks like. It means the workflow cannot
 * be hollowed out while continuing to report green, which is the realistic
 * failure. It cannot help if the workflow is deleted AND nobody runs the suite
 * again — nothing inside a repo can. That residual gap is named here rather
 * than papered over, and the only real closure is founder-side branch
 * protection marking these checks required.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const WORKFLOW = join(REPO_ROOT, ".github/workflows/sentinels.yml");

function workflow(): string {
  return readFileSync(WORKFLOW, "utf8");
}

/**
 * Judge what the workflow RUNS, not what it says about itself.
 *
 * Found by revive R, not by reading. The workflow's own header comment quotes
 * all three commands as evidence that they were observed passing — so deleting
 * the `vitest` STEP left `vitest run` sitting in the prose, the scan matched
 * the comment, and this guard reported green while CI had stopped running the
 * entire suite. The exact hollowing-out it exists to catch, and it missed it.
 *
 * Same defect as the quoted-prose trap in `repoFrontDoorAuthority.test.ts`: a
 * document that DESCRIBES a thing was mistaken for a document that DOES it.
 */
function workflowSteps(): string {
  return workflow()
    .split("\n")
    .filter(line => !/^\s*#/.test(line))
    .join("\n");
}

/**
 * The three commands proven to pass from a clean worktree with NO secrets
 * before the workflow was committed. Each must still be wired, or CI is
 * reporting on less than it claims.
 */
const REQUIRED_GATES: readonly { readonly id: string; readonly re: RegExp }[] = [
  { id: "typecheck", re: /tsc --noEmit --skipLibCheck/ },
  { id: "sentinels", re: /vitest run/ },
  { id: "production-build", re: /next build/ },
];

describe("the Sentinels run on a machine, not on someone remembering", () => {
  it("THE MEASURED FAILURE: a CI workflow exists at all", () => {
    expect(
      existsSync(WORKFLOW),
      ".github/workflows/sentinels.yml is missing. Every Sentinel in this repo is then " +
        "documentation rather than enforcement — 5,000+ assertions that run only when a human " +
        "chooses to run them, which is never the moment they are needed",
    ).toBe(true);
    expect(workflow().length, "the workflow file is empty").toBeGreaterThan(500);
  });

  it("every gate proven under CI conditions is still wired", () => {
    // The realistic drift is not deletion — it is someone removing one slow
    // step to get a merge through, leaving a file that still looks like CI and
    // still reports a green check while proving strictly less.
    const body = workflowSteps();
    const missing = REQUIRED_GATES.filter(({ re }) => !re.test(body)).map(g => g.id);
    expect(
      missing,
      "these gates were observed passing from a clean, secret-free worktree before this " +
        "workflow was committed, and are no longer wired; CI now reports a green check for " +
        "less than it did",
    ).toEqual([]);
  });

  it("the workflow actually triggers — a machine nobody starts is not a machine", () => {
    const body = workflowSteps();
    expect(body, "the workflow never runs on pushes to main").toMatch(/branches:\s*\[\s*main\s*\]/);
    expect(body, "the workflow never runs on pull requests").toMatch(/^\s*pull_request:\s*$/m);
  });

  it("RECORDED, NOT FIXED: a green check is not a deploy and not a merge block", () => {
    // Two honest limits, kept in the file so a green check is never mistaken
    // for more than it is. Both are founder-side and cannot be closed from
    // inside the repository.
    const body = workflow();
    expect(body, "the workflow must state that it does not deploy").toMatch(/does not deploy/i);
    expect(body, "the workflow must state that zero rulesets means it cannot block a merge")
      .toMatch(/zero rulesets/i);
    expect(body, "production is Cloudflare/OpenNext, and the workflow must say it is not touching it")
      .toMatch(/Cloudflare/);
  });
});
