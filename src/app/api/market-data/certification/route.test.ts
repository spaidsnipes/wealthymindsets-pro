import { describe, it, expect } from "vitest";
import { GET } from "./route";
import type { FleetSourceCertification } from "../../../../lib/marketData/sourceCertificationRegistry";
import { DATA_CAPABILITIES } from "../../../../lib/marketData/sourceCapabilityCertification";

async function readFleet(): Promise<FleetSourceCertification> {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return (await response.json()) as FleetSourceCertification;
}

describe("/api/market-data/certification GET aggregate", () => {
  it("reports the two founder-named co-equal sources (moomoo + webull)", async () => {
    const body = await readFleet();
    const sources = body.sources.map((s) => s.source).sort();
    expect(sources).toContain("moomoo");
    expect(sources).toContain("webull");
  });

  it("every source row set is exhaustive over DATA_CAPABILITIES", async () => {
    const body = await readFleet();
    for (const s of body.sources) {
      expect(s.rows.length).toBe(DATA_CAPABILITIES.length);
      const caps = s.rows.map((r) => r.capability).sort();
      expect(caps).toEqual([...DATA_CAPABILITIES].sort());
    }
  });

  it("is HONEST with no bridge env — nothing certified, CVD UNAVAILABLE (never rounded up)", async () => {
    // In the test runtime no MOOMOO_BRIDGE_URL / WEBULL_DATA_URL is set, so the
    // truthful answer is a full zero-state. This guards against a future change
    // that accidentally fabricates a certified capability from no evidence.
    const body = await readFleet();
    expect(body.totalCertified).toBe(0);
    expect(body.anyFullyCertified).toBe(false);
    expect(body.bestCvd).toBe("UNAVAILABLE");
    for (const s of body.sources) {
      expect(s.certifiedCount).toBe(0);
      expect(s.cvd).toBe("UNAVAILABLE");
    }
  });

  it("summaries are the machine-parseable one-liners, one per source", async () => {
    const body = await readFleet();
    expect(body.summaries.length).toBe(body.sources.length);
    for (const line of body.summaries) {
      expect(line).toMatch(new RegExp(`: \\d+/${DATA_CAPABILITIES.length} certified · CVD (DIRECT|PROXY|UNAVAILABLE)$`));
    }
  });

  it("generatedAt is a valid ISO timestamp", async () => {
    const body = await readFleet();
    expect(body.generatedAt).toBe(new Date(body.generatedAt).toISOString());
  });

  it("never leaks the bridge token / bearer secret into the response", async () => {
    const body = await readFleet();
    const raw = JSON.stringify(body).toLowerCase();
    expect(raw).not.toContain("bearer ");
    expect(raw).not.toContain("authorization");
    expect(raw).not.toContain("moomoo_bridge_token");
  });
});
