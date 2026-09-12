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

  /**
   * THE CLOCK IS FROZEN HERE ON PURPOSE.
   *
   * This test used to read `expect(matrix.session.state).toBe("UNKNOWN")`
   * against a live `new Date()`. That encoded "CI happens to run on a
   * weekday" as an invariant, and it went red on `2026-09-12T04:04:29Z` — a
   * Saturday — where PRODUCTION WAS CORRECT and the test was not.
   *
   * `deriveSessionTruth` is wired to `provenSessionClosure`, whose own
   * docblock says in as many words: "On a Saturday /charts prints US CASH
   * SESSION · CLOSED". CLOSED on a Saturday is the whole point of having
   * wired the closure owner in. A test that fails on the days the owner can
   * actually prove something is testing the calendar, not the code.
   *
   * Only `Date` is faked. Faking timers wholesale would stall the awaited
   * provider probes inside `buildMatrix`.
   *
   * Both instants are MIDDAY UTC on purpose. `provenSessionClosure` reads
   * `at.getDay()`, which is the RUNNER'S LOCAL day — so `2026-09-12T04:04:29Z`,
   * the instant CI actually failed on, is a Saturday under TZ=UTC and a Friday
   * under US Pacific. Pinning the clock to midday keeps the calendar day the
   * same in UTC and in every US timezone, so this test asserts the route's
   * behaviour rather than the runner's TZ. That local-day read is a real
   * defect in its own right for a US cash-market proxy; it is not this test's
   * to fix, and this test must not depend on it either way.
   */
  it("does not infer session state from provider connectivity", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      // A Wednesday. No intraday exchange calendar ships, so closure is NOT
      // established for the day and the honest answer is UNKNOWN — never
      // "OPEN", which is the inference this test exists to forbid.
      vi.setSystemTime(new Date("2026-09-09T18:00:00Z"));
      const weekday = await readMatrix();
      expect(weekday.session.state).toBe("UNKNOWN");
      for (const row of weekday.capabilities) expect(row.session).toEqual(weekday.session);

      // A Saturday. Closure IS established for this calendar day, so CLOSED
      // is the truth and must be reported as such — that is the whole reason
      // the closure owner was wired into this route.
      vi.setSystemTime(new Date("2026-09-12T18:00:00Z"));
      const weekend = await readMatrix();
      expect(weekend.session.state).toBe("CLOSED");
      for (const row of weekend.capabilities) expect(row.session).toEqual(weekend.session);

      // The actual subject: both answers came from the CALENDAR. Every
      // provider is unconfigured in this suite, so connectivity is identical
      // across the two reads — only the date moved, and only the date may
      // move the verdict.
      expect(weekday.session.state).not.toBe(weekend.session.state);
    } finally {
      vi.useRealTimers();
    }
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
