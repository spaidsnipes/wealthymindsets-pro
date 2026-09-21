/**
 * The probe's whole value is that its verdict cannot be talked into blaming the
 * Founder's subscription. These tests pin that: an all-denied ladder must NOT
 * read as an entitlement gap, and a bare 403 must NOT read as one either.
 */
import { describe, expect, it } from "vitest";
import {
  classifyRung,
  extractProviderCode,
  probeWebullEntitlement,
  readWebullLadder,
  webullRungSpecs,
  type WebullRungReceipt,
} from "./webullEntitlementProbe";

function receipt(
  rung: WebullRungReceipt["rung"],
  gate: WebullRungReceipt["gate"],
  outcome: WebullRungReceipt["outcome"],
): WebullRungReceipt {
  return { rung, gate, outcome, httpStatus: outcome === "OK" ? 200 : 403, providerCode: null };
}

const OPEN_NON_DATA = [receipt("ACCOUNTS", "NON_MARKET_DATA", "OK"), receipt("PROFILES", "NON_MARKET_DATA", "OK")];

describe("webullRungSpecs", () => {
  it("pins every path to the official SDK contract, with no /openapi prefix on the market-data rungs", () => {
    const specs = webullRungSpecs("tsla");
    expect(specs.map((spec) => spec.path)).toEqual([
      "/trading/accounts/list",
      "/trading/instruments/stocks/profiles/list",
      "/market-data/stocks/snapshots/list",
      "/market-data/stocks/ticks/list",
    ]);
    expect(specs.some((spec) => spec.path.includes("/openapi/"))).toBe(false);
    expect(specs.filter((spec) => spec.gate === "MARKET_DATA")).toHaveLength(2);
    // The ladder is only readable if it contains ungated rungs to compare against.
    expect(specs.filter((spec) => spec.gate === "NON_MARKET_DATA").length).toBeGreaterThan(0);
  });

  it("upper-cases the symbol rather than sending whatever the caller typed", () => {
    expect(webullRungSpecs("tsla").at(-1)?.query.symbol).toBe("TSLA");
  });
});

describe("extractProviderCode", () => {
  it("accepts a short uppercase provider code", () => {
    expect(extractProviderCode({ code: "MARKET_DATA_NOT_SUBSCRIBED" })).toBe("MARKET_DATA_NOT_SUBSCRIBED");
    expect(extractProviderCode({ error_code: "invalid_signature" })).toBe("INVALID_SIGNATURE");
  });

  it("refuses prose, so upstream messages cannot ride into a browser scene", () => {
    expect(extractProviderCode({ code: "Your account is not subscribed to this data package." })).toBeNull();
    expect(extractProviderCode({ msg: "MARKET_DATA_NOT_SUBSCRIBED" })).toBeNull();
    expect(extractProviderCode({ code: 403 })).toBeNull();
    expect(extractProviderCode(null)).toBeNull();
    expect(extractProviderCode("MARKET_DATA_NOT_SUBSCRIBED")).toBeNull();
  });
});

describe("classifyRung", () => {
  it("only calls it an entitlement when the provider itself names one", () => {
    expect(classifyRung(403, "MARKET_DATA_NOT_SUBSCRIBED")).toBe("DENIED_ENTITLEMENT");
    expect(classifyRung(403, "NO_ENTITLEMENT")).toBe("DENIED_ENTITLEMENT");
  });

  it("treats a bare 403 as DENIED_OTHER — a 403 alone cannot tell 'not bought' from 'asked wrong'", () => {
    expect(classifyRung(403, null)).toBe("DENIED_OTHER");
    expect(classifyRung(403, "INVALID_SIGNATURE")).toBe("DENIED_OTHER");
    expect(classifyRung(403, "INVALID_REQUEST")).toBe("DENIED_OTHER");
  });

  it("separates auth, rate limit and provider fault from denial", () => {
    expect(classifyRung(401, null)).toBe("DENIED_AUTH");
    expect(classifyRung(429, null)).toBe("RATE_LIMITED");
    expect(classifyRung(503, null)).toBe("PROVIDER_ERROR");
    expect(classifyRung(200, null)).toBe("OK");
    expect(classifyRung(404, null)).toBe("UNAVAILABLE");
  });
});

describe("readWebullLadder", () => {
  it("isolates the entitlement ONLY when ungated rungs opened over the same credentials", () => {
    const reading = readWebullLadder([
      ...OPEN_NON_DATA,
      receipt("SNAPSHOT", "MARKET_DATA", "DENIED_ENTITLEMENT"),
      receipt("TICKS", "MARKET_DATA", "DENIED_ENTITLEMENT"),
    ]);
    expect(reading.verdict).toBe("ENTITLEMENT_ISOLATED");
  });

  it("refuses to blame a subscription when every rung was denied", () => {
    const reading = readWebullLadder([
      receipt("ACCOUNTS", "NON_MARKET_DATA", "DENIED_AUTH"),
      receipt("PROFILES", "NON_MARKET_DATA", "DENIED_AUTH"),
      receipt("SNAPSHOT", "MARKET_DATA", "DENIED_ENTITLEMENT"),
      receipt("TICKS", "MARKET_DATA", "DENIED_ENTITLEMENT"),
    ]);
    expect(reading.verdict).toBe("CREDENTIAL_OR_CONTRACT_SUSPECT");
    expect(reading.note).toContain("NOT evidence that a market-data subscription is missing");
  });

  it("reports FULLY_OPEN when the data actually flows", () => {
    expect(
      readWebullLadder([
        ...OPEN_NON_DATA,
        receipt("SNAPSHOT", "MARKET_DATA", "OK"),
        receipt("TICKS", "MARKET_DATA", "OK"),
      ]).verdict,
    ).toBe("FULLY_OPEN");
  });

  it("names an incoherent ladder instead of smoothing it into a story", () => {
    expect(
      readWebullLadder([
        receipt("ACCOUNTS", "NON_MARKET_DATA", "DENIED_AUTH"),
        receipt("PROFILES", "NON_MARKET_DATA", "DENIED_AUTH"),
        receipt("SNAPSHOT", "MARKET_DATA", "OK"),
        receipt("TICKS", "MARKET_DATA", "OK"),
      ]).verdict,
    ).toBe("INCOHERENT");
  });

  it("refuses to grade a partial climb", () => {
    expect(
      readWebullLadder([
        ...OPEN_NON_DATA,
        receipt("SNAPSHOT", "MARKET_DATA", "RATE_LIMITED"),
        receipt("TICKS", "MARKET_DATA", "DENIED_ENTITLEMENT"),
      ]).verdict,
    ).toBe("INCONCLUSIVE");
    expect(readWebullLadder([]).verdict).toBe("INCONCLUSIVE");
  });

  it("calls a split within one gate INCONCLUSIVE rather than picking the convenient half", () => {
    expect(
      readWebullLadder([
        receipt("ACCOUNTS", "NON_MARKET_DATA", "OK"),
        receipt("PROFILES", "NON_MARKET_DATA", "DENIED_OTHER"),
        receipt("SNAPSHOT", "MARKET_DATA", "DENIED_ENTITLEMENT"),
        receipt("TICKS", "MARKET_DATA", "DENIED_ENTITLEMENT"),
      ]).verdict,
    ).toBe("INCONCLUSIVE");
  });
});

describe("probeWebullEntitlement", () => {
  it("attempts nothing when the credential pair is incomplete", async () => {
    let called = 0;
    const report = await probeWebullEntitlement((async () => {
      called += 1;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch, { appKey: "key", appSecret: "  " });
    expect(report.verdict).toBe("UNCONFIGURED");
    expect(report.rungs).toEqual([]);
    expect(called).toBe(0);
  });

  it("climbs every rung and never surfaces the signature, the key or the payload", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: URL, init: RequestInit) => {
      seen.push(String(url));
      const marketData = String(url).includes("/market-data/");
      expect((init.headers as Record<string, string>)["x-signature"]).toBeTruthy();
      return new Response(
        JSON.stringify(marketData ? { code: "MARKET_DATA_NOT_SUBSCRIBED" } : { data: [{ account_id: "x" }] }),
        { status: marketData ? 403 : 200 },
      );
    }) as unknown as typeof fetch;

    const report = await probeWebullEntitlement(fetchImpl, {
      appKey: "app-key-value",
      appSecret: "app-secret-value",
      accessToken: "access-token-value",
      symbol: "TSLA",
      now: () => new Date("2026-09-20T18:00:00.000Z"),
      nonce: () => "n".repeat(32),
    });

    expect(seen).toHaveLength(4);
    expect(report.verdict).toBe("ENTITLEMENT_ISOLATED");
    expect(report.rungs.map((rung) => rung.outcome)).toEqual([
      "OK",
      "OK",
      "DENIED_ENTITLEMENT",
      "DENIED_ENTITLEMENT",
    ]);

    const serialized = JSON.stringify(report);
    for (const secret of ["app-key-value", "app-secret-value", "access-token-value", "account_id", "x-signature"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("reads an all-denied ladder as our own suspect, not the Founder's wallet", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ code: "INVALID_SIGNATURE" }), { status: 403 })) as unknown as typeof fetch;
    const report = await probeWebullEntitlement(fetchImpl, { appKey: "k", appSecret: "s" });
    expect(report.verdict).toBe("CREDENTIAL_OR_CONTRACT_SUSPECT");
  });
});
