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
  readWebullStreamingLane,
  summarizeWebullSubscriptionBody,
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
    expect(reading.verdict).toBe("APP_KEY_ENTITLEMENT_ISOLATED");
  });

  /**
   * THE THREE-MONTH DEFECT, PINNED AT ITS LAST HIDING PLACE.
   *
   * This is the ONE verdict shape from which someone could still conclude "the
   * Founder must buy a data package" — and for three months, someone did. It
   * was measured false on 2026-09-21: `/market-data/stocks/ticks/list`, the
   * exact rung denied here, returned live ticks for the same accounts through a
   * grant-authorized Webull client. The account holds the data; the app key we
   * sign with does not.
   *
   * So this verdict must name its SUBJECT, and must never point at a wallet.
   * The assertions below are on the note a human actually reads, because the
   * enum name alone was never what did the damage — the prose was.
   */
  it("names the APP KEY as the subject and never sends the operator shopping", () => {
    const reading = readWebullLadder([...OPEN_NON_DATA, ...deniedDataAllProfiles()]);

    // It must say whose gap it is. A gap without an owner gets one supplied by
    // the reader, and the reader has historically supplied the wrong one.
    expect(reading.note).toMatch(/APP KEY/);
    expect(reading.note).toMatch(/not the account/i);

    // And it must carry the counter-evidence, or "app key" is just a nicer
    // guess rather than something that was measured.
    expect(reading.note).toMatch(/MEASURED 2026-09-21/);

    // The sentences that cost three months. None of them may come back.
    expect(reading.note).not.toMatch(/\bsubscription (is )?required\b/i);
    expect(reading.note).not.toMatch(
      /\b(go|must|need to|should|please)\s+(buy|purchase|upgrade|subscribe)\b/i,
    );
    expect(reading.note).toMatch(/do not ask the operator to buy anything/i);
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

    expect(reading.verdict).not.toBe("APP_KEY_ENTITLEMENT_ISOLATED");
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

/**
 * We are reading `/app/subscriptions/list` against a live account for the first
 * time, with no fixture of its response shape. So the summariser is pinned on
 * the two things that must hold WHATEVER comes back: it never throws, and it
 * never carries a credential-ish field out of the payload.
 */
describe("summarizeWebullSubscriptionBody — reads an unknown shape safely", () => {
  it("finds rows however deeply the provider nests them", () => {
    expect(summarizeWebullSubscriptionBody({ data: { items: [{ id: "1646795638648", name: "LV1", status: "ACTIVE" }] } }))
      .toEqual([{ id: "1646795638648", name: "LV1", status: "ACTIVE" }]);
  });

  it("drops credential-ish and identity keys and non-scalars instead of forwarding them", () => {
    const rows = summarizeWebullSubscriptionBody([
      {
        name: "LV1", live: true,
        access_token: "SECRET", app_key: "SECRET",
        // Depth is the trap: the summariser flattens, so a filter that only
        // ran at the top level would walk these straight into the report.
        detail: { access_token: "SECRET", account_id: "SECRET", tier: "LV1" },
        // Identity, not entitlement. It cannot answer the question this read
        // was sent to ask, so it does not travel in a report people paste.
        account_id: "SECRET", user_email: "SECRET",
      },
    ]);
    expect(rows).toEqual([{ name: "LV1", live: "true", "detail.tier": "LV1" }]);
    expect(JSON.stringify(rows)).not.toContain("SECRET");
  });

  /**
   * The regression this pins is one we MEASURED in production: the first live
   * read came back as three rows of nothing but `subscription_id`, because every
   * field naming the package sat one level down. A read that returns opaque ids
   * has not answered the question it was sent to ask.
   */
  it("keeps nested detail, because the top level is only an id", () => {
    const rows = summarizeWebullSubscriptionBody({
      data: [{ subscription_id: "973897810161594368", detail: { name: "US Stocks LV1", status: "ACTIVE" }, regions: ["us"] }],
    });
    expect(rows).toEqual([
      {
        subscription_id: "973897810161594368",
        "detail.name": "US Stocks LV1",
        "detail.status": "ACTIVE",
        "regions.0": "us",
      },
    ]);
  });

  it("returns an empty list rather than throwing on shapes we did not anticipate", () => {
    for (const body of [null, undefined, "a string", 42, [], {}, [1, 2, 3], { a: { b: { c: { d: [{ x: "deep" }] } } } }]) {
      expect(() => summarizeWebullSubscriptionBody(body)).not.toThrow();
      expect(Array.isArray(summarizeWebullSubscriptionBody(body))).toBe(true);
    }
  });

  it("is bounded, so a huge list cannot become the response body", () => {
    const huge = Array.from({ length: 500 }, (_, i) => ({ id: String(i), note: "x".repeat(400) }));
    const rows = summarizeWebullSubscriptionBody(huge);
    expect(rows).toHaveLength(25);
    expect(rows.every((row) => row.note.length <= 96)).toBe(true);
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
    // new rung silently stops being climbed. The additions are the two
    // OUT-OF-BAND reads, neither of which is a ladder rung — the subscription
    // inventory (once) and the real-time streaming lane (once per signing
    // profile). This fixture denies every market-data path, so no streaming
    // subscription is ever accepted and none has to be released.
    expect(seen).toHaveLength(webullRungSpecs("TSLA").length + 1 + WEBULL_SIGNING_PROFILES.length);
    expect(seen.filter((url) => url.includes("/app/subscriptions/list"))).toHaveLength(1);
    // The whole reason it is out of band: it must never reach the verdict.
    expect(report.rungs.some((rung) => rung.rung === "SUBSCRIPTIONS")).toBe(false);
    expect(report.verdict).toBe("APP_KEY_ENTITLEMENT_ISOLATED");
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

  /**
   * MEASURED against production, twice, 2026-09-21: /app/subscriptions/list
   * answers with bare ids and NOTHING else. The obvious next move — the SDK's
   * `set_subscription_id` — was built, shipped and measured: asking for one id
   * returns THE SAME id-only list, so the filter is ignored and the "expansion"
   * only manufactures duplicate rows.
   *
   * This test is the guard on that measurement. It fails the moment someone
   * re-derives the obviously-correct-on-paper follow-the-id loop.
   */
  it("asks for the subscription list exactly once and never filters by id", async () => {
    const asked: string[] = [];
    const fetchImpl = (async (url: URL) => {
      const href = String(url);
      if (href.includes("/app/subscriptions/list")) {
        asked.push(href);
        return new Response(JSON.stringify({ data: [{ subscription_id: "S1" }, { subscription_id: "S2" }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    const report = await probeWebullEntitlement(fetchImpl, {
      appKey: "k", appSecret: "s", accessToken: "t",
      now: () => new Date("2026-09-21T05:00:00.000Z"), nonce: () => "n".repeat(32),
    });

    expect(asked).toHaveLength(1);
    expect(asked[0]).not.toContain("subscription_id=");
    expect(report.subscriptions?.rows).toEqual([
      { subscription_id: "S1" },
      { subscription_id: "S2" },
    ]);
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
    // Ladder rungs + every out-of-band read; the minted session has to travel
    // on ALL of them, including the ones that are not rungs. This fixture
    // answers 200 to everything, so each signing profile opens a streaming
    // subscription AND releases it — two calls per profile.
    expect(tokens).toHaveLength(
      webullRungSpecs("TSLA").length + 1 + WEBULL_SIGNING_PROFILES.length * 2,
    );
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

/**
 * ── THE DOOR THE LADDER NEVER KNOCKED ON ────────────────────────────────────
 *
 * Every rung above measures Webull's REST pull product. Its real-time product
 * is a separate lane — an MQTT socket at `data-api.webull.com`, authorised by a
 * signed POST to `/market-data/streaming/subscribe`. For three months the pull
 * lane's 403 was read as "no market data", a sentence that sent the Founder to
 * buy something he already owned, when nothing in evidence had ever asked the
 * door that actually carries real time.
 *
 * These tests pin the two properties that make asking it trustworthy: the
 * request must be shaped as the SDK shapes it (POST, body signed, subscription
 * released), and the reading must refuse to launder a streaming OK into a
 * verdict about the pull lane.
 */
describe("the Webull real-time streaming lane is asked, and asked correctly", () => {
  const base = {
    appKey: "public-test-key",
    appSecret: "public-test-secret",
    accessToken: "session",
    now: () => new Date("2026-09-21T05:00:00.000Z"),
    nonce: () => "n".repeat(32),
    mintSession: false as const,
  };

  interface Sent {
    readonly path: string;
    readonly method: string;
    readonly body: string | null;
    readonly signature: string;
    readonly version: string;
  }

  function recordingFetch(streamingStatus: number, sent: Sent[]): typeof fetch {
    return (async (url: URL, init?: RequestInit) => {
      const target = new URL(String(url));
      const headers = (init?.headers ?? {}) as Record<string, string>;
      sent.push({
        path: target.pathname,
        method: init?.method ?? "GET",
        body: typeof init?.body === "string" ? init.body : null,
        signature: headers["x-signature"] ?? "",
        version: headers["x-version"] ?? "",
      });
      if (target.pathname.includes("/streaming/")) {
        return new Response(
          JSON.stringify(streamingStatus === 200 ? {} : { code: "MARKET_DATA_NOT_SUBSCRIBED" }),
          { status: streamingStatus },
        );
      }
      if (target.pathname.startsWith("/market-data/")) {
        return new Response(JSON.stringify({ code: "MARKET_DATA_NOT_SUBSCRIBED" }), { status: 403 });
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as unknown as typeof fetch;
  }

  it("POSTs a signed body to the streaming lane rather than GETting it", async () => {
    const sent: Sent[] = [];
    await probeWebullEntitlement(recordingFetch(200, sent), { ...base, symbol: "TSLA" });

    const subscribes = sent.filter((s) => s.path === "/market-data/streaming/subscribe");
    expect(subscribes).toHaveLength(WEBULL_SIGNING_PROFILES.length);
    for (const call of subscribes) {
      expect(call.method).toBe("POST");
      expect(call.version).toBe("v3");
      // Webull signs a digest of the body. A POST sent without one is signed for
      // a DIFFERENT request, and the 403 it earns is indistinguishable from the
      // entitlement 403 this whole probe exists to stop misreading.
      expect(call.body).toBeTruthy();
      expect(JSON.parse(call.body!)).toMatchObject({
        symbols: ["TSLA"],
        category: "US_STOCK",
        sub_types: ["QUOTE", "SNAPSHOT", "TICK"],
      });
      expect(call.signature).toBeTruthy();
    }
    // The two profiles must not produce the same signature, or "tried under
    // every profile" would be one attempt wearing two labels.
    expect(new Set(subscribes.map((s) => s.signature)).size).toBe(subscribes.length);
  });

  it("releases every subscription it opens", async () => {
    const sent: Sent[] = [];
    const report = await probeWebullEntitlement(recordingFetch(200, sent), base);

    const opened = sent.filter((s) => s.path === "/market-data/streaming/subscribe").length;
    const released = sent.filter((s) => s.path === "/market-data/streaming/unsubscribe");
    expect(released).toHaveLength(opened);
    expect(report.streaming?.released).toBe(opened);
    for (const call of released) {
      expect(call.method).toBe("POST");
      expect(JSON.parse(call.body!)).toMatchObject({ unsubscribe_all: true });
    }
  });

  it("opens no subscription to release when the lane refuses", async () => {
    const sent: Sent[] = [];
    const report = await probeWebullEntitlement(recordingFetch(403, sent), base);

    expect(sent.filter((s) => s.path === "/market-data/streaming/unsubscribe")).toHaveLength(0);
    expect(report.streaming?.reachable).toBe(false);
    expect(report.streaming?.released).toBe(0);
  });

  it("never lets a streaming answer move the pull-lane verdict", async () => {
    const sent: Sent[] = [];
    const report = await probeWebullEntitlement(recordingFetch(200, sent), base);

    // The ladder measured the pull product and must keep saying so. If a
    // streaming OK could rewrite this, the receipt would be laundering evidence
    // about one product into a claim about another.
    expect(report.verdict).toBe("APP_KEY_ENTITLEMENT_ISOLATED");
    expect(report.streaming?.reachable).toBe(true);
  });

  it("says out loud that a streaming OK forbids telling anyone to buy market data", () => {
    const read = readWebullStreamingLane(
      [{ signingProfile: "sdk-sha256", outcome: "OK", httpStatus: 200, providerCode: null }],
      true,
    );
    expect(read.reachable).toBe(true);
    expect(read.note).toMatch(/two different products/i);
    expect(read.note).toMatch(/nobody may be told to buy market data/i);
  });

  it("calls a denial across both products what it is — new evidence, not the old evidence", () => {
    const read = readWebullStreamingLane(
      WEBULL_SIGNING_PROFILES.map((signingProfile) => ({
        signingProfile,
        outcome: "DENIED_ENTITLEMENT" as const,
        httpStatus: 403,
        providerCode: "MARKET_DATA_NOT_SUBSCRIBED",
      })),
      true,
    );
    expect(read.reachable).toBe(false);
    expect(read.note).toMatch(/FIRST evidence/);
    expect(read.note).toMatch(/real-time/i);
  });

  it("refuses to grade a streaming attempt that timed out", () => {
    const read = readWebullStreamingLane(
      [{ signingProfile: "legacy-sha1", outcome: "TIMEOUT", httpStatus: null, providerCode: null }],
      true,
    );
    expect(read.reachable).toBe(false);
    expect(read.note).toMatch(/proves nothing/i);
  });
});
