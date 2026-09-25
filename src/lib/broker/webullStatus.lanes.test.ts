/**
 * THE TWO WEBULL LANES — the owner's contract. (2026-09-25)
 *
 * MEASURED on serving, desktop, 2026-09-25 14:51 CDT:
 *   broker lane  CONNECTED at 2026-09-25T19:51:45Z (signed account list)
 *   data lane    403 MARKET_DATA_NOT_SUBSCRIBED (signed market-data read)
 *
 * and two surfaces each told one of them: a single red "Entitlement blocked"
 * chip hid the connected broker lane, and /readiness called the data lane
 * "NOT MEASURED — no live probe exists" beside a probe answering 403.
 *
 * These tests pin the one owner both surfaces now read.
 */
import { describe, expect, it, vi } from "vitest";
import {
  WEBULL_2FA_FOUNDER_ACTION,
  WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION,
  WEBULL_LANE_PROVIDERS,
  readWebullLanes,
  selectWebullLanes,
  webullWireboardMeasurements,
  type WebullBrokerLaneReceipt,
  type WebullDataLaneReceipt,
} from "./webullStatus";
import { selectReadinessWireboard } from "./selectReadinessWireboard";
import type { ProviderReadiness } from "./providerReadiness";
import { fetchWebullTickSnapshot } from "@/lib/marketData/adapters/webullMarketData";
import { classifyWebullTickSnapshot } from "@/lib/marketData/adapters/webullTicksWireStatus";

/** Today's broker receipt, shaped like /api/broker/webull/status. Value-free. */
const BROKER_CONNECTED: WebullBrokerLaneReceipt = {
  connected: true,
  state: "CONNECTED",
  accountCount: 3,
  note: "Signed read access to the Webull account list is proven. Order preview and execution remain separately gated.",
  checkedAt: "2026-09-25T19:51:45Z",
};

/**
 * Today's data receipt, produced by the REAL adapter and the REAL classifier —
 * exactly the two calls /api/market-data/webull/ticks spreads into its body. So
 * the "403 MARKET_DATA_NOT_SUBSCRIBED" these tests expect is carried by the
 * adapter's own fields, not typed into a fixture.
 */
async function measuredEntitlementReceipt(): Promise<WebullDataLaneReceipt> {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ code: "MARKET_DATA_NOT_SUBSCRIBED" }), { status: 403 }),
  );
  const snapshot = await fetchWebullTickSnapshot(fetchMock as unknown as typeof fetch, {
    appKey: "public-test-key",
    appSecret: "public-test-secret",
    canarySymbol: "TSLA",
    now: () => new Date("2026-09-25T19:51:44Z"),
    nonce: () => "nonce",
  });
  return { ...snapshot, ...classifyWebullTickSnapshot(snapshot) };
}

describe("the adapter carries the refusal verbatim", () => {
  it("a 403 MARKET_DATA_NOT_SUBSCRIBED receipt carries its status and code as FIELDS", async () => {
    const receipt = await measuredEntitlementReceipt();
    expect(receipt.state).toBe("BLOCKED_ENTITLEMENT");
    expect(receipt.label).toBe("ENTITLEMENT BLOCKED");
    expect(receipt.httpStatus).toBe(403);
    expect(receipt.providerCode).toBe("MARKET_DATA_NOT_SUBSCRIBED");
    expect(receipt.requestedAt).toBe("2026-09-25T19:51:44Z");
  });
});

describe("selectWebullLanes · broker lane", () => {
  const broker = (receipt: WebullBrokerLaneReceipt | null) => selectWebullLanes({ broker: receipt, data: null }).broker;

  it("CONNECTED carries its measurement time and account count", () => {
    expect(broker(BROKER_CONNECTED)).toMatchObject({
      state: "CONNECTED",
      word: "CONNECTED",
      providerState: "CONNECTED",
      measuredAt: "2026-09-25T19:51:45Z",
      accountCount: 3,
      founderAction: null,
    });
  });

  it("AWAITING_2FA names the one tap, and no credential", () => {
    const lane = broker({ connected: false, state: "AWAITING_2FA", note: "pending", checkedAt: "t" });
    expect(lane.state).toBe("AWAITING_2FA");
    expect(lane.word).toBe("AWAITING 2FA");
    expect(lane.founderAction).toBe(WEBULL_2FA_FOUNDER_ACTION);
    expect(lane.founderAction).not.toMatch(/\b(paste|rotate|token|secret|key)\b/i);
  });

  it("BLOCKED_AUTH → AUTH_BLOCKED, UNCONFIGURED → NOT_CONFIGURED", () => {
    expect(broker({ connected: false, state: "BLOCKED_AUTH", checkedAt: "t" }).state).toBe("AUTH_BLOCKED");
    expect(broker({ connected: false, state: "UNCONFIGURED", checkedAt: "t" }).state).toBe("NOT_CONFIGURED");
  });

  it("an unrecognised or failing token is NOT_CONNECTED — never the reassuring reading", () => {
    for (const state of ["RATE_LIMITED", "NO_ACCOUNTS", "TIMEOUT", "SOMETHING_NEW"]) {
      const lane = broker({ connected: false, state, checkedAt: "t" });
      expect(lane.state, state).toBe("NOT_CONNECTED");
      expect(lane.word).toBe("NOT CONNECTED");
    }
  });

  it("`connected` without the CONNECTED token is not trusted to be anything but what it says", () => {
    // `connected: true` is the route's own verdict and is what the lane reads.
    expect(broker({ connected: true, state: "CONNECTED", checkedAt: "t" }).state).toBe("CONNECTED");
    // `connected: false` with a CONNECTED token is contradictory; it is not promoted.
    expect(broker({ connected: false, state: "CONNECTED", checkedAt: "t" }).state).toBe("NOT_CONNECTED");
  });

  it("no receipt, or a body with no state, is NOT_MEASURED", () => {
    expect(broker(null).state).toBe("NOT_MEASURED");
    expect(broker({ error: "These Webull accounts belong to another user." } as unknown as WebullBrokerLaneReceipt).state).toBe("NOT_MEASURED");
    expect(broker(null).measuredAt).toBeNull();
  });
});

describe("selectWebullLanes · data lane", () => {
  const data = (receipt: WebullDataLaneReceipt | null) => selectWebullLanes({ broker: null, data: receipt }).data;

  it("ENTITLEMENT_BLOCKED: word, verbatim evidence, measured time, founder action", async () => {
    const lane = data(await measuredEntitlementReceipt());
    expect(lane).toMatchObject({
      state: "ENTITLEMENT_BLOCKED",
      word: "NOT ENTITLED",
      providerState: "BLOCKED_ENTITLEMENT",
      httpStatus: 403,
      providerCode: "MARKET_DATA_NOT_SUBSCRIBED",
      evidence: "403 MARKET_DATA_NOT_SUBSCRIBED",
      measuredAt: "2026-09-25T19:51:44Z",
      founderAction: WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION,
    });
  });

  it("never FABRICATES the 403: a receipt that carried no status has no evidence line", () => {
    // The shape a pre-2026-09-25 deploy returns: state + label, no httpStatus.
    const lane = data({ state: "BLOCKED_ENTITLEMENT", label: "ENTITLEMENT BLOCKED", requestedAt: "t", note: "n" });
    expect(lane.state).toBe("ENTITLEMENT_BLOCKED");
    expect(lane.evidence).toBeNull();
    expect(lane.httpStatus).toBeNull();
  });

  it("the founder action is an entitlement step, not a credential or a purchase claim about the account", () => {
    expect(WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION).toMatch(/OpenAPI market-data subscription/);
    expect(WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION).toMatch(/not a credential/);
    expect(WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION).not.toMatch(/\b(buy|purchase|paste|rotate|token|secret|key|account)\b/i);
  });

  it("RECEIVING needs a real print; a RECEIVING label beside zero is NOT_RECEIVING", () => {
    expect(data({ state: "OBSERVED", label: "RECEIVING", receiving: true, eventCount: 4, requestedAt: "t" }).state).toBe("RECEIVING");
    expect(data({ state: "OBSERVED", label: "RECEIVING", receiving: true, eventCount: 0, requestedAt: "t" }).state).toBe("NOT_RECEIVING");
    expect(data({ state: "OBSERVED", label: "RECEIVING", receiving: false, eventCount: 4, requestedAt: "t" }).state).toBe("NOT_RECEIVING");
  });

  it("a pending 2FA on the data route reads AWAITING_2FA, not AUTH_BLOCKED", () => {
    const lane = data({ state: "BLOCKED_AUTH", label: "AWAITING 2FA", awaiting2fa: true, requestedAt: "t" });
    expect(lane.state).toBe("AWAITING_2FA");
    expect(lane.providerState).toBe("AWAITING_2FA");
    expect(lane.founderAction).toBe(WEBULL_2FA_FOUNDER_ACTION);
  });

  it("AUTH BLOCKED and NOT CONFIGURED translate; other measured refusals keep the route's own word", () => {
    expect(data({ state: "BLOCKED_AUTH", label: "AUTH BLOCKED", requestedAt: "t", httpStatus: 401, providerCode: "INVALID_TOKEN" }))
      .toMatchObject({ state: "AUTH_BLOCKED", evidence: "401 INVALID_TOKEN", founderAction: null });
    expect(data({ state: "UNCONFIGURED", label: "NOT CONFIGURED", requestedAt: "t" }).state).toBe("NOT_CONFIGURED");
    expect(data({ state: "RATE_LIMITED", label: "RATE LIMITED", requestedAt: "t" })).toMatchObject({ state: "NOT_RECEIVING", word: "RATE LIMITED" });
    expect(data({ state: "STALE", label: "STALE", requestedAt: "t" }).word).toBe("STALE");
  });

  it("falls back to the adapter state token only when no classified label came back", () => {
    expect(data({ state: "BLOCKED_ENTITLEMENT", requestedAt: "t" }).state).toBe("ENTITLEMENT_BLOCKED");
    expect(data({ state: "BLOCKED_AUTH", requestedAt: "t" }).state).toBe("AUTH_BLOCKED");
  });

  it("a prose-shaped provider code is dropped rather than printed", () => {
    const lane = data({ state: "BLOCKED_ENTITLEMENT", label: "ENTITLEMENT BLOCKED", requestedAt: "t", httpStatus: 403, providerCode: "not a code; with spaces" });
    expect(lane.providerCode).toBeNull();
    expect(lane.evidence).toBe("HTTP 403");
  });

  it("no receipt, or a body with neither label nor state, is NOT_MEASURED", () => {
    expect(data(null).state).toBe("NOT_MEASURED");
    expect(data({ note: "nothing classified" }).state).toBe("NOT_MEASURED");
  });
});

describe("selectWebullLanes · the lanes never re-grade each other", () => {
  it("today's state: BROKER CONNECTED and DATA NOT ENTITLED, both said, both timed", async () => {
    const lanes = selectWebullLanes({ broker: BROKER_CONNECTED, data: await measuredEntitlementReceipt() });
    expect(lanes.broker.state).toBe("CONNECTED");
    expect(lanes.data.state).toBe("ENTITLEMENT_BLOCKED");
    expect(lanes.summary).toContain("broker lane CONNECTED (measured 2026-09-25T19:51:45Z)");
    expect(lanes.summary).toContain("data lane NOT ENTITLED · 403 MARKET_DATA_NOT_SUBSCRIBED (measured 2026-09-25T19:51:44Z)");
    expect(lanes.summary).toContain(`Founder action: ${WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION}`);
  });

  it("a connected broker lane does not make an unmeasured data lane look open", () => {
    const lanes = selectWebullLanes({ broker: BROKER_CONNECTED, data: null });
    expect(lanes.data.state).toBe("NOT_MEASURED");
    expect(lanes.data.founderAction).toBeNull();
  });

  it("a blocked data lane does not make an unmeasured broker lane look blocked", async () => {
    const lanes = selectWebullLanes({ broker: null, data: await measuredEntitlementReceipt() });
    expect(lanes.broker.state).toBe("NOT_MEASURED");
    expect(lanes.broker.word).toBe("NOT MEASURED");
  });

  it("one shared 2FA approval is named once, not twice", () => {
    const lanes = selectWebullLanes({
      broker: { connected: false, state: "AWAITING_2FA", checkedAt: "t" },
      data: { state: "BLOCKED_AUTH", label: "AWAITING 2FA", awaiting2fa: true, requestedAt: "t" },
    });
    expect(lanes.summary.split(WEBULL_2FA_FOUNDER_ACTION)).toHaveLength(2);
  });
});

describe("webullWireboardMeasurements → selectReadinessWireboard", () => {
  const row = (provider: ProviderReadiness["provider"], label: string, lane: string): ProviderReadiness => ({
    provider, label, lane: lane as ProviderReadiness["lane"], status: "CONFIGURED", missing: [], missingRecommended: [], note: "presence",
  });
  const payload = {
    providers: [
      row("webull-data", "Webull market data", "market-data"),
      row("webull-broker", "Webull broker execution", "broker"),
      row("tastytrade", "Tastytrade", "broker"),
    ],
  };
  const probed = Object.values(WEBULL_LANE_PROVIDERS);

  it("today's state corrects BOTH webull rows from their own lanes", async () => {
    const lanes = selectWebullLanes({ broker: BROKER_CONNECTED, data: await measuredEntitlementReceipt() });
    const measurements = webullWireboardMeasurements(lanes);
    expect(measurements.map((m) => m.provider)).toEqual(["webull-broker", "webull-data"]);

    const board = selectReadinessWireboard(payload, measurements, probed);
    const dataRow = board.rows.find((r) => r.provider === "webull-data")!;
    const brokerRow = board.rows.find((r) => r.provider === "webull-broker")!;

    expect(brokerRow.blockerClass).toBe("CONNECTED");
    expect(brokerRow.live?.checkedAt).toBe("2026-09-25T19:51:45Z");

    // THE ROW THAT READ "NOT MEASURED" BESIDE A 403.
    expect(dataRow.live).not.toBeNull();
    expect(dataRow.blockerClass).toBe("ENTITLEMENT BLOCKED");
    expect(dataRow.blockerClass).not.toBe("SETUP PRESENT");
    expect(dataRow.live).toMatchObject({
      state: "BLOCKED_ENTITLEMENT",
      evidence: "403 MARKET_DATA_NOT_SUBSCRIBED",
      checkedAt: "2026-09-25T19:51:44Z",
      founderAction: WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION,
    });
    // The action for an entitlement refusal names no credential to fix.
    expect(dataRow.live!.nextAction).toMatch(/not an identity rejection/);
    expect(dataRow.live!.nextAction).not.toMatch(/\b(examine|verify) the (key|secret|token)/i);
  });

  it("each lane corrects only its own row: the account list never grades market data", () => {
    const lanes = selectWebullLanes({ broker: BROKER_CONNECTED, data: null });
    const board = selectReadinessWireboard(payload, webullWireboardMeasurements(lanes), probed);
    expect(board.rows.find((r) => r.provider === "webull-broker")!.blockerClass).toBe("CONNECTED");
    const dataRow = board.rows.find((r) => r.provider === "webull-data")!;
    expect(dataRow.live).toBeNull();
    expect(dataRow.blockerClass).toBe("SETUP PRESENT");
    // Unmeasured, but a probe EXISTS — the page must not say "no live probe exists".
    expect(dataRow.probed).toBe(true);
  });

  it("a provider with no probe at all is still honestly unprobed", () => {
    const board = selectReadinessWireboard(payload, [], probed);
    const tasty = board.rows.find((r) => r.provider === "tastytrade")!;
    expect(tasty.live).toBeNull();
    expect(tasty.probed).toBe(false);
  });

  it("a data receipt that cannot say WHEN it asked is not passed off as a live measurement", () => {
    const lanes = selectWebullLanes({ broker: null, data: { state: "BLOCKED_ENTITLEMENT", label: "ENTITLEMENT BLOCKED" } });
    expect(lanes.data.state).toBe("ENTITLEMENT_BLOCKED");
    expect(webullWireboardMeasurements(lanes)).toEqual([]);
  });

  it("presence alone still never yields ENTITLEMENT BLOCKED", () => {
    const board = selectReadinessWireboard(payload, [], probed);
    expect(board.rows.every((r) => r.blockerClass !== "ENTITLEMENT BLOCKED")).toBe(true);
  });
});

describe("readWebullLanes — the one client reader", () => {
  const respond = (body: unknown, status = 200) =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

  it("asks BOTH existing routes and returns verdicts, never prints", async () => {
    const entitlement = await measuredEntitlementReceipt();
    const observed = { ...entitlement, ticks: [{ symbol: "TSLA", price: 1, volume: 1, observedAtMs: 1, side: "BUY" }] };
    const urls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      urls.push(url);
      return url.startsWith("/api/broker/webull/status") ? respond(BROKER_CONNECTED) : respond(observed);
    });
    const lanes = await readWebullLanes(fetchMock as unknown as typeof fetch, new AbortController().signal);
    expect(urls.sort()).toEqual(["/api/broker/webull/status", "/api/market-data/webull/ticks?symbol=TSLA"]);
    expect(lanes.broker.state).toBe("CONNECTED");
    expect(lanes.data.evidence).toBe("403 MARKET_DATA_NOT_SUBSCRIBED");
    // The verdict object carries no market prints anywhere.
    expect(JSON.stringify(lanes)).not.toContain("\"ticks\"");
    expect(JSON.stringify(lanes)).not.toContain("observedAtMs");
  });

  it("one unanswered route downgrades its own lane only", async () => {
    const entitlement = await measuredEntitlementReceipt();
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith("/api/broker/webull/status") ? respond({ error: "refused" }, 403) : respond(entitlement));
    const lanes = await readWebullLanes(fetchMock as unknown as typeof fetch, new AbortController().signal);
    expect(lanes.broker.state).toBe("NOT_MEASURED");
    expect(lanes.data.state).toBe("ENTITLEMENT_BLOCKED");
  });
});
