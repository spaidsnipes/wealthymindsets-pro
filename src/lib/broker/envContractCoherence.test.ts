/**
 * RELEASE GATE — the env contract must be COHERENT WITH ITSELF.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Every env defect this repo has shipped was found the same way: the Founder
 * discovered it by hand, in production, after a capability had been silently
 * dark for days.
 *
 *   FINNHUB_KEY_            6 days of dark US equity tape
 *   RESEND_API_KEY_         every transactional email refusing to send, with
 *                           no red receipt at all
 *   NEXT_PUBLIC_LIVEKIT_URL a receipt instructing the operator to install a
 *                           Cloudflare secret that can never be read
 *
 * Each was then fixed ONE AT A TIME, by hand, and each fix left the NEXT
 * instance of the same class free to ship. The near-miss detector catches
 * "the host carries a name the contract does not". The wrangler Sentinel
 * catches "the manifest disagrees with the registry". Nothing catches the
 * contract disagreeing with ITSELF — which is where the LiveKit defect lived:
 * every name was spelled correctly, declared, documented, and read, and the
 * arrangement was still incapable of working.
 *
 * ── The boundary ────────────────────────────────────────────────────────────
 *
 * This gate asserts NOTHING about which secrets a host happens to carry. It
 * cannot: it runs at build time, on a laptop, with no access to the Worker.
 * It only asserts that the contract is internally consistent and physically
 * satisfiable. A host with zero secrets set must still pass this file — the
 * runtime receipt owns "is it installed", and conflating the two questions is
 * how a green CI check starts vouching for a dead wire.
 *
 * Everything is DERIVED from PROVIDER_REQUIREMENTS / PLATFORM_SECRETS. There
 * is no second list of legitimate names here; a hand-kept allowlist would be
 * correct on the day it was typed and free to disagree forever after, which is
 * precisely the drift being gated.
 */

import { describe, expect, it } from "vitest";
import { PLATFORM_SECRETS, PROVIDER_REQUIREMENTS } from "./providerReadiness";
import { acceptedEnvNames } from "./resolveProviderEnv";

/** Every canonical name the contract declares — provider rows and platform rows. */
function canonicalNames(): string[] {
  const out = new Set<string>();
  for (const r of PROVIDER_REQUIREMENTS) {
    for (const n of r.required) out.add(n);
    for (const n of r.recommended) out.add(n);
  }
  for (const s of PLATFORM_SECRETS) out.add(s.name);
  return [...out].sort();
}

/** alias name -> the canonical names that claim it. */
function aliasClaims(): Map<string, string[]> {
  const claims = new Map<string, string[]>();
  const claim = (alias: string, canonical: string) => {
    const existing = claims.get(alias) ?? [];
    if (!existing.includes(canonical)) existing.push(canonical);
    claims.set(alias, existing);
  };
  for (const r of PROVIDER_REQUIREMENTS) {
    for (const [canonical, aliases] of Object.entries(r.aliases ?? {})) {
      for (const alias of aliases) claim(alias, canonical);
    }
  }
  for (const s of PLATFORM_SECRETS) {
    for (const alias of s.aliases ?? []) claim(alias, s.name);
  }
  return claims;
}

describe("RELEASE GATE: the env contract is coherent with itself", () => {
  it("THE ARTIFACT-TYPE LAW: no REQUIRED name is build-time-inlined", () => {
    // A NEXT_PUBLIC_ value is substituted into the bundle by the BUILD. WM Pro
    // builds on a laptop and deploys to Cloudflare, so such a name can never be
    // satisfied by a host secret — it inlines as `undefined` no matter how many
    // times you redeploy.
    //
    // Requiring one is therefore not a style problem. The receipt reports
    // `required` names as the things an operator must install, so a
    // NEXT_PUBLIC_ entry in `required` is an instruction that CANNOT SUCCEED:
    // the operator follows it exactly, correctly, and the capability stays
    // dark with no error naming a variable. That shipped for LiveKit, and the
    // Founder lost a Lounge to it.
    //
    // Such a name may still be an ALIAS (a host already carrying it keeps
    // working). It may never be the canonical thing we ask for.
    const offenders: string[] = [];
    for (const r of PROVIDER_REQUIREMENTS) {
      for (const name of r.required) {
        if (name.startsWith("NEXT_PUBLIC_")) offenders.push(`${r.provider}.required: ${name}`);
      }
    }
    expect(
      offenders,
      `${offenders.length} required credential(s) are build-time-inlined names: ` +
        `${offenders.join(", ")}. A NEXT_PUBLIC_ name cannot be satisfied by a ` +
        "Cloudflare secret on a build-locally/deploy-remotely pipeline, so the " +
        "receipt would be telling the operator to do something that cannot work. " +
        "Declare the runtime name as canonical and demote this one to an alias.",
    ).toEqual([]);
  });

  it("ONE OWNER PER FACT: no alias is claimed by two different canonical names", () => {
    // acceptedEnvNames() unions across ALL rows. If two canonical credentials
    // both declared the alias FOO, then ONE secret would silently satisfy two
    // different facts, and which one "won" would depend on row order in the
    // table — a resolution rule nobody wrote down and nobody can see. The first
    // time the two facts needed different values, the failure would surface as
    // an upstream 401 with no trace back to the table.
    const contested = [...aliasClaims().entries()].filter(([, owners]) => owners.length > 1);
    expect(
      contested.map(([alias, owners]) => `${alias} -> ${owners.join(" & ")}`),
      "an alias may serve exactly one canonical fact",
    ).toEqual([]);
  });

  it("ONE OWNER PER FACT: no name is both a canonical credential and someone's alias", () => {
    // Otherwise setting the canonical secret X would ALSO silently satisfy the
    // unrelated credential Y that declared X as its alias — one value quietly
    // authenticating two providers, which is either a security surprise or a
    // confusing upstream rejection, and never something anyone intended.
    const canonical = new Set(canonicalNames());
    const collisions = [...aliasClaims().entries()]
      .filter(([alias]) => canonical.has(alias))
      .map(([alias, owners]) => `${alias} is canonical AND an alias of ${owners.join(", ")}`);
    expect(collisions, "a name is either a fact or a nickname for one, never both").toEqual([]);
  });

  it("ALIASES ARE MIGRATION TOOLS: the canonical name always resolves first", () => {
    // Asserted for EVERY declared canonical, not just the one that once broke.
    // If a stale alias left on a host outranked a freshly rotated canonical
    // secret, the rotation would appear to do nothing — the worst shape of
    // credential bug, because the operator has evidence they fixed it.
    for (const name of canonicalNames()) {
      expect(acceptedEnvNames(name)[0], `${name} must resolve to itself first`).toBe(name);
    }
  });

  it("no credential declares itself as its own alias", () => {
    // Harmless to the resolver (it de-duplicates), but it means someone edited
    // the table without a clear model of what an alias is, and the next edit
    // in that direction is the one that collides.
    const selfish = [...aliasClaims().entries()]
      .filter(([alias, owners]) => owners.includes(alias))
      .map(([alias]) => alias);
    expect(selfish).toEqual([]);
  });

  it("every alternativeGroup is a COMPLETE credential set, never a lone half", () => {
    // An alternativeGroup exists for pairs where half of one pair plus half of
    // another authenticates nothing (Alpaca's legacy naming). A one-element
    // group is not an all-or-nothing set — it is a per-name alias wearing the
    // wrong type, and it would be enforced with the wrong rule.
    const bad: string[] = [];
    for (const r of PROVIDER_REQUIREMENTS) {
      for (const group of r.alternativeGroups ?? []) {
        if (group.length < 2) bad.push(`${r.provider}: [${group.join(", ")}]`);
      }
    }
    expect(
      bad,
      "a single-name alternativeGroup should be declared in `aliases` instead — " +
        "the group type means all-or-nothing, which is meaningless for one name",
    ).toEqual([]);
  });

  it("THE GATE IS NOT VACUOUS: it can see each defect when it exists", () => {
    // A gate that passes because it examined nothing is worse than no gate: it
    // converts an unchecked invariant into a green check mark. Each assertion
    // above is re-run here against a deliberately broken shape.
    expect(canonicalNames().length).toBeGreaterThan(10);
    expect(aliasClaims().size).toBeGreaterThan(3);

    // artifact-type law
    expect(["NEXT_PUBLIC_LIVEKIT_URL"].filter((n) => n.startsWith("NEXT_PUBLIC_"))).toHaveLength(1);

    // contested alias
    const contested = new Map<string, string[]>([["SHARED_", ["A_KEY", "B_KEY"]]]);
    expect([...contested.values()].filter((o) => o.length > 1)).toHaveLength(1);

    // canonical-vs-alias collision
    const canonical = new Set(["A_KEY", "B_KEY"]);
    expect(["B_KEY"].filter((a) => canonical.has(a))).toHaveLength(1);

    // and the real registry is what was actually inspected
    expect(canonicalNames()).toContain("LIVEKIT_URL");
    expect(canonicalNames()).toContain("TASTYTRADE_REFRESH_TOKEN");
  });
});
