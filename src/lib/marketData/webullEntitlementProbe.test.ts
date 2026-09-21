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
import { WEBULL_SIGNING_PROFILES } from "./webullSigningCanary";
import {
  EXPIRY_INTERPRETATIONS,
  WEBULL_TOKEN_STATUSES,
  inMemoryTokenStore,
  type WebullAccessToken,
} from "./webullAccessToken";

function receipt(
  rung: WebullRungReceipt["rung"],
  gate: WebullRungReceipt["gate"],
  outcome: WebullRungReceipt["outcome"],
  signingProfile: WebullRungReceipt["signingProfile"] = "legacy-sha1",
): WebullRungReceipt {
  return { rung, gate, outcome, signingProfile, httpStatus: outcome === "OK" ? 200 : 403, providerCode: null };
}

const OPEN_NON_DATA = [receipt("ACCOUNTS", "NON_MARKET_DATA", "OK"), receipt("PROFILES", "NON_MARKET_DATA", "OK")];

/** Market-data denied under EVERY profile — the only shape that may isolate an entitlement. */
function deniedDataAllProfiles(): WebullRungReceipt[] {
  return WEBULL_SIGNING_PROFILES.flatMap((profile) => [
    receipt("SNAPSHOT", "MARKET_DATA", "DENIED_ENTITLEMENT", profile),
    receipt("TICKS", "MARKET_DATA", "DENIED_ENTITLEMENT", profile),
  ]);
}

describe("webullRungSpecs", () => {
  it("pins every path to the official SDK contract, with no /openapi prefix on the market-data rungs", () => {
    const specs = webullRungSpecs("tsla");
    // DISTINCT paths, because market-data paths are now climbed once per
    // signing profile. The set is what the SDK contract owns; the repetition
    // is what controls for signing.
    expect([...new Set(specs.map((spec) => spec.path))]).toEqual([
      "/trading/accounts/list",
      "/trading/instruments/stocks/profiles/list",
      "/market-data/stocks/snapshots/list",
      "/market-data/stocks/ticks/list",
    ]);
    expect(specs.some((spec) => spec.path.includes("/openapi/"))).toBe(false);
    expect(specs.filter((spec) => spec.gate === "MARKET_DATA")).toHaveLength(2 * WEBULL_SIGNING_PROFILES.length);
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
    const reading = readWebullLadder([...OPEN_NON_DATA, ...deniedDataAllProfiles()]);
    expect(reading.verdict).toBe("ENTITLEMENT_ISOLATED");
  });

  /**
   * THE CONFOUND THIS LADDER SHIPPED WITH.
   *
   * The passing rungs are `/trading/*` and the failing ones `/market-data/*`.
   * Signed one way only, the old verdict announced "signing proven good" from
   * rungs where signing could not have been tested. This is the regression
   * test for the sentence that would have told the Founder to buy data.
   */
  it("will NOT isolate an entitlement when only one signing profile was tried", () => {
    const reading = readWebullLadder([
      ...OPEN_NON_DATA,
      receipt("SNAPSHOT", "MARKET_DATA", "DENIED_ENTITLEMENT", "legacy-sha1"),
      receipt("TICKS", "MARKET_DATA", "DENIED_ENTITLEMENT", "legacy-sha1"),
    ]);

    expect(reading.verdict).not.toBe("ENTITLEMENT_ISOLATED");
    expect(reading.verdict).toBe("INCONCLUSIVE");
    // Named, not merely withheld — a verdict that hides its reason is how the
    // next reader re-derives the wrong one.
    expect(reading.note).toMatch(/legacy-sha1/);
    expect(reading.note).toMatch(/do not ask anyone to buy a data package/i);
  });

  it("names OUR SIGNATURE, not a subscription, when one profile is admitted and another is not", () => {
    // The outcome the old ladder was structurally unable to observe.
    const reading = readWebullLadder([
      ...OPEN_NON_DATA,
      receipt("SNAPSHOT", "MARKET_DATA", "OK", "sdk-sha256"),
      receipt("TICKS", "MARKET_DATA", "OK", "sdk-sha256"),
      receipt("SNAPSHOT", "MARKET_DATA", "DENIED_ENTITLEMENT", "legacy-sha1"),
      receipt("TICKS", "MARKET_DATA", "DENIED_ENTITLEMENT", "legacy-sha1"),
    ]);

    expect(reading.verdict).toBe("INCOHERENT");
    expect(reading.note).toMatch(/sdk-sha256/);
    expect(reading.note).toMatch(/not a subscription/i);
  });

  it("climbs every market-data rung under every signing profile", () => {
    const specs = webullRungSpecs("TSLA");
    for (const profile of WEBULL_SIGNING_PROFILES) {
      const paths = specs.filter((s) => s.signingProfile === profile && s.gate === "MARKET_DATA").map((s) => s.path);
      expect(paths).toEqual(["/market-data/stocks/snapshots/list", "/market-data/stocks/ticks/list"]);
    }
    // ACCOUNT_LIST v2 stays on legacy-sha1 deliberately — it is the rung
    // currently proving the broker lane is alive, and re-signing it to tidy
    // the table would risk the one thing on this ladder that already works.
    expect(specs.find((s) => s.rung === "ACCOUNTS")?.signingProfile).toBe("legacy-sha1");
  });

  it("refuses to blame a subscription when every rung was denied", () => {
    const reading = readWebullLadder([
      receipt("ACCOUNTS", "NON_MARKET_DATA", "DENIED_AUTH"),
      receipt("PROFILES", "NON_MARKET_DATA", "DENIED_AUTH"),
      ...deniedDataAllProfiles(),
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
        ...deniedDataAllProfiles(),
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

    // Derived from the ladder, not restated: a hard-coded rung count is how a
    // new rung silently stops being climbed.
    expect(seen).toHaveLength(webullRungSpecs("TSLA").length);
    expect(report.verdict).toBe("ENTITLEMENT_ISOLATED");
    expect(report.rungs.filter((rung) => rung.gate === "NON_MARKET_DATA").map((rung) => rung.outcome))
      .toEqual(["OK", "OK"]);
    expect(report.rungs.filter((rung) => rung.gate === "MARKET_DATA").every((r) => r.outcome === "DENIED_ENTITLEMENT"))
      .toBe(true);
    // Every profile actually reached the wire — otherwise the verdict above
    // would be resting on a gate that only looks controlled.
    expect(new Set(report.rungs.filter((r) => r.gate === "MARKET_DATA").map((r) => r.signingProfile)))
      .toEqual(new Set(WEBULL_SIGNING_PROFILES));

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

/**
 * The ladder is only readable if the session we climbed it with was alive.
 *
 * An expired token fails all four rungs, including the two that need no data
 * package — and that pattern reads as CREDENTIAL_OR_CONTRACT_SUSPECT. So a
 * stale session doesn't just lose data, it manufactures a confident wrong
 * verdict about the Founder's credentials. These lock that shut.
 */
describe("the entitlement ladder climbs on a LIVING session", () => {
  const NOW = new Date("2026-09-20T18:00:00.000Z");
  const live = (over: Partial<WebullAccessToken> = {}): WebullAccessToken => ({
    token: "minted-session-value",
    status: WEBULL_TOKEN_STATUSES.NORMAL,
    expiresAtMs: NOW.getTime() + 60 * 60_000,
    expiryInterpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS,
    observedAtMs: NOW.getTime(),
    ...over,
  });
  const base = { appKey: "k", appSecret: "s", now: () => NOW, nonce: () => "n".repeat(32) };

  it("sends the minted session on every rung, not the pasted one", async () => {
    const tokens: (string | undefined)[] = [];
    const fetchImpl = (async (_url: URL, init: RequestInit) => {
      tokens.push((init.headers as Record<string, string>)["x-access-token"]);
      return new Response(JSON.stringify({ data: [{ account_id: "x" }] }), { status: 200 });
    }) as unknown as typeof fetch;

    await probeWebullEntitlement(fetchImpl, {
      ...base, accessToken: "stale-pasted-token", tokenStore: inMemoryTokenStore(live()),
    });
    expect(tokens).toHaveLength(webullRungSpecs("TSLA").length);
    expect(new Set(tokens)).toEqual(new Set(["minted-session-value"]));
  });

  it("does not climb at all while a 2FA approval is outstanding", async () => {
    // Climbing here would produce four 401s and we would publish a verdict
    // about his entitlements built entirely out of our own pending session.
    //
    // The session CHECK is not a rung and is not a climb: it asks whether the
    // Founder's tap landed, which is the only way this state can ever clear.
    // What must not happen is any request that could be mistaken for evidence
    // about his data package.
    const paths: string[] = [];
    const fetchImpl = (async (url: RequestInfo | URL) => {
      paths.push(String(url));
      return new Response(JSON.stringify({ token: "t", expires: 3600, status: "PENDING" }), { status: 200 });
    }) as unknown as typeof fetch;
    const report = await probeWebullEntitlement(fetchImpl, {
      ...base, tokenStore: inMemoryTokenStore(live({ status: WEBULL_TOKEN_STATUSES.PENDING })),
    });
    expect(paths).toEqual(["https://api.webull.com/auth/tokens/check"]);
    expect(paths.some((p) => p.includes("/market-data/"))).toBe(false);
    expect(report.verdict).toBe("AWAITING_2FA");
    expect(report.rungs).toEqual([]);
    expect(report.note).toMatch(/webull app/i);
  });

  it("does not call a 2FA wait UNCONFIGURED", async () => {
    // "Unconfigured" says something is missing from the deployment. Nothing
    // is. Conflating the two is how the Founder gets sent to add a secret he
    // already added — the loop this whole lane exists to end.
    const report = await probeWebullEntitlement(
      (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch,
      { ...base, tokenStore: inMemoryTokenStore(live({ status: WEBULL_TOKEN_STATUSES.PENDING })) },
    );
    expect(report.verdict).not.toBe("UNCONFIGURED");
    // The guard targets the INSTRUCTION, not the vocabulary. A bare /missing/
    // would also fire on "no credential is missing", which is the sentence we
    // actually want — a denial is not an accusation.
    expect(report.note).not.toMatch(/not configured/i);
    expect(report.note).not.toMatch(/\b(add|set|paste|re-?enter|supply)\s+(a|the\s+)?\w*\s*(secret|credential|token|variable|key)/i);
    // And it must point at the one action that is actually his to take.
    expect(report.note).toMatch(/approve/i);
  });

  it("says out loud when a climb carried no session at all", async () => {
    // Otherwise a failed mint reads back as a fact about his entitlements.
    const fetchImpl = (async (url: URL) => String(url).includes("/auth/tokens/")
      ? new Response("{}", { status: 500 })
      : new Response(JSON.stringify({ code: "INVALID_SIGNATURE" }), { status: 403 })) as unknown as typeof fetch;
    const report = await probeWebullEntitlement(fetchImpl, {
      ...base, tokenStore: inMemoryTokenStore(live({ status: WEBULL_TOKEN_STATUSES.EXPIRED })),
    });
    expect(report.note).toMatch(/no session accompanied this climb/i);
  });

  it("never leaks the minted session into the report", async () => {
    const report = await probeWebullEntitlement(
      (async () => new Response(JSON.stringify({ data: [{ account_id: "x" }] }), { status: 200 })) as unknown as typeof fetch,
      { ...base, tokenStore: inMemoryTokenStore(live()) },
    );
    expect(JSON.stringify(report)).not.toContain("minted-session-value");
  });
});
