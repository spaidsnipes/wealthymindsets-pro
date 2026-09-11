/**
 * The Sentinel for Build Order FIRST SENTINEL #1 — provider coverage must
 * DERIVE from the adapter owners, never be retyped per surface.
 *
 * THE MEASURED FAILURE (2026-09-11): two authenticated routes each carried a
 * hand-typed provider array and they disagreed. `/api/athos/market-data/
 * capabilities` asked five providers; `/api/market-data/certification` asked
 * two. Both compiled. `tsc --noEmit` exited 0. Every test passed. A route
 * file's local array has nothing to disagree WITH, which is exactly why the
 * disagreement could persist — and why longbridge, which runs a live tape lane
 * in `useWebSocket` and pushes observations into the canonical store, was
 * invisible on the data-fidelity surface.
 *
 * The expected membership below is DERIVED from the adapter source — the
 * modules that actually ship a probe — rather than typed here. A list typed in
 * a Sentinel is the same defect one layer up, and it would go stale on the day
 * a sixth provider lands, which is precisely the day it needs to speak.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { PROBED_PROVIDER_IDS } from "./providerProbeFleet";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const ADAPTER_DIR = path.join(REPO_ROOT, "src/lib/marketData/adapters");

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

/**
 * Every adapter that ships a market-data certification probe, by provider id.
 *
 * Read off the exported FUNCTION names, not the filenames: the longbridge
 * probe lives in `longbridgeTicks.ts`, so a filename rule would have missed
 * the one provider whose absence started this.
 */
function adaptersWithProbes(): string[] {
  const ids = new Set<string>();
  for (const file of fs.readdirSync(ADAPTER_DIR)) {
    if (!file.endsWith(".ts") || file.includes(".test.")) continue;
    const src = stripComments(fs.readFileSync(path.join(ADAPTER_DIR, file), "utf8"));
    for (const match of src.matchAll(
      /export\s+(?:async\s+)?function\s+(?:probe|certify)([A-Za-z]+?)MarketData\b/g,
    )) {
      ids.add(match[1].toLowerCase());
    }
  }
  return [...ids].sort();
}

describe("the probed fleet is derived, not retyped", () => {
  it("THE MEASURED FAILURE: every adapter that ships a probe is in the fleet", () => {
    const shipped = adaptersWithProbes();
    expect(shipped.length, "no probe adapters found — the scan itself has rotted").toBeGreaterThan(3);
    for (const id of shipped) {
      expect(
        PROBED_PROVIDER_IDS as readonly string[],
        `${id} ships a market-data probe but no surface asks it. An unasked provider reads ` +
          "as absent, and absent is neither RED nor UNKNOWN — it is a row the operator " +
          "never learns is missing. Add it to probeMarketDataFleet",
      ).toContain(id);
    }
  });

  it("declares no provider it cannot actually ask", () => {
    // The mirror image. A fleet naming a provider with no probe would print a
    // row nobody can substantiate, which is worse than a missing row: it looks
    // answered.
    const shipped = adaptersWithProbes();
    for (const id of PROBED_PROVIDER_IDS) {
      expect(shipped, `${id} is declared in the fleet but no adapter exports a probe for it`).toContain(id);
    }
  });
});

/** The import, not the module path — a comment naming the owner is not a call. */
const OWNER_IMPORT = 'from "@/lib/marketData/providerProbeFleet"';

const FLEET_CONSUMERS = [
  "src/app/api/market-data/certification/route.ts",
  "src/app/api/athos/market-data/capabilities/route.ts",
] as const;

describe("both provider surfaces ask the same owner", () => {
  it.each(FLEET_CONSUMERS)("%s imports the fleet owner", (rel) => {
    expect(read(rel)).toContain(OWNER_IMPORT);
  });

  it.each(FLEET_CONSUMERS)("%s no longer hand-wires probes itself", (rel) => {
    const src = stripComments(read(rel));
    // Prose above these routes is allowed to quote the history it removed —
    // that is what the comments are FOR — so only executable text is judged.
    // Same trap `symbolAssetClass.test.ts` fell into earlier this shift.
    expect(src).not.toMatch(/probeMoomooMarketData\s*\(/);
    expect(src).not.toMatch(/probeWebullMarketData\s*\(/);
    expect(src).not.toMatch(/MOOMOO_BRIDGE_TOKEN/);
    expect(src).not.toMatch(/WEBULL_CANARY_SYMBOL/);
  });

  it("keeps each surface's own VIEW, which is not the duplication", () => {
    // Deliberate, because the tempting next edit is to "finish the job" by
    // collapsing these two routes into one. They answer different questions —
    // a fleet fidelity roll-up and a per-capability resolution matrix — off the
    // same membership. Shared MEMBERSHIP was the fact with no owner; shared
    // PRESENTATION was never the defect and merging it would delete a view
    // somebody needs.
    expect(stripComments(read(FLEET_CONSUMERS[0]))).toContain("aggregateSourceCertifications(");
    expect(stripComments(read(FLEET_CONSUMERS[1]))).toContain("buildAthosCapabilityMatrix(");
  });
});
