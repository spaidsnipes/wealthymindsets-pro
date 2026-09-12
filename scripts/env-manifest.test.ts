/**
 * env-manifest regression — K-Bkt 5B (canon §11.10 Environment Truth Law).
 *
 * The CLI at scripts/env-manifest.mjs is the source of truth for which
 * env vars the code references and which are documented in .env.example.
 * This test enforces the invariant so a new `process.env.X` added by any
 * builder without a matching .env.example row FAILS CI here, giving
 * Sentinel a chance to review the classification and rotation owner
 * before it ships.
 *
 * Rules enforced:
 *  1. Every code reference (process.env.X) must appear in .env.example
 *     (with the framework-provided NODE_ENV exception baked into
 *     buildManifest's FRAMEWORK_PROVIDED set).
 *  2. buildManifest must run without throwing (schema stays intact).
 *  3. `drift.in_code_missing_env_example` must be empty — the canonical
 *     drift signal from the manifest itself.
 *
 *  4. No name the provider registry or the Worker manifest OWNS may ever be
 *     printed as a retirement candidate. See the account below.
 *
 * Rules NOT enforced (intentionally):
 *  - WHICH rows are retirement candidates in general — surfaced by the CLI
 *    but not blocking; retirement is a human decision, and killing a
 *    documented env requires reviewing rotation history. Rule 4 is narrower
 *    and different in kind: it does not decide retirement, it forbids the
 *    program from RECOMMENDING deletion of a credential it can be shown to
 *    be wrong about.
 *  - Rename candidates — informational (Runbook seed vs code names).
 */

import { describe, it, expect } from "vitest";
// The manifest module is authored as .mjs (Node ESM CLI); Vitest's
// module resolver handles .mjs the same as .ts here.
import { buildManifest } from "./env-manifest.mjs";
import { stripComments } from "../src/lib/sourceScan.mjs";
// The REAL owners, imported rather than re-listed. A hand-copied list of
// "important" names here would rot out of step with the registry and the
// Sentinel would quietly stop protecting whatever was added last.
import {
  PROVIDER_REQUIREMENTS,
  workerRequiredSecretNames,
} from "../src/lib/broker/providerReadiness";
import { SERVICE_KEY_VARS } from "../src/lib/supabaseConfigStatus";

interface ManifestEntry {
  name: string;
  classification: string;
  in_env_example: boolean;
}

interface Manifest {
  entry_count: number;
  entries: ManifestEntry[];
  drift: {
    in_code_missing_env_example: string[];
    in_env_example_missing_code: string[];
    in_env_example_read_indirectly: string[];
    in_runbook_missing_code: string[];
    rename_candidates: readonly (readonly [string, string])[];
  };
}

describe("env-manifest — canon §11.10 Environment Truth Law", () => {
  /**
   * POSITIVE CONTROL for the shared stripper — required of every consumer by
   * src/lib/sourceScan.ts.
   *
   * buildManifest() now scans stripped source so a comment naming a retired
   * host's variable is not reported as a variable this app reads. That fix has
   * a failure mode: a stripper that grew too greedy would blank every file,
   * the scan would find nothing, and the drift check would report a
   * permanently clean manifest — passing by seeing nothing at all. This proves
   * it deletes prose and keeps code.
   */
  it("stripComments removes commentary but preserves executable code", () => {
    const out = stripComments(
      [
        "// mentions process.env.GHOST_ONLY_IN_PROSE historically",
        "/** block prose naming process.env.ALSO_ONLY_PROSE */",
        'const k = process.env.REAL_READ;',
      ].join("\n"),
    );
    expect(out).not.toContain("GHOST_ONLY_IN_PROSE");
    expect(out).not.toContain("ALSO_ONLY_PROSE");
    expect(out).toContain("process.env.REAL_READ");
  });

  it("buildManifest returns a well-formed schema", () => {
    const m = buildManifest() as unknown as Manifest;
    expect(typeof m.entry_count).toBe("number");
    expect(Array.isArray(m.entries)).toBe(true);
    expect(m.drift).toBeDefined();
    expect(Array.isArray(m.drift.in_code_missing_env_example)).toBe(true);
  });

  it("every code process.env.X reference has a matching .env.example row (no orphan reads)", () => {
    const m = buildManifest() as unknown as Manifest;
    // Canonical drift signal — if a new process.env.X lands without a
    // .env.example entry, this array is non-empty and CI fails here.
    expect(m.drift.in_code_missing_env_example).toEqual([]);
  });

  /**
   * THE FAILURE THIS CLOSES, measured on 2026-09-12:
   *
   *   `node scripts/env-manifest.mjs --check` exited 0 while printing
   *   "retired candidates in .env.example not referenced by code:
   *    NEXT_PUBLIC_FINNHUB_KEY, SUPABASE_SERVICE_ROLE_KEY, ALPACA_KEY, ..."
   *   — 24 names, every one of them ACTIVELY READ.
   *
   * Root cause: the scanner matched only the literal spelling
   * `process.env.FOO`, and this repo's registry-driven readers reach the
   * environment by INDEX off a const table (`PROVIDER_REQUIREMENTS`,
   * `SERVICE_KEY_VARS`) or DOTTED off an injected `env` parameter. Being
   * incomplete was survivable; printing a confident deletion recommendation
   * for the Supabase service-role key was not.
   *
   * The bound asserted here is the strongest one available without a second
   * implementation: a name the PROVIDER REGISTRY owns, or one the WORKER
   * MANIFEST declares required, is by construction a credential production
   * reads. The program may say it cannot see the read. It may not say the
   * credential is dead.
   *
   * REVIVE record, measured not assumed. Three breaks were run against the
   * scanner on 2026-09-12:
   *   · removing the suppression entirely → this test FAILED by name and
   *     listed 23 of the original 24 credentials. Protected.
   *   · narrowing the pattern back to quoted literals only, dropping the
   *     injected-`env` alias channel → this test PASSED while the CLI again
   *     called the live `ALPACA_CANARY_SYMBOL` a retirement candidate. A
   *     REAL GAP, and the shape of it was informative: `owned` is built from
   *     what the registry DECLARES, and `ALPACA_CANARY_SYMBOL` was read
   *     inline in providerProbeFleet.ts:107 while its three sibling canaries
   *     (MOOMOO / WEBULL / LONGBRIDGE) were declared in their providers'
   *     `recommended` lists. The hole was in the TABLE, not in this test.
   *   · same break re-run after the `alpaca-live` row was made to declare its
   *     canary → the CLI printed no retirement-candidates line at all.
   *     CLOSED, and closed at the source: widening this Sentinel's pattern
   *     would have hidden an incomplete registry instead of completing it.
   *
   * Note what this implies about the guard's reach. It protects exactly the
   * names the registry declares, so an env var read inline by some future
   * module with no row in PROVIDER_REQUIREMENTS is still outside it. That is
   * a deliberate boundary, not an oversight: the remedy for such a name is to
   * give it an owner in the table, which is the same remedy applied here.
   */
  it("never recommends retiring a name the provider registry or Worker manifest owns", () => {
    const m = buildManifest() as unknown as Manifest;
    const owned = new Set<string>([
      ...workerRequiredSecretNames(),
      // Every channel the table can declare a name through. `recommended`
      // counts: an optional credential is still a credential this app reads,
      // and "optional" is not "dead".
      ...PROVIDER_REQUIREMENTS.flatMap((p) => [
        ...p.required,
        ...p.recommended,
        ...Object.entries(p.aliases ?? {}).flatMap(([k, v]) => [k, ...v]),
        ...(p.alternativeGroups ?? []).flat(),
      ]),
      ...SERVICE_KEY_VARS,
    ]);

    // VACUITY GUARD. If the registry ever stops exporting these, `owned`
    // becomes empty and the assertion below passes against nothing — the
    // exact shape of the bug it is here to catch.
    expect(owned.size).toBeGreaterThan(10);
    expect(owned.has("SUPABASE_SERVICE_ROLE_KEY")).toBe(true);

    const wronglyRetired = m.drift.in_env_example_missing_code.filter((n) =>
      owned.has(n),
    );
    expect(
      wronglyRetired,
      `env-manifest called these OWNED credentials retirement candidates: ${wronglyRetired.join(", ")}`,
    ).toEqual([]);
  });

  it("read-indirectly names are reported separately and never double-counted as retired", () => {
    const m = buildManifest() as unknown as Manifest;
    // The two lists partition the un-dotted .env.example rows. A name in
    // both would mean a caller reading either one alone gets a wrong answer.
    const retired = new Set(m.drift.in_env_example_missing_code);
    const overlap = m.drift.in_env_example_read_indirectly.filter((n) =>
      retired.has(n),
    );
    expect(overlap).toEqual([]);
    // Guard the guard: with an empty indirect list the above is vacuous.
    // This repo genuinely has registry-driven readers, so it must not be.
    expect(
      m.drift.in_env_example_read_indirectly.length,
    ).toBeGreaterThan(0);
  });

  it("entry count matches the union of scanned code refs (no phantom entries)", () => {
    const m = buildManifest() as unknown as Manifest;
    // Each entry corresponds to a distinct process.env.X name; if this
    // ever drifts, a bug in scanEnvReferences is silently double-counting.
    const uniqueNames = new Set(m.entries.map((e) => e.name));
    expect(uniqueNames.size).toBe(m.entries.length);
    expect(m.entry_count).toBe(m.entries.length);
  });
});
