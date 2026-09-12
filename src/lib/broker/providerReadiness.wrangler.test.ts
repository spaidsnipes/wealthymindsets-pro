import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PLATFORM_SECRETS,
  PROVIDER_REQUIREMENTS,
  workerRequiredSecretNames,
  secretsDeferredToReadiness,
} from "./providerReadiness";

/**
 * SENTINEL — the deploy manifest may not carry its own idea of what the
 * Worker needs. FAILURE CLASS: UNDECLARED_REQUIRED_BINDING.
 *
 * wrangler.jsonc shipped with no `secrets` block, so wrangler INFERRED the
 * required secret set from .dev.vars / .env / process.env — i.e. from
 * whatever the developer's laptop happened to have. Nothing in the repo
 * stated what the RUNNING Worker must carry, and nothing could check it.
 *
 * The repair is a derived mirror, not a second list. `workerRequiredSecretNames()`
 * computes the set from PROVIDER_REQUIREMENTS + PLATFORM_SECRETS; this file
 * asserts the manifest equals it exactly. Adding a provider to the registry
 * and forgetting the manifest fails HERE, by name, before deploy.
 *
 * NAMES ONLY. This test reads the manifest as text and compares NAME strings.
 * No secret value is read, asserted, or printed — the same rule the registry
 * itself obeys.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const WRANGLER_PATH = resolve(REPO_ROOT, "wrangler.jsonc");
const wranglerText = readFileSync(WRANGLER_PATH, "utf8");

/** jsonc → JSON. Block comments and trailing commas both appear in this file. */
function parseJsonc(text: string): Record<string, unknown> {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(stripped) as Record<string, unknown>;
}

const manifest = parseJsonc(wranglerText);
const declared = ((manifest.secrets as { required?: string[] } | undefined)?.required ?? []) as string[];

describe("wrangler secret declaration ↔ provider registry", () => {
  it("POSITIVE CONTROL: this test actually read wrangler.jsonc", () => {
    // Without this, a renamed or unreadable manifest would make the parse
    // yield `{}`, `declared` become `[]`, and a disagreement assertion below
    // could pass vacuously. That failure mode has shipped in this repo before.
    expect(wranglerText.length).toBeGreaterThan(500);
    expect(manifest.name).toBe("wealthymindsets-pro");
    expect(manifest.main).toBe(".open-next/worker.js");
  });

  it("declares a secrets.required block at all — wrangler must not infer it", () => {
    // An absent block is the original defect: wrangler falls back to inferring
    // the secret set from local files, so the deployed Worker's contract is
    // whatever the last developer's machine looked like.
    expect(manifest.secrets, "wrangler.jsonc has no `secrets` block").toBeDefined();
    expect(Array.isArray(declared)).toBe(true);
    expect(declared.length).toBeGreaterThan(0);
  });

  it("THE SENTINEL: the manifest equals the derived set exactly", () => {
    const derived = [...workerRequiredSecretNames()];
    // Sorted on both sides so the diff names the drifting SECRET, not an
    // ordering artefact.
    expect(
      [...declared].sort(),
      "wrangler.jsonc `secrets.required` has drifted from workerRequiredSecretNames(). " +
        "Edit the registry in providerReadiness.ts, then mirror it here.",
    ).toEqual(derived);
  });

  it("declares no name that no provider or platform secret owns", () => {
    // UNDECLARED_REQUIRED_BINDING's mirror image: an orphan in the manifest
    // means an operator is asked to install a credential nothing reads.
    const owned = new Set<string>([
      ...PROVIDER_REQUIREMENTS.flatMap((r) => [...r.required]),
      ...PLATFORM_SECRETS.map((p) => p.name),
    ]);
    for (const name of declared) {
      expect(owned.has(name), `${name} is declared to wrangler but no registry row owns it`).toBe(true);
    }
  });

  it("never declares a NEXT_PUBLIC_* name as a Worker secret", () => {
    // A public build-time var is not a secret. Declaring one here would both
    // mis-state the security posture and warn on something that is correctly
    // absent from the Worker's secret store.
    for (const name of declared) {
      expect(name.startsWith("NEXT_PUBLIC_"), `${name} is public, not a Worker secret`).toBe(false);
    }
  });

  it("contains no secret VALUE — the manifest is names only", () => {
    // The standing rule: presence/name/provider/state only, never values.
    // A value would most likely arrive as a populated `vars` entry or an
    // assignment inside the secrets block.
    expect(wranglerText).not.toMatch(/"secrets"\s*:\s*\{[^}]*"required"\s*:\s*\[[^\]]*=/);
    const vars = (manifest.vars ?? {}) as Record<string, unknown>;
    expect(Object.keys(vars), "vars must stay empty of anything credential-shaped").toEqual([]);
  });
});

describe("the deferred secrets are deferred for a stated reason", () => {
  it("every alias-bearing or alternative-group credential is excluded, with a reason", () => {
    // These are NOT oversights. wrangler's check is flat name-presence and
    // cannot express alternation, so declaring them would warn on a host that
    // is correctly configured — MEASURED: this host carries FINNHUB_KEY_ and
    // the legacy ALPACA_* pairs, and the tape runs.
    const deferred = secretsDeferredToReadiness();
    expect(deferred.length).toBeGreaterThan(0);
    for (const row of deferred) {
      expect(declared, `${row.name} must not be declared: ${row.reason}`).not.toContain(row.name);
      expect(row.reason.length).toBeGreaterThan(20);
    }
  });

  it("names the specific credentials this host is known to carry under other names", () => {
    // Regression lock on the measured reality, so a future edit that
    // "tidies up" the alias table cannot silently start warning on a
    // working host.
    const names = secretsDeferredToReadiness().map((r) => r.name);
    expect(names).toContain("FINNHUB_KEY");
    expect(names).toContain("ALPACA_KEY");
    expect(names).toContain("ALPACA_PAPER_KEY");
    expect(names).toContain("WEBULL_APP_KEY");
  });

  it("lists each deferred credential exactly once", () => {
    // WEBULL_APP_KEY is required by both webull-data and webull-broker. One
    // credential, one row — two rows would read as two separate gaps.
    const names = secretsDeferredToReadiness().map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("a deferred credential and a declared one are disjoint sets", () => {
    const deferred = new Set(secretsDeferredToReadiness().map((r) => r.name));
    for (const name of declared) expect(deferred.has(name)).toBe(false);
  });
});

describe("platform secrets — only boot-gating ones reach the manifest", () => {
  it("every gatesBoot platform secret is declared", () => {
    for (const p of PLATFORM_SECRETS) {
      if (p.gatesBoot) {
        expect(declared, `${p.name} gates boot: ${p.note}`).toContain(p.name);
      }
    }
  });

  it("no feature-scoped platform secret is declared", () => {
    // NO PARKED YELLOW LAW: a warning that fires on a deliberately
    // unconfigured optional feature is a warning nobody can clear, and a
    // warning nobody can clear is a warning nobody reads.
    for (const p of PLATFORM_SECRETS) {
      if (!p.gatesBoot) {
        expect(declared, `${p.name} is feature-scoped: ${p.note}`).not.toContain(p.name);
      }
    }
  });

  it("every platform secret carries a note explaining its blast radius", () => {
    for (const p of PLATFORM_SECRETS) {
      expect(p.note.length, `${p.name} has no note`).toBeGreaterThan(30);
    }
  });
});
