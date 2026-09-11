/**
 * ghostHostRetirement — a retired host can still be talking after you delete
 * every line of code that mentions it.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * On 2026-09-11, commit f3db244 on main carried four status writers. The two
 * gates WM actually runs — Cloudflare Workers Builds and the GitHub Actions
 * Sentinel workflow — both reported SUCCESS. Two Vercel commit statuses,
 * `Vercel – wealthymindsets-pro` and `Vercel – project-6bui2`, reported
 * FAILURE, both pointing at vercel.com/knowledge/why-is-my-account-deployment-blocked.
 *
 * GitHub's rolled-up `commits/<sha>/status.state` is the WORST of its members.
 * So it read `failure` — on a commit where every WM gate passed, served by a
 * host WM left on 2026-08-24, failing for a billing reason on an account that
 * no longer deploys this product.
 *
 * ── Why the existing lock could not see it ───────────────────────────────────
 *
 * `hostNeutrality.test.ts` is thorough and it is GREEN. It proves there is no
 * `@vercel/*` import, no `process.env.VERCEL*` branch, no `x-vercel-*` header
 * read, and no retired-host deploy config at the repo root. All true. None of
 * it touches this.
 *
 * The ghost does not live in the source. It is a GitHub App installation owned
 * outside the repository, and it writes against WM commits whether or not WM
 * mentions Vercel anywhere at all. A source scan is the wrong instrument: you
 * cannot grep for something that is not in the tree.
 *
 * This is the same shape as `sentinelsHaveAMachine`: ABSENCE HAS NO FILE TO
 * TYPECHECK, and here, so does PRESENCE-SOMEWHERE-ELSE. Green source is not
 * green system, and the gap between them is precisely where a retirement gets
 * reported complete while the retired thing keeps speaking.
 *
 * ── What this file guards, and what it deliberately does not ─────────────────
 *
 * It does NOT re-assert what hostNeutrality already asserts. A second copy of
 * a passing check is a second opinion, and this repository has spent several
 * atoms learning what second opinions cost.
 *
 * It guards the one thing hostNeutrality structurally cannot: that the question
 * remains ASKABLE. `scripts/ghost-host-receipt.mjs` queries GitHub for who is
 * currently writing status against a WM commit and exits non-zero when a
 * retired host appears. That script needs network and a token, so it cannot
 * live in the secret-free Sentinel workflow — which makes it exactly the kind
 * of operator tool that quietly rots: nothing breaks when it is deleted,
 * nothing breaks when its npm script is renamed, and the next person to ask
 * "are the ghosts gone?" finds no way to ask and answers from memory instead.
 *
 * RECORDED, NOT FIXED: removing the ghost writers is an account action in the
 * Vercel dashboard and cannot be done from inside this repository. This file
 * does not claim otherwise. It keeps the instrument alive and keeps the
 * unfinished work named, which is the honest half available from here.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const RECEIPT = join(REPO_ROOT, "scripts/ghost-host-receipt.mjs");
const NPM_SCRIPT = "receipt:ghost-host";

function receipt(): string {
  return readFileSync(RECEIPT, "utf8");
}

function packageJson(): { scripts?: Record<string, string> } {
  return JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
}

describe("the ghost-host question stays askable", () => {
  it("THE MEASURED FAILURE: the receipt script exists", () => {
    expect(
      existsSync(RECEIPT),
      "scripts/ghost-host-receipt.mjs is missing. Without it, 'are retired hosts still " +
        "writing status against WM commits?' has no executable answer, and the next person " +
        "to ask will answer from memory — which is how f3db244 sat at a rolled-up `failure` " +
        "with every real gate green and nobody able to say why",
    ).toBe(true);
    expect(receipt().length, "the receipt script is empty").toBeGreaterThan(1000);
  });

  it("the receipt is reachable by name, not just present on disk", () => {
    // A script nobody can invoke is documentation. The npm entry is the door.
    const scripts = packageJson().scripts ?? {};
    expect(
      scripts[NPM_SCRIPT],
      `package.json has no "${NPM_SCRIPT}" script. The file may still exist, but the ` +
        "documented way to run it no longer works, and a tool with a broken front door " +
        "gets skipped rather than fixed",
    ).toBeDefined();
    expect(scripts[NPM_SCRIPT]).toContain("scripts/ghost-host-receipt.mjs");
  });

  it("it still refuses to call UNKNOWN green", () => {
    // The realistic rot is not deletion. It is someone making the script
    // "quieter" when gh is missing in a CI context — at which point it exits 0
    // on every machine that cannot ask, and reports clean precisely where it
    // knows least. Same accidentally-correct silence this codebase keeps
    // rediscovering: nothing objected, so it read as approval.
    const body = receipt();
    expect(body, "the script must exit non-zero when it cannot ask GitHub").toMatch(
      /process\.exit\(2\)/,
    );
    expect(body, "the script must exit non-zero when a ghost writer is found").toMatch(
      /process\.exit\(1\)/,
    );
  });

  it("RECORDED, NOT FIXED: the receipt carries the owner action it cannot perform", () => {
    // The removal is outside this repository. That limit stays written down in
    // the tool itself, where the person reading the RED verdict is standing —
    // not in a doc they would have to already know to look for.
    const body = receipt();
    expect(body, "the receipt must name who can actually remove a ghost writer").toMatch(
      /OWNER\/ADMIN ACTION REQUIRED/,
    );
    expect(body, "the receipt must state the green exit criterion").toMatch(/[Gg]reen exit/);
  });

  it("does not duplicate the source-side host-neutrality lock", () => {
    // Explicit, because the tempting next edit is to 'strengthen' this file by
    // copying hostNeutrality's assertions into it. Two files asserting the same
    // fact do not make the fact twice as true; they make one of them the copy
    // that gets updated and the other the one that silently disagrees.
    expect(existsSync(join(REPO_ROOT, "src/lib/hostNeutrality.test.ts"))).toBe(true);
    const body = receipt();
    expect(body, "the receipt must say why the source-side lock cannot see this").toMatch(
      /does not live in the source/i,
    );
  });
});
