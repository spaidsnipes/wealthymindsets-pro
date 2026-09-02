import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const route = read("src/app/api/heatmap/route.ts");
const page = read("src/app/heatmaps/page.tsx");
const health = read("src/components/ui/DataHealth.tsx");

describe("Heat Map fidelity truth", () => {
  it("classifies unverified 1D as unknown and longer calculations as historical", () => {
    expect(route).toContain('period === "1D" ? "UNKNOWN" : "HISTORICAL"');
    expect(route).toContain('cacheHit ? "DEGRADED"');
    expect(route).toContain("cacheHit: true");
    expect(route).toContain("cacheHit: false");
    expect(route).toContain("delivery freshness and entitlement are not established");
    expect(route).toContain("Calculated from historical daily closes");
    expect(route).not.toContain('qualityState: "DELAYED"');
    expect(route).toContain("Receipt chronology only");
  });

  it("treats retained rows as degraded and never substitutes receipt age for event freshness", () => {
    expect(page).toContain('? "DEGRADED" : "UNKNOWN"');
    expect(page).toContain("Refresh failed; showing a retained browser snapshot");
    expect(page).toContain("if (!res.ok) throw new Error");
    expect(page).toContain("retainedRowsRef.current");
    expect(page).toContain("Object.keys(retainedRowsRef.current).length > 0");
    expect(page).toContain("if (Object.keys(retainedRowsRef.current).length === 0) setLoading(true)");
    expect(page).toContain("if (resolvedTf !== tf)");
    expect(page).toContain("Checking the selected timeframe; fidelity is not established yet");
    expect(page).not.toContain('setQualityState(json.qualityState ?? "DELAYED")');
    expect(page).not.toContain("freshnessMs={receivedAt");
    expect(page).toContain("receipt time only");
    expect(page).toContain("fidelityReason");
  });

  it("strengthens the shared badge with the current public vocabulary", () => {
    expect(health).toContain('import type { ContextDataState }');
    expect(health).toContain('"NEAR-LIVE"');
    expect(health).toContain("HISTORICAL:");
    expect(health).toContain("DEGRADED:");
    expect(health).toContain("UNKNOWN:");
    expect(health).toContain("type PublicQualityState = MarketQualityState | ContextDataState");
  });

  it("preserves calculation, cache, and routing owners", () => {
    expect(route).toContain("fetchMultiDay(syms, daysForPeriod(period))");
    expect(route).toContain("sourceProvenance: \"yahoo-finance-proxy\"");
    expect(page).toContain('const HM_CACHE_PREFIX = "wm_heatmap_"');
    expect(page).toContain('router.push("/charts")');
  });

  it("deduplicates provider refreshes and prevents overlapping client polls", () => {
    expect(route).toContain("const SERVER_INFLIGHT = new Map");
    expect(route).toContain("SERVER_INFLIGHT.get(key)");
    expect(route).toContain('const cacheKey = `heatmap:${period}:${syms.join(",")}`');
    expect(page).toContain("refreshTimer = setTimeout(load, refreshInterval)");
    expect(page).toContain("requestController?.abort()");
    expect(page).not.toContain("const id = setInterval(load, interval)");
  });
});
