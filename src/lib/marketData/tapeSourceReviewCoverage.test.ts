/**
 * tapeSourceReviewCoverage — a feed the app INGESTS must be a feed the rights
 * registry has REVIEWED.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * `capabilityRegistry` is the single owner of the question "can this source
 * carry aggressor truth, and what may we do with it?". `hasVerifiedAggressorTape`
 * is how the chart and SmartMoneyPanel ask it.
 *
 * Webull was never entered in it. Not refused — ABSENT. `MarketProviderPath`
 * had no webull member, `TAPE_SOURCE_PATHS` had no webull key, and
 * `RuntimeTapeSource` did not list it either.
 *
 * Meanwhile the runtime shipped a complete webull tape lane:
 *   · `src/app/api/market-data/webull/ticks` — a real route
 *   · `webullTicksBrowser.ts` — stamps `providerPath: "webull-openapi-ticks"`,
 *     `aggressorMethod: "PROVIDER"`, `aggressorConfidence: 1`
 *   · `electProviderTapeSource(current, "webull", ...)` — can RETURN "webull",
 *     after which `useWebSocket` calls `processTick(..., true)` and those
 *     signed ticks enter the canonical session store
 *
 * So the chart moved on webull's signed ticks while the panel two clicks away
 * reported no verified aggressor tape — because `TAPE_SOURCE_PATHS["webull"]`
 * was `undefined` and `getRuntimeTapeCapability` returned null.
 *
 * An accidentally-correct answer is not a reviewed answer. The refusal was
 * produced by a missing map key, so it would have flipped to a grant the moment
 * anyone added the key for an unrelated reason, with no review having happened.
 *
 * ── Why `tsc` could not see it ───────────────────────────────────────────────
 *
 * Two widenings, each individually reasonable:
 *   · `getRuntimeTapeCapability(source: string | null)` — widened on purpose
 *     for callers holding untyped chart state.
 *   · `CanonicalMarketEvent.providerPath: string` — not `MarketProviderPath`.
 *
 * Both sides are `string`, so the union and the elector could disagree at
 * exit 0. Third instance of the drift class behind `51d6fa3` (producer sealed
 * "LOW VOLATILITY", matcher asked for "low") and the hard-coded broker list
 * that hid `moomooAdapter`. The cure is the same every time: derive from the
 * owner rather than retyping its belief.
 *
 * This file is that derivation, from BOTH ends — the elector's real return
 * values, and the provider-path literals the shipped adapters really stamp.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  canPersistRaw,
  getRuntimeTapeCapability,
  hasVerifiedAggressorTape,
  MARKET_DATA_CAPABILITIES,
  type RuntimeTapeSource,
} from "./capabilityRegistry";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const ADAPTER_DIR = join(REPO_ROOT, "src/lib/marketData/adapters");

/** Judge the CODE, not the prose explaining it. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Every `providerPath: "…"` literal a SHIPPED adapter stamps onto an event.
 * Test files are excluded — fixtures deliberately mint unreviewed names like
 * "mystery-feed" to prove the gate fails closed, and those must not be read as
 * shipping feeds.
 */
function stampedProviderPaths(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of readdirSync(ADAPTER_DIR)) {
    if (!file.endsWith(".ts") || file.includes(".test.")) continue;
    const src = stripComments(readFileSync(join(ADAPTER_DIR, file), "utf8"));
    for (const m of src.matchAll(/providerPath:\s*"([^"]+)"/g)) {
      if (!found.has(m[1])) found.set(m[1], file);
    }
  }
  return found;
}

describe("a feed the app ingests is a feed the registry has reviewed", () => {
  it("ANTI-VACUITY: the adapter scan actually finds shipping feeds", () => {
    // If a rename or a directory move made this scan return nothing, every
    // assertion below would pass while checking literally zero feeds. That is
    // the failure mode this whole file exists to prevent, so it must not be
    // this file's own failure mode.
    const paths = stampedProviderPaths();
    expect(paths.size, "adapter providerPath scan found nothing — did the directory move?")
      .toBeGreaterThanOrEqual(4); // 6 → 4: webullTicksBrowser and moomooTicks removed 2026-10-12
    expect([...paths.keys()]).not.toContain("webull-openapi-ticks"); // the polled DELAYED lane was removed
    expect([...paths.keys()]).toContain("coinbase-client-ws");
  });

  it("every provider path a shipped adapter stamps has a registry entry", () => {
    // Derived, not listed. A new adapter fails HERE until someone records what
    // its feed can do and what rights it carries.
    for (const [path, file] of stampedProviderPaths()) {
      const reviewed = MARKET_DATA_CAPABILITIES.some(c => c.providerPath === path);
      expect(reviewed, `${file} stamps "${path}" but the rights registry has never reviewed it`)
        .toBe(true);
    }
  });

  // (The moomoo/Webull tape elector was removed with the polled broker-tick lane, 2026-10-12;
  //  the registry still reviews "webull" for the certification surface.)
  it("the webull registry entry still resolves", () => {
    expect(getRuntimeTapeCapability("webull")?.providerPath).toBe("webull-openapi-ticks");
  });

  it("rights still fail closed — reviewing a feed is not granting one", () => {
    // The entry records what the app can technically RECEIVE. It is not a legal
    // grant, and adding webull must not have smuggled one in.
    const cap = getRuntimeTapeCapability("webull")!;
    expect(cap.rights.raw).toBe("UNKNOWN");
    expect(cap.rights.redistribute).toBe("UNKNOWN");
    expect(cap.rights.commercial).toBe("UNKNOWN");
    expect(canPersistRaw(cap), "an UNKNOWN-rights feed must not be retainable")
      .toBe(false);
  });


});
