/**
 * SENTINEL — the Passport may not become a SECOND chooser of the profile source.
 *
 * FOUND FROM USE, on a live BTC chart: the Living Profile panel published
 * VAH 76280 / POC 76000 / VAL 75700 from 248 measured buckets while the Market
 * Object Passport in the rail beside it read *"Unresolved: location,
 * aggression, structure, profile."* Two surfaces, one instrument, one instant,
 * two answers — Canon Weakness #1.
 *
 * The repair wired a real profile dimension into the publisher. That fix
 * carries its own hazard, and this file guards it.
 *
 * Volume-at-price is the ONE reading in this product with two honest inputs:
 * the per-trade tape and a candle estimate. `buildLivingProfileSnapshot` is the
 * single chooser between them. If the publisher ever called
 * `computeProfileFromTrades` or `computeProfileFromBars` directly — or grew its
 * own `trades.length >= N` threshold — it would become a second chooser, and
 * the Passport could seal a POC the panel never drew. That is the SAME defect
 * the wire was written to close, pointing the other way, and it would ship
 * silently: both numbers would be internally defensible.
 *
 * The regression shape is a substitution at a wiring site, not a crash, so the
 * source is read literally rather than exercised.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";

function publisher(): string {
  return stripComments(
    fs.readFileSync(
      path.join(process.cwd(), "src/lib/marketData/chartMarketStatePublisher.ts"),
      "utf8",
    ),
  );
}

describe("the Passport profile dimension has exactly one source owner", () => {
  it("compiles through buildLivingProfileSnapshot, the single chooser", () => {
    const src = publisher();
    expect(src).toContain("buildLivingProfileSnapshot");
    expect(src).toContain("selectLivingProfile");
    expect(src).toMatch(/buildLivingProfileSnapshot\(\s*input\.recentTicks\s*,/);
  });

  it("NEVER reaches past the chooser into either engine", () => {
    const src = publisher();
    // Both are legitimate functions — just not this file's to call.
    expect(src).not.toContain("computeProfileFromTrades");
    expect(src).not.toContain("computeProfileFromBars");
  });

  it("passes the room's live price, so location is judged against what price IS", () => {
    const src = publisher();
    expect(src).toMatch(/livePrice:\s*input\.ticker\.price/);
  });

  it("THE DISAGREEMENT CANNOT RETURN: Profile is no longer hard-coded unresolved", () => {
    const src = publisher();
    // The old line was a bare `"Profile",` entry in the unresolved array.
    expect(src).toMatch(
      /\.\.\.\(profile\.resolution === "RESOLVED" \? \[\] : \["Profile"\]\)/,
    );
    expect(src).not.toMatch(/^\s*"Profile",\s*$/m);
  });

  it("the derived dimension actually reaches canonical state", () => {
    const src = publisher();
    // Deriving it and then not publishing it would leave the rail exactly as
    // wrong as before, with none of the symptoms of a broken wire.
    expect(src).toMatch(/dimensions:\s*\{[^}]*\bprofile\b[^}]*\}/);
  });
});
