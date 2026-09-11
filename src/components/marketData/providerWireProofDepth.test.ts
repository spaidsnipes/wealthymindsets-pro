/**
 * Every provider the strip SHOWS must be proven as deeply as the evidence that
 * exists for it.
 *
 * ── The measured failure (2026-09-11) ───────────────────────────────────────
 *
 * `ProviderWireStrip` renders five providers in one visually uniform row and
 * proved them to two different depths:
 *
 *   moomoo      live /ticks receipt   — "a print arrived"
 *   longbridge  live /ticks receipt   — "a print arrived"
 *   webull      capability matrix     — "a credential name exists"
 *
 * `readProviderReceipt` was typed `"moomoo" | "longbridge"`, while
 * `src/app/api/market-data/webull/ticks/route.ts` had shipped the whole time.
 * Nothing was broken; nothing could be. A union typed at a call site cannot
 * notice that a sibling route directory grew.
 *
 * The harm is presentational and therefore invisible to every other gate: the
 * chips look alike, so unequal evidence reads as equal evidence. That is the
 * PROVIDER HEALTH LAW run backwards — it forbids collapsing "connected" into
 * "healthy", and a uniform row collapses "asked the wire" into "asked the
 * config". It landed hardest on webull specifically, which `capabilityRegistry`
 * records as the ONLY equity trade source with `aggressorMethod: "PROVIDER"` —
 * the single feed that can sign buy/sell, and so the one whose liveness carries
 * the most downstream weight.
 *
 * ── What this guards ────────────────────────────────────────────────────────
 *
 * Expected membership is DERIVED from the route directory — the filesystem is
 * the owner of "which providers expose a tick route". A list retyped in a
 * Sentinel would go stale on exactly the day a sixth route lands, which is the
 * day it needs to speak.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { TICK_RECEIPT_SOURCES, PROVIDER_SOURCES } from "./ProviderWireStrip";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const TICK_ROUTE_DIR = path.join(REPO_ROOT, "src/app/api/market-data");

/** Providers that actually ship an authenticated `/ticks` route, per the tree. */
function providersWithTickRoutes(): string[] {
  return fs
    .readdirSync(TICK_ROUTE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(TICK_ROUTE_DIR, entry.name, "ticks", "route.ts")))
    .map((entry) => entry.name)
    .sort();
}

describe("provider proof depth is uniform where the evidence is", () => {
  it("THE MEASURED FAILURE: every shipped tick route is actually asked", () => {
    const shipped = providersWithTickRoutes();
    expect(shipped.length, "no tick routes found — the scan itself has rotted").toBeGreaterThan(2);
    for (const provider of shipped) {
      expect(
        TICK_RECEIPT_SOURCES as readonly string[],
        `/api/market-data/${provider}/ticks ships, but the provider strip never asks it. ` +
          "That provider's chip then reports config plausibility beside chips reporting live " +
          "prints, in the same uniform row, with nothing on screen distinguishing the two",
      ).toContain(provider);
    }
  });

  it("asks for no receipt it has no route to ask", () => {
    // The mirror. A strip fetching a route that does not exist would render a
    // permanent failure chip attributable to nothing.
    const shipped = providersWithTickRoutes();
    for (const provider of TICK_RECEIPT_SOURCES) {
      expect(shipped, `the strip asks ${provider} for a tick receipt but no such route ships`).toContain(provider);
    }
  });

  it("every receipt-proven provider is also a provider the strip displays", () => {
    // A receipt fetched and never rendered is a request the founder pays for
    // and never sees — work that looks like proof and reaches no one.
    for (const provider of TICK_RECEIPT_SOURCES) {
      expect(PROVIDER_SOURCES as readonly string[]).toContain(provider);
    }
  });

  it("records which displayed providers are matrix-only, and why", () => {
    // NOT a gap: alpaca and tastytrade have no `/ticks` route to ask, so the
    // capability matrix plus the readiness override IS their deepest available
    // evidence. Asserted rather than assumed, so that if either ever gains a
    // tick route this test fails and forces the question instead of leaving
    // them quietly shallower than their neighbours forever.
    const matrixOnly = (PROVIDER_SOURCES as readonly string[]).filter(
      (source) => !(TICK_RECEIPT_SOURCES as readonly string[]).includes(source),
    );
    expect(matrixOnly.sort()).toEqual(["alpaca", "tastytrade"]);
  });
});

describe("the webull receipt is wired end to end", () => {
  it("the route publishes a classified receipt, not just a raw snapshot", () => {
    const src = stripComments(
      fs.readFileSync(path.join(REPO_ROOT, "src/app/api/market-data/webull/ticks/route.ts"), "utf8"),
    );
    expect(src).toContain("classifyWebullTickSnapshot");
  });

  it("the strip reads the webull receipt rather than deriving it from the matrix", () => {
    const src = stripComments(
      fs.readFileSync(path.join(REPO_ROOT, "src/components/marketData/ProviderWireStrip.tsx"), "utf8"),
    );
    expect(src).toMatch(/readProviderReceipt\("webull"\)/);
    expect(src).toContain("webullTickWireView(");
  });
});
