/**
 * FORBIDDEN OPPOSITE — THERE IS NO PROFILES ROOM.
 *
 * P-110 stamps "DEMOLISH PROFILES ROOM" across its plate, and the Manifestation
 * Map rules: profiles decorate the SAME Market Canvas; no Profiles app, no
 * disconnected histogram page. Every profile species this repo owns is a row
 * in the one Profiles door on /charts and paints on that camera.
 *
 * This sentinel fails the moment a route directory for a profile species
 * appears under src/app. (`src/app/profile` — singular — is the account
 * setup page and is not a market surface; it is named here so the exclusion
 * is a decision, not an accident.)
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { selectProfileMenu } from "./selectProfileMenu";

const APP = join(process.cwd(), "src/app");
const ACCOUNT_PAGE = "profile";

function routeDirs(dir: string, depth = 0): string[] {
  if (depth > 4) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (!statSync(abs).isDirectory()) continue;
    out.push(abs.slice(APP.length + 1));
    out.push(...routeDirs(abs, depth + 1));
  }
  return out;
}

const FORBIDDEN = /(^|\/|[-_])(profiles|tpo|market-?profile|volume-?profile|value-?migration|profile-?dna|structure-?profile|living-?profile)($|\/|[-_])/i;

describe("no Profiles room", () => {
  it("no route directory exists for any profile species", () => {
    const all = routeDirs(APP);
    // VACUITY GUARD: an empty scan must fail, not pass. /charts and the
    // singular account page must be among what was scanned.
    expect(all.length).toBeGreaterThan(10);
    expect(all).toContain("charts");
    expect(all).toContain(ACCOUNT_PAGE);
    const offenders = all
      .filter(r => r !== ACCOUNT_PAGE && !r.startsWith(`${ACCOUNT_PAGE}/`))
      .filter(r => FORBIDDEN.test(r));
    expect(offenders, "a profile species earned a route — profiles live on /charts").toEqual([]);
  });

  it("every profile species is a row in the one Profiles door instead", () => {
    const ids = selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: {} })
      .entries.map(e => e.id);
    for (const id of ["LIVING_PROFILE", "TPO_PROFILE", "STRUCTURE_PROFILE", "PROFILE_DNA", "VALUE_MIGRATION", "FIXED_RANGE", "SESSION"]) {
      expect(ids).toContain(id);
    }
  });
});
