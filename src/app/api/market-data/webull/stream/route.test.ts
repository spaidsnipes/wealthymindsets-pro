import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GARDEN 11 — the real-time lane's continuity answers must reach the ONE
 * stream owner in a form it can read.
 *
 *   · A gate (2FA wait, no key pair, no sockets) used to be a JSON body. An
 *     EventSource cannot read JSON, so the owner saw an error and reconnected
 *     into the same wall. It now gets `gate` + `closed` when it asks for SSE.
 *   · A subscribe refused ON THE SESSION (401 INVALID_TOKEN) retires that
 *     session, and the owner is told so BEFORE the close.
 */
const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  resolveWebullSessionToken: vi.fn(),
  streamWebullQuotes: vi.fn(),
  sockets: { available: true } as { available: boolean; reason?: string; connect?: unknown },
  held: null as null | Record<string, unknown>,
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
// Webull's own session check decides a retirement; here it answers DEAD.
vi.mock("@/lib/marketData/webullSessionRejection", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/marketData/webullSessionRejection")>();
  return { ...real, webullSessionConfirmer: () => async () => "DEAD" as const };
});
vi.mock("@/lib/marketData/adapters/webullMarketData", () => ({
  webullDataConfigFromEnv: () => ({ appKey: "test-app-key", appSecret: "test-app-secret", apiHost: "api.webull.test" }),
}));
vi.mock("@/lib/runtime/rawSockets", () => ({ rawSocketSupport: () => mocks.sockets }));
vi.mock("@/lib/marketData/webullQuotesStream", () => ({ streamWebullQuotes: mocks.streamWebullQuotes }));
vi.mock("@/lib/marketData/webullSessionStore", () => ({
  resolveWebullSessionToken: mocks.resolveWebullSessionToken,
  webullSessionStore: () => ({
    read: async () => mocks.held,
    write: async (token: Record<string, unknown>) => { mocks.held = token; },
  }),
  webullWorkerEnv: async () => undefined,
}));

import { GET } from "./route";

const sseRequest = () => new NextRequest("http://localhost/api/market-data/webull/stream?symbols=AAPL", {
  headers: { accept: "text/event-stream" },
});

function events(text: string): Array<{ event: string; data: Record<string, unknown> }> {
  return text.split("\n\n").filter(Boolean).map((block) => {
    const [eventLine, dataLine] = block.split("\n");
    return { event: eventLine.replace("event: ", ""), data: JSON.parse(dataLine.replace("data: ", "")) };
  });
}

describe("GET /api/market-data/webull/stream — continuity answers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.held = null;
    mocks.sockets = { available: true, connect: vi.fn() };
    mocks.requireAuth.mockResolvedValue({ ok: true });
    mocks.resolveWebullSessionToken.mockResolvedValue({ accessToken: "minted-session-value", awaiting2fa: false, note: "live" });
  });

  it("hands an EventSource a readable 2FA gate instead of a JSON body it cannot parse", async () => {
    mocks.resolveWebullSessionToken.mockResolvedValue({ awaiting2fa: true, note: "Approve the Webull session in the Webull app." });
    const response = await GET(sseRequest());
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    const received = events(await response.text());
    expect(received.map((e) => e.event)).toEqual(["gate", "closed"]);
    expect(received[0].data).toMatchObject({ kind: "gate", gate: "AWAITING_2FA", note: "Approve the Webull session in the Webull app." });
    expect(mocks.streamWebullQuotes).not.toHaveBeenCalled();
  });

  it("keeps the JSON answer for callers that did not ask for an event stream", async () => {
    mocks.resolveWebullSessionToken.mockResolvedValue({ awaiting2fa: true, note: "Approve it." });
    const response = await GET(new NextRequest("http://localhost/api/market-data/webull/stream?symbols=AAPL"));
    expect(await response.json()).toMatchObject({ provider: "webull", lane: "REAL_TIME", awaiting2fa: true });
  });

  it("names a missing socket capability as a deployment gate", async () => {
    mocks.sockets = { available: false, reason: "This runtime cannot open raw TCP sockets." };
    const received = events(await (await GET(sseRequest())).text());
    expect(received[0].data).toMatchObject({ kind: "gate", gate: "NO_SOCKETS" });
  });

  it("retires a session refused on the subscribe leg and says so before the close — never printing it", async () => {
    mocks.held = { token: "minted-session-value", status: "NORMAL", expiresAtMs: Date.now() + 3_600_000, expiryInterpretation: "EPOCH_MILLIS", observedAtMs: Date.now() };
    mocks.streamWebullQuotes.mockImplementation(async function* () {
      yield { kind: "handshake", accepted: true, credentialRejected: false, connAck: null, note: "accepted" };
      yield { kind: "subscribe", subscribed: false, status: 401, providerCode: "INVALID_TOKEN", note: "session refused" };
      yield { kind: "closed", reason: "Webull did not accept the subscription." };
    });
    const text = await (await GET(sseRequest())).text();
    const received = events(text);
    expect(received.map((e) => e.event)).toEqual(["handshake", "subscribe", "session", "closed"]);
    expect(received[2].data).toMatchObject({ kind: "session", verdict: "REMINT" });
    expect(mocks.held?.status).toBe("INVALID");
    expect(text).not.toContain("minted-session-value");
    expect(text).not.toContain("test-app-secret");
  });

  it("leaves the session alone when the subscribe refusal does not name it (403 entitlement)", async () => {
    mocks.held = { token: "minted-session-value", status: "NORMAL", expiresAtMs: Date.now() + 3_600_000, expiryInterpretation: "EPOCH_MILLIS", observedAtMs: Date.now() };
    mocks.streamWebullQuotes.mockImplementation(async function* () {
      yield { kind: "handshake", accepted: true, credentialRejected: false, connAck: null, note: "accepted" };
      yield { kind: "subscribe", subscribed: false, status: 403, providerCode: "MARKET_DATA_NOT_SUBSCRIBED", note: "refused" };
      yield { kind: "closed", reason: "Webull did not accept the subscription." };
    });
    const received = events(await (await GET(sseRequest())).text());
    expect(received.map((e) => e.event)).toEqual(["handshake", "subscribe", "closed"]);
    expect(mocks.held?.status).toBe("NORMAL");
  });
});
