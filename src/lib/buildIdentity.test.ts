/**
 * A DEPLOY GAP MUST NOT BE ABLE TO BE SILENT.
 *
 * Two separate things have to hold, and the second is the one that would have
 * rotted quietly:
 *
 *   1. The reader turns an environment into an honest state — including the
 *      state "I do not know", which must never be dressed up as an answer.
 *   2. The BUILD SCRIPTS actually write the stamp. A perfect reader wired to a
 *      build that never sets WM_BUILD_SHA reports UNSTAMPED forever, and
 *      "prod cannot name itself" comes back wearing a receipt.
 *
 * Test 2 is a source Sentinel over package.json for exactly that reason: it is
 * the join between this module and the pipeline, and nothing else checks it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BUILD_SHA_ENV, BUILD_TIME_ENV, readBuildIdentity, shortSha } from "./buildIdentity";

const SHA = "64cbf8d0000000000000000000000000deadbeef";
const AT = "2026-09-12T20:45:00Z";

describe("a build states its commit, or states that it cannot", () => {
  it("reports the commit it was stamped with", () => {
    const id = readBuildIdentity({ [BUILD_SHA_ENV]: SHA, [BUILD_TIME_ENV]: AT });
    expect(id.state).toBe("STAMPED");
    expect(id.sha).toBe(SHA);
    expect(id.builtAt).toBe(AT);
  });

  it("says UNSTAMPED rather than guessing when the stamp is absent", () => {
    // The failure this replaces answered 200 with HTML — a success code for a
    // question never heard. Silence must be reportable as silence.
    const id = readBuildIdentity({});
    expect(id.state).toBe("UNSTAMPED");
    expect(id.sha).toBeNull();
    expect(id.note).toContain(BUILD_SHA_ENV);
  });

  it("treats an empty stamp as no stamp, not as a commit named ''", () => {
    expect(readBuildIdentity({ [BUILD_SHA_ENV]: "   " }).state).toBe("UNSTAMPED");
  });

  it("refuses a malformed stamp instead of reporting permanent false drift", () => {
    // A short hash, a tag name, or `$(git rev-parse HEAD)` left unexpanded would
    // all be COMPARED if admitted — and would disagree with every real commit
    // forever, which reads as "prod is stale" on a prod that is perfectly fine.
    for (const bad of ["64cbf8d", "v1.0.0", "$(git rev-parse HEAD)", `${SHA}0`, SHA.toUpperCase()]) {
      const id = readBuildIdentity({ [BUILD_SHA_ENV]: bad });
      expect(id.state, `${bad} was admitted as a commit hash`).toBe("UNSTAMPED");
      expect(id.sha).toBeNull();
    }
  });

  it("keeps the build time even when the commit is unknown", () => {
    // "Built at 14:02, commit unknown" is strictly more than "unknown". The two
    // facts are independent and one missing must not erase the other.
    const id = readBuildIdentity({ [BUILD_TIME_ENV]: AT });
    expect(id.state).toBe("UNSTAMPED");
    expect(id.builtAt).toBe(AT);
  });

  it("carries a reason in every state", () => {
    for (const env of [{}, { [BUILD_SHA_ENV]: SHA }, { [BUILD_SHA_ENV]: "nope" }]) {
      expect(readBuildIdentity(env).note.length).toBeGreaterThan(40);
    }
  });

  it("shortens a hash for humans without ever losing the full one", () => {
    const id = readBuildIdentity({ [BUILD_SHA_ENV]: SHA });
    expect(shortSha(id.sha)).toBe("64cbf8d");
    expect(id.sha).toBe(SHA); // the comparable value is never truncated
    expect(shortSha(null)).toBeNull();
  });
});

describe("the pipeline actually writes the stamp", () => {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };

  // Every script that PRODUCES a servable bundle. `dev` is excluded on purpose:
  // a dev server is not a deploy and has no commit to be stale against.
  const PRODUCERS = ["build", "build:cloudflare", "build:standalone"];

  it.each(PRODUCERS)("%s stamps the commit it is building", (name) => {
    const script = pkg.scripts[name];
    expect(script, `${name} is gone — did a build script get renamed?`).toBeTypeOf("string");
    expect(script, `${name} produces a bundle that cannot name its own commit`)
      .toContain(`${BUILD_SHA_ENV}=$(git rev-parse HEAD)`);
    expect(script, `${name} produces a bundle that cannot say when it was built`)
      .toContain(`${BUILD_TIME_ENV}=$(`);
  });

  it("the cloudflare deploy path goes through the stamping script, not around it", () => {
    // `deploy:cf` used to call `opennextjs-cloudflare build` DIRECTLY, which
    // bypasses every environment the npm script sets. The one command anyone
    // runs to ship must be the one command that stamps.
    expect(pkg.scripts["deploy:cf"]).toContain("npm run build:cloudflare");
    expect(pkg.scripts["deploy:cf"]).not.toMatch(/^opennextjs-cloudflare build/);
  });

  it("next.config carries the stamp from the build shell into the bundle", () => {
    // The half that a package.json check alone cannot see. MEASURED: with the
    // scripts stamping correctly and this passthrough absent, the built worker
    // contained the variable NAME and not its value, and the endpoint answered
    // UNSTAMPED on every deployed host while every test here stayed green.
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config, "the build stamp never reaches the deployed runtime").toMatch(
      new RegExp(`env:\\s*\\{[\\s\\S]{0,200}?${BUILD_SHA_ENV}:\\s*process\\.env\\.${BUILD_SHA_ENV}`),
    );
    expect(config).toContain(`${BUILD_TIME_ENV}: process.env.${BUILD_TIME_ENV}`);
  });

  it("the route reads the stamp as a literal member expression, not a lookup", () => {
    // `env` inlines by TEXTUAL replacement. `someEnv[BUILD_SHA_ENV]` is not
    // replaced and reads undefined in production — green here, UNSTAMPED there.
    const route = readFileSync(
      resolve(process.cwd(), "src/app/api/build-identity/route.ts"),
      "utf8",
    );
    expect(route).toContain(`process.env.${BUILD_SHA_ENV}`);
    expect(route).toContain(`process.env.${BUILD_TIME_ENV}`);
    expect(route, "a dynamic env lookup is not inlined and will report UNSTAMPED in prod")
      .not.toMatch(/readBuildIdentity\(\s*process\.env\b/);
  });

  it("there is a command that compares the host to this revision", () => {
    expect(pkg.scripts["verify:prod"]).toContain("verify-prod-parity");
  });
});
