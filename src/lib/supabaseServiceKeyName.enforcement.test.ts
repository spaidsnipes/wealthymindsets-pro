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
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
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
  it("no non-test source file reads process.env.SUPABASE_SERVICE_ROLE_KEY directly", () => {
    const offenders = walk(SRC_ROOT)
      .filter((p) => !p.endsWith("supabaseConfigStatus.ts"))
      .filter((p) => /process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(readFileSync(p, "utf8")))
      .map((p) => p.slice(SRC_ROOT.length + 1));

    // Named, not counted — the failure message must say which file to fix.
    expect(offenders).toEqual([]);
  });

  it("no non-test source file reads process.env.SUPABASE_SECRET_KEY directly either", () => {
    // Same ban in the other direction: a reader that honours only the NEW name
    // is the identical bug pointed the opposite way.
    const offenders = walk(SRC_ROOT)
      .filter((p) => !p.endsWith("supabaseConfigStatus.ts"))
      .filter((p) => /process\.env\.SUPABASE_SECRET_KEY/.test(readFileSync(p, "utf8")))
      .map((p) => p.slice(SRC_ROOT.length + 1));

    expect(offenders).toEqual([]);
  });
});
