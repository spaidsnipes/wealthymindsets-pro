import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DATA_CAPABILITIES } from "../../../../../lib/marketData/sourceCapabilityCertification";
import type { AthosCapabilityMatrix } from "../../../../../lib/marketData/canonicalCapabilityResolver";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getTastytradeCapabilities: vi.fn(),
}));
vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("../../../../../lib/tastytrade", () => ({
  getTastytradeCapabilities: mocks.getTastytradeCapabilities,
}));

import { GET } from "./route";

async function readMatrix(): Promise<AthosCapabilityMatrix> {
  const response = await GET(new NextRequest("http://localhost/api/athos/market-data/capabilities"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return (await response.json()) as AthosCapabilityMatrix;
}

describe("/api/athos/market-data/capabilities GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true });
    mocks.getTastytradeCapabilities.mockResolvedValue({
      configured: false,
      connected: false,
      env: "production",
      accounts: 0,
      quotes: false,
      realTime: null,
      supportedAssetClasses: [],
      sourceName: "tastytrade / dxFeed",
      note: "TASTYTRADE_REFRESH_TOKEN is missing.",
    });
  });

  it("rejects an unauthenticated request before any capability is exposed", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    const response = await GET(new NextRequest("http://localhost/api/athos/market-data/capabilities"));
    expect(response.status).toBe(401);
  });

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

  it("uses the provider status probe without promoting quote-token access to market data", async () => {
    mocks.getTastytradeCapabilities.mockResolvedValue({
      configured: true,
      connected: true,
      env: "production",
      accounts: 1,
      quotes: true,
      realTime: null,
      supportedAssetClasses: ["equity", "option", "future"],
      sourceName: "tastytrade / dxFeed",
      note: "Quote token observed; timestamped market event is still unproven.",
    });

    const matrix = await readMatrix();
    const tastytradeRows = matrix.capabilities.flatMap((row) => row.rejectedSources)
      .filter((source) => source.source === "tastytrade");
    expect(tastytradeRows.length).toBeGreaterThan(0);
    expect(tastytradeRows.every((row) => row.reason === "capability status is NOT_IMPLEMENTED")).toBe(true);
    expect(tastytradeRows.some((row) => row.note?.includes("timestamped market event is still unproven"))).toBe(true);
    expect(JSON.stringify(tastytradeRows)).not.toMatch(/BLOCKED_ENTITLEMENT|DELAYED_BY_ENTITLEMENT/);
  });
});
