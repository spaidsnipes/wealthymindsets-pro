import { describe, expect, it } from "vitest";
import { DATA_CAPABILITIES } from "../../../../../lib/marketData/sourceCapabilityCertification";
import type { AthosCapabilityMatrix } from "../../../../../lib/marketData/canonicalCapabilityResolver";
import { GET } from "./route";

async function readMatrix(): Promise<AthosCapabilityMatrix> {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return (await response.json()) as AthosCapabilityMatrix;
}

describe("/api/athos/market-data/capabilities GET", () => {
  it("returns an exhaustive, versioned per-capability matrix", async () => {
    const matrix = await readMatrix();
    expect(matrix.schemaVersion).toBe("wm.capability-matrix.v1");
    expect(matrix.capabilities.map((row) => row.capability)).toEqual(DATA_CAPABILITIES);
  });

  it("keeps all four active-required providers inside canonical resolution", async () => {
    const matrix = await readMatrix();
    const represented = new Set(
      matrix.capabilities.flatMap((row) => [
        ...(row.provider ? [row.provider] : []),
        ...row.rejectedSources.map((source) => source.source),
      ]),
    );
    for (const source of ["moomoo", "webull", "alpaca", "tastytrade"]) {
      expect(represented.has(source)).toBe(true);
    }
  });

  it("does not infer session state from provider connectivity", async () => {
    const matrix = await readMatrix();
    expect(matrix.session.state).toBe("UNKNOWN");
    for (const row of matrix.capabilities) expect(row.session).toEqual(matrix.session);
  });

  it("fails closed without configured runtime bridges and emits complete receipts", async () => {
    const matrix = await readMatrix();
    for (const row of matrix.capabilities) {
      expect(row.provider).toBeNull();
      expect(row.status).toBe("UNAVAILABLE");
      expect(row.receipt).toEqual(expect.objectContaining({
        source: "none",
        timestamp: null,
        fidelity: "NONE",
      }));
      expect(row.receipt.reason.length).toBeGreaterThan(0);
      expect(row.receipt.fallback.used).toBe(false);
    }
  });

  it("never exposes bridge tokens or authorization material", async () => {
    const raw = JSON.stringify(await readMatrix()).toLowerCase();
    expect(raw).not.toContain("bearer ");
    expect(raw).not.toContain("authorization");
    expect(raw).not.toContain("moomoo_bridge_token");
  });
});
