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
 * Rules NOT enforced (intentionally):
 *  - Retired candidates (env.example rows not referenced by code) —
 *    surfaced by the CLI but not blocking; retirement is a human
 *    decision. Killing a documented env with no code ref requires
 *    reviewing rotation history.
 *  - Rename candidates — informational (Runbook seed vs code names).
 */

import { describe, it, expect } from "vitest";
// The manifest module is authored as .mjs (Node ESM CLI); Vitest's
// module resolver handles .mjs the same as .ts here.
import { buildManifest } from "./env-manifest.mjs";

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
    in_runbook_missing_code: string[];
    rename_candidates: readonly (readonly [string, string])[];
  };
}

describe("env-manifest — canon §11.10 Environment Truth Law", () => {
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

  it("entry count matches the union of scanned code refs (no phantom entries)", () => {
    const m = buildManifest() as unknown as Manifest;
    // Each entry corresponds to a distinct process.env.X name; if this
    // ever drifts, a bug in scanEnvReferences is silently double-counting.
    const uniqueNames = new Set(m.entries.map((e) => e.name));
    expect(uniqueNames.size).toBe(m.entries.length);
    expect(m.entry_count).toBe(m.entries.length);
  });
});
