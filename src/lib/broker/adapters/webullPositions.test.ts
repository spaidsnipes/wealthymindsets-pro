/**
 * webullPositions — the server half of the BROKER COST LINE (bolt-on #6).
 *
 * The fixtures below are TRANSCRIPTIONS of the founder's real production
 * answers measured 2026-09-22 through the verified Webull read path — a
 * one-position margin account holding a TSLA 422.5C 09-23 (quantity "1",
 * cost_price "0.02", strings throughout) and an empty cash account answering
 * `[]`. They are not invented shapes; if Webull's envelope drifts, re-measure
 * before editing them.
 *
 * The defect class this file guards: an OPTION's cost_price is a PREMIUM.
 * Painting 0.02 on a TSLA chart trading near 420 is a lie with an axis. The
 * honest paintable level for an option on the UNDERLYING's chart is its
 * STRIKE — normalizeWebullPositionRow owns that rule, and the first tests pin
 * it before any transport concern.
 *
 * `mintSession: false` is stated out loud in the config so no test silently
 * exercises the token-minting lane; that lane has its own owner and tests.
 */

import { describe, expect, it, vi } from "vitest";

import {
  normalizeWebullPositionRow,
  probeWebullPositions,
} from "./webullPositions";

/** Verbatim shape of the measured production row (option, margin account). */
const MEASURED_OPTION_ROW = {
  currency: "USD",
  quantity: "1",
  cost: "2.00",
  proportion: "1.0000",
  legs: [{
    symbol: "TSLA",
    cost: "0.02",
    proportion: "1.0000",
    leg_id: "TEST-LEG-ID",
    instrument_type: "OPTION",
    last_price: "0.015",
    option_type: "CALL",
    option_expire_date: "2026-09-23",
    option_exercise_price: "422.5",
    option_contract_multiplier: "100",
    option_contract_deliverable: "100",
    expiration_type: "PM",
  }],
  position_id: "TEST-POSITION-ID",
  symbol: "TSLA",
  option_strategy: "SINGLE",
  instrument_type: "OPTION",
  cost_price: "0.02",
  last_price: "0.02",
  market_value: "1.50",
} as const;

const ACCOUNTS = [
  { account_id: "ACC-CASH", account_type: "CASH" },
  { account_id: "ACC-MARGIN", account_type: "MARGIN" },
];

const config = {
  appKey: "key",
  appSecret: "secret",
  mintSession: false,
  now: () => new Date("2026-09-22T18:00:00Z"),
  nonce: () => "nonce",
} as const;

describe("normalizeWebullPositionRow — the honest-price rule", () => {
  it("paints an OPTION at its STRIKE, never its premium", () => {
    const position = normalizeWebullPositionRow({ ...MEASURED_OPTION_ROW });
    expect(position).not.toBeNull();
    expect(position!.symbol).toBe("TSLA");
    expect(position!.instrumentType).toBe("OPTION");
    expect(position!.paintLevel).toBe(422.5);
    expect(position!.costPrice).toBe(0.02);
    expect(position!.option).toEqual({
      type: "CALL",
      strike: 422.5,
      expireDate: "2026-09-23",
      multiplier: 100,
    });
  });

  it("paints a STOCK at its cost price", () => {
    const position = normalizeWebullPositionRow({
      symbol: "aapl",
      instrument_type: "STOCK",
      quantity: "10",
      cost_price: "231.40",
    });
    expect(position).toEqual({
      symbol: "AAPL",
      instrumentType: "STOCK",
      quantity: 10,
      paintLevel: 231.4,
      costPrice: 231.4,
    });
  });

  it("omits an option whose strike cannot be parsed — no invented level", () => {
    const row = {
      ...MEASURED_OPTION_ROW,
      legs: [{ ...MEASURED_OPTION_ROW.legs[0], option_exercise_price: "not-a-price" }],
    };
    expect(normalizeWebullPositionRow(row)).toBeNull();
  });

  it("omits rows without a parsable symbol, quantity or cost", () => {
    expect(normalizeWebullPositionRow({ symbol: "", quantity: "1", cost_price: "1" })).toBeNull();
    expect(normalizeWebullPositionRow({ symbol: "TSLA", quantity: "??", cost_price: "1" })).toBeNull();
    expect(normalizeWebullPositionRow({ symbol: "TSLA", quantity: "1" })).toBeNull();
  });
});

describe("probeWebullPositions — the signed aggregate read", () => {
  it("aggregates across accounts and strips every identifier from the receipt", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const address = String(url);
      if (address.includes("/trading/accounts/list")) {
        return new Response(JSON.stringify(ACCOUNTS), { status: 200 });
      }
      if (address.includes("/account/positions")) {
        return new Response(
          JSON.stringify(address.includes("ACC-MARGIN") ? [MEASURED_OPTION_ROW] : []),
          { status: 200 },
        );
      }
      throw new Error(`unexpected url ${address}`);
    }) as unknown as typeof fetch;

    const receipt = await probeWebullPositions(fetchImpl, config);
    expect(receipt.state).toBe("OBSERVED");
    expect(receipt.accountsQueried).toBe(2);
    expect(receipt.positions).toHaveLength(1);
    expect(receipt.positions[0].paintLevel).toBe(422.5);
    // Privacy: no account/position/leg id may survive into the receipt.
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain("ACC-CASH");
    expect(serialized).not.toContain("ACC-MARGIN");
    expect(serialized).not.toContain("TEST-POSITION-ID");
    expect(serialized).not.toContain("TEST-LEG-ID");
  });

  it("signs the positions request with its query params in the URL", async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const address = String(url);
      urls.push(address);
      if (address.includes("/trading/accounts/list")) {
        return new Response(JSON.stringify([ACCOUNTS[1]]), { status: 200 });
      }
      return new Response("[]", { status: 200 });
    }) as unknown as typeof fetch;

    await probeWebullPositions(fetchImpl, config);
    const positionsUrl = urls.find((address) => address.includes("/account/positions"));
    expect(positionsUrl).toContain("account_id=ACC-MARGIN");
    expect(positionsUrl).toContain("page_size=100");
  });

  it("reports NO_POSITIONS when every account answers empty — never a fake line", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) =>
      new Response(
        String(url).includes("/trading/accounts/list") ? JSON.stringify(ACCOUNTS) : "[]",
        { status: 200 },
      )) as unknown as typeof fetch;
    const receipt = await probeWebullPositions(fetchImpl, config);
    expect(receipt.state).toBe("NO_POSITIONS");
    expect(receipt.positions).toHaveLength(0);
    expect(receipt.accountsQueried).toBe(2);
  });

  it("fails closed before fetch when the key pair is incomplete", async () => {
    const fetchImpl = vi.fn();
    const receipt = await probeWebullPositions(fetchImpl as unknown as typeof fetch, { appKey: "only-key", mintSession: false });
    expect(receipt.state).toBe("UNCONFIGURED");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [401, "BLOCKED_AUTH"],
    [403, "ACCESS_UNPROVEN"],
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ] as const)("maps HTTP %i on the positions rung to %s", async (status, state) => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes("/trading/accounts/list")
        ? new Response(JSON.stringify([ACCOUNTS[1]]), { status: 200 })
        : new Response("{}", { status })) as unknown as typeof fetch;
    const receipt = await probeWebullPositions(fetchImpl, config);
    expect(receipt.state).toBe(state);
    expect(receipt.positions).toHaveLength(0);
  });

  it("treats an unrecognized positions envelope as PROVIDER_ERROR, not as empty", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) =>
      new Response(
        String(url).includes("/trading/accounts/list") ? JSON.stringify([ACCOUNTS[1]]) : JSON.stringify({ odd: true }),
        { status: 200 },
      )) as unknown as typeof fetch;
    const receipt = await probeWebullPositions(fetchImpl, config);
    expect(receipt.state).toBe("PROVIDER_ERROR");
  });
});

describe("positions lane — a refused session is retired, not re-sent (Garden 11)", () => {
  // The one test here that exercises the minting lane, on purpose: it pins
  // that a 401 NAMING the session retires it in the shared store.
  it("retires the held session on 401 INVALID_TOKEN and keeps it on an uncoded 401", async () => {
    const { inMemoryTokenStore, WEBULL_TOKEN_STATUSES, EXPIRY_INTERPRETATIONS } = await import("@/lib/marketData/webullAccessToken");
    const now = new Date("2026-09-25T16:00:00.000Z");
    const held = () => inMemoryTokenStore({
      token: "held-positions-session",
      status: WEBULL_TOKEN_STATUSES.NORMAL,
      expiresAtMs: now.getTime() + 3_600_000,
      expiryInterpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS,
      observedAtMs: now.getTime(),
    });
    const minting = { appKey: "k", appSecret: "s", apiHost: "api.webull.test", now: () => now, nonce: () => "n" };

    const named = held();
    const refused = vi.fn(async (url: RequestInfo | URL) =>
      // The retirement is confirmed by Webull's own session check first.
      String(url).includes("/auth/tokens/check")
        ? new Response(JSON.stringify({ token: "x", expires: 0, status: "INVALID" }), { status: 200 })
        : new Response(JSON.stringify({ code: "INVALID_TOKEN" }), { status: 401 }));
    const receipt = await probeWebullPositions(refused as unknown as typeof fetch, { ...minting, tokenStore: named });
    expect(receipt.state).toBe("BLOCKED_AUTH");
    expect((await named.read())?.status).toBe(WEBULL_TOKEN_STATUSES.INVALID);
    expect(JSON.stringify(receipt)).not.toContain("held-positions-session");

    const uncoded = held();
    const bare = vi.fn(async () => new Response("{}", { status: 401 }));
    await probeWebullPositions(bare as unknown as typeof fetch, { ...minting, tokenStore: uncoded });
    expect((await uncoded.read())?.status).toBe(WEBULL_TOKEN_STATUSES.NORMAL);
  });
});
