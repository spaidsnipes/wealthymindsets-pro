/**
 * The privileged Supabase key has ONE reader, and it accepts BOTH names.
 *
 * WHY THIS FILE EXISTS (2026-09-05, observed live, not hypothesised):
 *
 *   GET https://wealthymindsetspro.com/api/diagnostics/supabase
 *     -> "serviceRoleKeyPresent": false, "healthy": false
 *
 * while the operator had correctly installed the secret on the host. He had
 * followed Supabase's own current onboarding panel, which issues
 * `SUPABASE_SECRET_KEY` (the `sb_secret_` API-key system that replaced the
 * `service_role` JWT). Every reader in this codebase looked for
 * `SUPABASE_SERVICE_ROLE_KEY` — a name Supabase no longer hands out — so a
 * correctly-configured host reported itself unconfigured.
 *
 * That is the FINNHUB_KEY_ defect wearing a different name: not a missing
 * secret, a secret nobody was looking for. The publishable half of the very
 * same Supabase rename was adopted long ago (see KEY_VARS), which is what
 * makes the omission a bug rather than a policy.
 *
 * Two things are pinned here, because fixing only the first lets it return:
 *   1. BOTH names resolve.
 *   2. NOTHING reads process.env.SUPABASE_SERVICE_ROLE_KEY directly again.
 *      Eleven call sites did. A twelfth would be invisible until a user hit
 *      exactly that route, so the ban is enforced structurally, not by review.
 *
 * ── ANTI-VACUITY: a silently blind SECURITY gate is the worst case ───────────
 *
 * Half of this file is a source scan that collects offenders and asserts the
 * list is empty. That assertion is identically green when the scan LOOKED AND
 * FOUND NOTHING and when it DID NOT LOOK. For a naming gate over the PRIVILEGED
 * Supabase key — the credential that bypasses RLS — those two states are not
 * comparable: one means "no bypass of the resolver exists", the other means "a
 * twelfth direct reader could be sitting in the tree, honouring exactly one of
 * the two accepted names, and this gate will keep reporting clean until a user
 * hits that route and gets a 503 — or until a host that IS configured is told
 * it is not, and someone 'fixes' it by pasting the secret somewhere else".
 *
 * Two independent ways it goes blind, both guarded below:
 *
 *   (a) THE WALK DRIFTS. `SRC_ROOT` is `resolve(__dirname, "..")` — a relative
 *       hop that is correct only while THIS FILE sits directly in `src/lib`.
 *       Move it one directory deeper or up a level and the root becomes
 *       `src/lib/x` or the repo root: one scans a fraction of the tree, the
 *       other scans `node_modules` for minutes. Both produce a verdict nobody
 *       would question. Guarded by pinning the root's own name and landmarks
 *       and by a floor on the file count, measured rather than guessed.
 *
 *   (b) THE PATTERN GOES STALE. Detection is the literal text
 *       `process.env.<NAME>`. Two realistic drifts: the banned NAMES change
 *       (Supabase renames again, `SERVICE_KEY_VARS` grows a third entry) and
 *       the ban keeps policing the old two; or the codebase stops writing
 *       `process.env.X` at all — a typed `env()` accessor, `getEnv("…")`,
 *       destructuring `const { SUPABASE_SECRET_KEY } = process.env` — and every
 *       direct read becomes invisible to a gate that still reports clean.
 *       Guarded by DERIVING the banned patterns from the owner's own
 *       `SERVICE_KEY_VARS` table, and by requiring that `process.env.X` is
 *       still a live idiom in the scanned set.
 *
 * ── WHAT COULD NOT BE PROVEN, STATED PLAINLY ─────────────────────────────────
 *
 * There is NO repository specimen for the positive control, and none was
 * manufactured. This rule is a BAN: the forbidden text is, by construction,
 * supposed to appear in zero files. The obvious candidate specimen — the owner
 * `supabaseConfigStatus.ts` — does not contain it either, because the owner
 * reads the key INDIRECTLY (`env[name]` over `SERVICE_KEY_VARS`), which is
 * precisely why it is the owner. Planting a decoy file containing
 * `process.env.SUPABASE_SERVICE_ROLE_KEY` to give the detector something to
 * find would prove only that a file this test itself wrote can be found.
 *
 * So the control here is honest about its scope: the banned patterns are
 * matched against the forbidden FORM they describe (a matcher self-check, not a
 * repo finding), the NAMES are derived from the owner rather than retyped, and
 * the `process.env.` idiom is confirmed still live in the scanned set. What
 * remains unguarded, and is a real limit of this Sentinel: a direct read
 * expressed in a form nobody has thought of yet is invisible to a literal-text
 * scan. That is a property of source scanning, not a hole this file can close.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import {
  SERVICE_KEY_VARS,
  resolveSupabaseServiceKey,
  supabaseServiceKeySource,
  supabaseCapabilityGaps,
} from "./supabaseConfigStatus";

const SRC_ROOT = resolve(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** The owner of the key names — the one module allowed to read them. */
const OWNER = "supabaseConfigStatus.ts";

/**
 * The scanned set, resolved ONCE at module scope and read ONCE, so the
 * anti-vacuity guards and both ban rules provably judge the same bytes. Walking
 * twice would let a guard certify one set while a rule ran over another.
 */
const SCANNED: ReadonlyArray<{ rel: string; text: string }> = walk(SRC_ROOT).map((p) => ({
  rel: p.slice(SRC_ROOT.length + 1),
  text: readFileSync(p, "utf8"),
}));

/**
 * The banned patterns, DERIVED from the owner's own table rather than retyped.
 * If Supabase renames the secret a third time and `SERVICE_KEY_VARS` grows an
 * entry, the ban covers it the same day — instead of policing two dead names.
 */
const BANNED_DIRECT_READS = SERVICE_KEY_VARS.map((name) => ({
  name,
  pattern: new RegExp(`process\\.env\\.${name}`),
}));

/** The idiom the ban is expressed in. If code stops using it, the ban is blind. */
const ENV_READ_IDIOM = /process\.env\.[A-Z0-9_]+/;

/**
 * MEASURED (2026-09-19, this tree): the walk yields 704 non-test `.ts`/`.tsx`
 * files under `src`, of which 36 contain a `process.env.<NAME>` read. Floors
 * sit well below both measurements.
 */
const MIN_SCANNED_FILES = 400;
const MIN_ENV_READERS = 10;

describe("ANTI-VACUITY: this security gate actually scanned, and can still see a violation", () => {
  it("SRC_ROOT still resolves to the application source root", () => {
    // `resolve(__dirname, "..")` is only correct while this file lives in
    // src/lib. Moving it silently re-points the entire scan.
    expect(
      SRC_ROOT.split(sep).pop(),
      `SRC_ROOT resolved to ${SRC_ROOT}, which is not the app source root — this file moved and ` +
        "the privileged-key ban is now scanning the wrong tree",
    ).toBe("src");
    for (const landmark of ["lib", "app", `lib${sep}${OWNER}`]) {
      expect(
        existsSync(join(SRC_ROOT, landmark)),
        `${landmark} is missing under ${SRC_ROOT} — the scan root is wrong or the source layout ` +
          "changed, and the ban below is policing a tree that is not the app",
      ).toBe(true);
    }
  });

  it("the scan opened a substantial number of files", () => {
    expect(
      SCANNED.length,
      "the privileged-key scan walked almost nothing. Zero files scanned yields zero offenders " +
        "and an indistinguishable green — for a credential that bypasses RLS",
    ).toBeGreaterThan(MIN_SCANNED_FILES);
  });

  it("the owner module is inside the scanned set", () => {
    // The two rules below EXEMPT the owner by filename suffix. If the owner is
    // not in the walk at all, that exemption is skipping a path the scan never
    // produces — a sign the root or the layout moved under the gate.
    expect(
      SCANNED.some((f) => f.rel.endsWith(OWNER)),
      `${OWNER} is not in the scanned set, so the exemption below excludes nothing and the scan ` +
        "is looking somewhere other than the app source",
    ).toBe(true);
  });

  it("the ban is expressed in an idiom this codebase still uses", () => {
    // If `process.env.X` stops being how env is read — a typed accessor,
    // destructuring, a config module — a literal-text ban keeps reporting clean
    // while every direct read moves out of its sight.
    const readers = SCANNED.filter((f) => ENV_READ_IDIOM.test(f.text));
    expect(
      readers.length,
      "almost nothing in src reads env as `process.env.NAME` any more. The privileged-key ban " +
        "below matches that exact text, so it can no longer see a direct read at all — it would " +
        "report clean over a codebase that had moved every secret read behind a new accessor",
    ).toBeGreaterThan(MIN_ENV_READERS);
  });

  it("the ban polices the names the owner actually accepts", () => {
    // Derived, not retyped: the guard and the rules read one table.
    expect(BANNED_DIRECT_READS.length).toBe(SERVICE_KEY_VARS.length);
    expect(BANNED_DIRECT_READS.length).toBeGreaterThan(1);
    expect(SERVICE_KEY_VARS).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(SERVICE_KEY_VARS).toContain("SUPABASE_SECRET_KEY");
    const owner = SCANNED.find((f) => f.rel.endsWith(OWNER));
    expect(
      owner!.text,
      `${OWNER} no longer declares SERVICE_KEY_VARS — the ban's names are now derived from ` +
        "something other than the resolver's own table, and the two can drift apart",
    ).toContain("SERVICE_KEY_VARS = [");
  });

  it("MATCHER SELF-CHECK (no repo specimen exists, and none was faked)", () => {
    // Read the docblock: this is a BAN, so the forbidden text is supposed to
    // appear in zero files, and the owner reads the key indirectly. There is no
    // honest repository specimen to control against. What can be proven is that
    // each derived pattern still matches the forbidden FORM it describes — so a
    // rename that breaks the regex construction cannot pass unnoticed.
    for (const { name, pattern } of BANNED_DIRECT_READS) {
      expect(
        pattern.test(`const k = process.env.${name};`),
        `the ban for ${name} no longer matches a direct read of it — the pattern construction ` +
          "broke and this gate is now unable to flag the exact violation it exists to flag",
      ).toBe(true);
      expect(
        pattern.test(`const k = env["${name}"];`),
        `the ban for ${name} matches an INDIRECT read, which the owner itself uses — it would ` +
          "flag the resolver and force someone to weaken the rule",
      ).toBe(false);
    }
  });
});

const CONFIGURED = {
  NEXT_PUBLIC_SUPABASE_URL: "https://zrzaifaxecwgpfrqctkp.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
};

describe("both Supabase privileged-key names resolve", () => {
  it("accepts the legacy SUPABASE_SERVICE_ROLE_KEY", () => {
    expect(resolveSupabaseServiceKey({ SUPABASE_SERVICE_ROLE_KEY: "legacy-value" })).toBe("legacy-value");
  });

  it("accepts SUPABASE_SECRET_KEY — the name Supabase issues today", () => {
    // The exact reproduction of the live defect: this used to resolve to "".
    expect(resolveSupabaseServiceKey({ SUPABASE_SECRET_KEY: "sb_secret_value" })).toBe("sb_secret_value");
  });

  it("resolves to empty string when neither name is set", () => {
    expect(resolveSupabaseServiceKey({})).toBe("");
  });

  it("is ADDITIVE: the legacy name still wins when both are present", () => {
    // A host that works today must not change behaviour. The new name can only
    // take effect where the old one is absent — i.e. where it is already broken.
    const both = { SUPABASE_SERVICE_ROLE_KEY: "legacy", SUPABASE_SECRET_KEY: "new" };
    expect(resolveSupabaseServiceKey(both)).toBe("legacy");
    expect(supabaseServiceKeySource(both)).toBe("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("trims, so a whitespace-only secret is NOT mistaken for configured", () => {
    // A truthy string that authenticates as nothing — the failure mode
    // normalizeSupabaseKey was written for, preserved through the new reader.
    expect(resolveSupabaseServiceKey({ SUPABASE_SERVICE_ROLE_KEY: "   \n " })).toBe("");
    expect(supabaseServiceKeySource({ SUPABASE_SERVICE_ROLE_KEY: "   \n " })).toBeNull();
  });

  it("names the source variable, never the value", () => {
    const src = supabaseServiceKeySource({ SUPABASE_SECRET_KEY: "sb_secret_topsecret" });
    expect(src).toBe("SUPABASE_SECRET_KEY");
    expect(src).not.toContain("topsecret");
  });
});

describe("the capability gap clears via either name", () => {
  it("reports the gap when neither privileged name is set", () => {
    const gaps = supabaseCapabilityGaps({ ...CONFIGURED });
    expect(gaps).toHaveLength(1);
    // The operator must be told BOTH boxes are acceptable, or he fixes the
    // wrong one — which is precisely what happened on 2026-09-05.
    for (const name of SERVICE_KEY_VARS) expect(gaps[0].variable).toContain(name);
  });

  it("clears when only SUPABASE_SECRET_KEY is set", () => {
    expect(supabaseCapabilityGaps({ ...CONFIGURED, SUPABASE_SECRET_KEY: "sb_secret_v" })).toEqual([]);
  });

  it("clears when only SUPABASE_SERVICE_ROLE_KEY is set", () => {
    expect(supabaseCapabilityGaps({ ...CONFIGURED, SUPABASE_SERVICE_ROLE_KEY: "legacy" })).toEqual([]);
  });
});

describe("single owner: nothing bypasses the resolver", () => {
  // One loop over the owner's own table, so the ban covers EVERY accepted name
  // — including one added tomorrow. The second direction ("a reader that
  // honours only the NEW name is the identical bug pointed the opposite way")
  // is no longer a copied block that can be forgotten; it is an element.
  //
  // Both rules read the SAME module-level `SCANNED` set the anti-vacuity guards
  // above measured, through the SAME patterns they self-checked.
  for (const { name, pattern } of BANNED_DIRECT_READS) {
    it(`no non-test source file reads process.env.${name} directly`, () => {
      const offenders = SCANNED.filter((f) => !f.rel.endsWith(OWNER))
        .filter((f) => pattern.test(f.text))
        .map((f) => f.rel);

      // Named, not counted — the failure message must say which file to fix.
      expect(offenders).toEqual([]);
    });
  }
});
