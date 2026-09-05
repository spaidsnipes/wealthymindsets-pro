import { describe, it, expect } from "vitest";
import {
  PROVIDER_REQUIREMENTS,
  computeProviderReadiness,
  computeAllProviderReadiness,
  allProviderEnvNames,
  computeEnvParity,
  detectEnvNameNearMisses,
  isEnvPresent,
  readinessSummary,
  type EnvPresence,
  type ProviderId,
} from "./providerReadiness";

describe("isEnvPresent", () => {
  it("treats undefined, empty, and whitespace-only as absent", () => {
    const env: EnvPresence = { A: undefined, B: "", C: "   ", D: "x" };
    expect(isEnvPresent(env, "A")).toBe(false);
    expect(isEnvPresent(env, "B")).toBe(false);
    expect(isEnvPresent(env, "C")).toBe(false);
    expect(isEnvPresent(env, "MISSING")).toBe(false);
    expect(isEnvPresent(env, "D")).toBe(true);
  });
});

describe("computeProviderReadiness", () => {
  it("READY only when every required var is present & non-empty", () => {
    const env: EnvPresence = {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
      WEBULL_API_HOST: "https://api.example",
    };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("READY");
    expect(r.missing).toEqual([]);
  });

  it("BLOCKED lists the EXACT missing required vars", () => {
    const env: EnvPresence = { WEBULL_API_KEY: "k" };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["WEBULL_APP_SECRET"]);
  });

  it("recommended vars never gate READY but are reported as fidelity gaps", () => {
    const env: EnvPresence = {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
      WEBULL_API_HOST: "h",
    };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("READY");
    expect(r.missingRecommended).not.toContain("WEBULL_API_HOST");
    expect(r.missingRecommended).not.toContain("WEBULL_ACCESS_TOKEN");
    expect(r.missingRecommended).toContain("WEBULL_DATA_URL");
    expect(r.missingRecommended).toContain("WEBULL_CANARY_SYMBOL");
  });

  it("uses the adapter's default Webull host without falsely blocking readiness", () => {
    const r = computeProviderReadiness("webull-data", {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
    });
    expect(r.status).toBe("READY");
    expect(r.missing).toEqual([]);
    expect(r.missingRecommended).toContain("WEBULL_API_HOST");
    expect(r.missingRecommended).not.toContain("WEBULL_ACCESS_TOKEN");
  });

  it("tastytrade needs the client pair AND a refresh token", () => {
    const partial: EnvPresence = {
      TASTYTRADE_CLIENT_ID: "id",
      TASTYTRADE_CLIENT_SECRET: "sec",
    };
    const r = computeProviderReadiness("tastytrade", partial);
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["TASTYTRADE_REFRESH_TOKEN"]);
  });

  it("moomoo needs both bridge url and token", () => {
    const r = computeProviderReadiness("moomoo", { MOOMOO_BRIDGE_URL: "u" });
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["MOOMOO_BRIDGE_TOKEN"]);
  });

  it("Longbridge needs both portable bridge names", () => {
    const r = computeProviderReadiness("longbridge-data", { LONGBRIDGE_BRIDGE_URL: "u" });
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["LONGBRIDGE_BRIDGE_TOKEN"]);
  });

  it("empty env → every provider BLOCKED", () => {
    const all = computeAllProviderReadiness({});
    expect(all.every((r) => r.status === "BLOCKED")).toBe(true);
    expect(all.length).toBe(PROVIDER_REQUIREMENTS.length);
  });

  it("throws on an unknown provider id", () => {
    expect(() => computeProviderReadiness("not-a-provider" as ProviderId, {})).toThrow();
  });
});

/**
 * The market-data and realtime lanes the receipt could not see.
 *
 * Until now PROVIDER_REQUIREMENTS listed brokers only. That is why
 * /api/broker/readiness reported "1/7 providers READY" and said nothing at
 * all while /api/finnhub was answering 503 and the stock tape was dead: the
 * var that actually broke the product was not in the table, so no row could
 * turn BLOCKED. A receipt that cannot mention a lane cannot report it.
 */
describe("market-data & realtime lanes (the ones the receipt was blind to)", () => {
  it("finnhub BLOCKED names the same var the live 503 named", () => {
    const r = computeProviderReadiness("finnhub", {});
    expect(r.status).toBe("BLOCKED");
    // Production answered {"edge":"NOT CONFIGURED","missing":["FINNHUB_KEY"]}.
    // The receipt must name it identically or the two disagree.
    expect(r.missing).toEqual(["FINNHUB_KEY"]);
    expect(r.lane).toBe("market-data");
  });

  it("finnhub accepts the NEXT_PUBLIC_ fallback the route actually reads", () => {
    // /api/finnhub: process.env.FINNHUB_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_KEY
    const r = computeProviderReadiness("finnhub", { NEXT_PUBLIC_FINNHUB_KEY: "k" });
    expect(r.status).toBe("READY");
    expect(r.missing).toEqual([]);
  });

  it("finnhub is NOT satisfied by the trailing-underscore host name", () => {
    // The exact Cloudflare secret that was installed on 2026-09-05. The code
    // never reads it, so the table must never round it up to READY — that
    // would restore the original lie in a new place.
    const r = computeProviderReadiness("finnhub", { FINNHUB_KEY_: "redacted" });
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["FINNHUB_KEY"]);
  });

  it("polygon accepts its NEXT_PUBLIC_ fallback, blocks with neither", () => {
    expect(computeProviderReadiness("polygon", { NEXT_PUBLIC_POLYGON_KEY: "k" }).status).toBe("READY");
    expect(computeProviderReadiness("polygon", {}).missing).toEqual(["POLYGON_KEY"]);
  });

  it("livekit needs the token pair AND the browser-facing host", () => {
    const r = computeProviderReadiness("livekit", {
      LIVEKIT_API_KEY: "k",
      LIVEKIT_API_SECRET: "s",
    });
    expect(r.status).toBe("BLOCKED");
    // A minted token with no wss host cannot open a room.
    expect(r.missing).toEqual(["NEXT_PUBLIC_LIVEKIT_URL"]);
    expect(r.lane).toBe("realtime");
  });

  it("livekit is NOT satisfied by the ATH_-prefixed host names", () => {
    const r = computeProviderReadiness("livekit", {
      ATH_LIVEKIT_KEY_: "redacted",
      ATH_LIVEKIT_KEY_SECRET_: "redacted",
    });
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual([
      "LIVEKIT_API_KEY",
      "LIVEKIT_API_SECRET",
      "NEXT_PUBLIC_LIVEKIT_URL",
    ]);
  });
});

describe("declarative aliases & alternative groups", () => {
  it("an alias satisfies its canonical name independently (webull)", () => {
    const r = computeProviderReadiness("webull-data", {
      WEBULL_API_KEY: "k",
      WEBULL_APP_SECRET: "s",
    });
    expect(r.status).toBe("READY");
  });

  it("an alternative GROUP is all-or-nothing, unlike a per-name alias", () => {
    // Half the legacy pair does not satisfy either canonical name — proven by
    // the incomplete-pair case below and by alpaca-live's own tests.
    expect(computeProviderReadiness("alpaca-live", {
      ALPACA_BROKERAGE_KEY: "legacy-key",
    }).missing).toEqual(["ALPACA_KEY", "ALPACA_SECRET"]);
  });

  it("every alias key names a var that is actually required", () => {
    // A typo'd alias key is silently inert — it would look like a declared
    // fallback while doing nothing. Fail loudly instead.
    for (const r of PROVIDER_REQUIREMENTS) {
      for (const key of Object.keys(r.aliases ?? {})) {
        expect(r.required).toContain(key);
      }
    }
  });

  it("no alias or group name collides with a required name of the same provider", () => {
    for (const r of PROVIDER_REQUIREMENTS) {
      const alternates = [
        ...Object.values(r.aliases ?? {}).flat(),
        ...(r.alternativeGroups ?? []).flat(),
      ];
      for (const name of alternates) {
        expect(r.required).not.toContain(name);
      }
    }
  });

  it("no alternative group is empty (an empty group must never grant READY)", () => {
    for (const r of PROVIDER_REQUIREMENTS) {
      for (const group of r.alternativeGroups ?? []) {
        expect(group.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("requirement table integrity", () => {
  it("has no duplicate provider ids", () => {
    const ids = PROVIDER_REQUIREMENTS.map((r) => r.provider);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no var is both required and recommended for the same provider", () => {
    for (const r of PROVIDER_REQUIREMENTS) {
      const overlap = r.required.filter((n) => r.recommended.includes(n));
      expect(overlap).toEqual([]);
    }
  });

  it("allProviderEnvNames is sorted, de-duplicated, and covers every referenced var", () => {
    const names = allProviderEnvNames();
    expect([...names]).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
    for (const r of PROVIDER_REQUIREMENTS) {
      // Aliases and alternative groups are real host names. If they were not
      // in the union, a host carrying only the legacy/fallback name would show
      // an empty presence row and the receipt would understate what is set.
      for (const n of [
        ...r.required,
        ...r.recommended,
        ...Object.values(r.aliases ?? {}).flat(),
        ...(r.alternativeGroups ?? []).flat(),
      ]) {
        expect(names).toContain(n);
      }
    }
  });
});

describe("computeEnvParity (local ↔ host)", () => {
  const names = ["A", "B", "C", "D"];

  it("in parity when present on both sides (or absent on both)", () => {
    const local: EnvPresence = { A: "1", B: "2" };
    const host: EnvPresence = { A: "1", B: "2" };
    const report = computeEnvParity(names, local, host);
    expect(report.inParity).toBe(true);
    expect(report.drift).toEqual([]);
    expect(report.rows.find((r) => r.name === "C")?.status).toBe("ABSENT_BOTH");
  });

  it("flags LOCAL_ONLY and HOST_ONLY drift by name, never by value", () => {
    const local: EnvPresence = { A: "1", B: "2" };
    const host: EnvPresence = { A: "1", D: "4" };
    const report = computeEnvParity(names, local, host);
    expect(report.inParity).toBe(false);
    const byName = Object.fromEntries(report.rows.map((r) => [r.name, r.status]));
    expect(byName.A).toBe("OK");
    expect(byName.B).toBe("LOCAL_ONLY");
    expect(byName.C).toBe("ABSENT_BOTH");
    expect(byName.D).toBe("HOST_ONLY");
    expect(report.drift.map((r) => r.name).sort()).toEqual(["B", "D"]);
  });
});

describe("readinessSummary", () => {
  it("counts READY providers", () => {
    const env: EnvPresence = {
      ALPACA_KEY: "k",
      ALPACA_SECRET: "s",
    };
    const all = computeAllProviderReadiness(env);
    expect(readinessSummary(all)).toBe(`1/${all.length} providers READY`);
  });
});

describe("Alpaca legacy Cloudflare readiness", () => {
  it("recognizes the complete legacy pair without requiring duplicate canonical bindings", () => {
    const readiness = computeProviderReadiness("alpaca-live", {
      ALPACA_BROKERAGE_KEY: "legacy-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    });
    expect(readiness.status).toBe("READY");
    expect(readiness.missing).toEqual([]);
    expect(allProviderEnvNames()).toEqual(expect.arrayContaining([
      "ALPACA_BROKERAGE_KEY",
      "ALPACA_BROKERAGE_KEY_SECRET_",
    ]));
  });

  it("does not combine an incomplete canonical pair with an incomplete legacy pair", () => {
    expect(computeProviderReadiness("alpaca-live", {
      ALPACA_KEY: "canonical-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    }).status).toBe("BLOCKED");
  });
});

/**
 * §22 Orkin — these cases are transcriptions of a REAL production incident
 * (2026-09-05), not invented fixtures. On that day wealthymindsetspro.com
 * answered:
 *
 *   GET /api/finnhub?sym=TSLA  →  503
 *   {"edge":"NOT CONFIGURED","missing":["FINNHUB_KEY"],"source":"finnhub"}
 *
 * while the Cloudflare host carried a secret literally named `FINNHUB_KEY_`.
 * A Sentinel written against a hypothetical typo would be theatre; these are
 * the exact strings that were on the screen.
 */
describe("detectEnvNameNearMisses (canon: a lookalike is not agreement)", () => {
  it("catches the trailing-underscore typo that killed the live tape", () => {
    const hits = detectEnvNameNearMisses(["FINNHUB_KEY"], { FINNHUB_KEY_: "redacted" });
    expect(hits).toEqual([
      { expected: "FINNHUB_KEY", found: "FINNHUB_KEY_", confidence: "EXACT_MODULO_PUNCTUATION" },
    ]);
  });

  it("catches the ATH_-prefixed LiveKit pair as a lower-confidence lead", () => {
    const hits = detectEnvNameNearMisses(
      ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"],
      { ATH_LIVEKIT_KEY_: "redacted", ATH_LIVEKIT_KEY_SECRET_: "redacted" },
    );
    // Both host keys share the distinctive token LIVEKIT with both expected
    // names, so every pairing is a legitimate lead to check.
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits.every((h) => h.confidence === "SHARED_DISTINCTIVE_TOKENS")).toBe(true);
    expect(hits.map((h) => h.found)).toEqual(
      expect.arrayContaining(["ATH_LIVEKIT_KEY_", "ATH_LIVEKIT_KEY_SECRET_"]),
    );
  });

  it("stays silent when the expected name actually resolved", () => {
    // The whole point: a working var must not generate noise just because an
    // odd-looking neighbour exists. A Sentinel that cries wolf gets ignored.
    expect(detectEnvNameNearMisses(["FINNHUB_KEY"], {
      FINNHUB_KEY: "resolved",
      FINNHUB_KEY_: "leftover",
    })).toEqual([]);
  });

  it("does not pair unrelated providers that merely share a generic token", () => {
    // FINNHUB_KEY and ALPACA_KEY both end in _KEY. If generic tokens counted,
    // every credential in the account would 'match' every other one.
    expect(detectEnvNameNearMisses(["FINNHUB_KEY"], { ALPACA_KEY: "k" })).toEqual([]);
    expect(detectEnvNameNearMisses(["ALPACA_SECRET"], { TASTYTRADE_SECRET: "s" })).toEqual([]);
  });

  it("ranks the near-certain typo above the merely-plausible lead", () => {
    const hits = detectEnvNameNearMisses(
      ["FINNHUB_KEY", "LIVEKIT_API_KEY"],
      { FINNHUB_KEY_: "redacted", ATH_LIVEKIT_KEY_: "redacted" },
    );
    expect(hits[0].confidence).toBe("EXACT_MODULO_PUNCTUATION");
    expect(hits[0].expected).toBe("FINNHUB_KEY");
  });

  it("ignores host keys that are present-but-empty", () => {
    // isEnvPresent is the single definition of 'present'. An empty secret is
    // absent, so it cannot be the explanation for a missing one.
    expect(detectEnvNameNearMisses(["FINNHUB_KEY"], { FINNHUB_KEY_: "   " })).toEqual([]);
  });

  it("emits NAMES only — never a value (secrets boundary)", () => {
    const hits = detectEnvNameNearMisses(["FINNHUB_KEY"], { FINNHUB_KEY_: "super-secret-value" });
    expect(JSON.stringify(hits)).not.toContain("super-secret-value");
    expect(Object.keys(hits[0]).sort()).toEqual(["confidence", "expected", "found"]);
  });

  it("closes the ABSENT_BOTH blind spot that let this ship", () => {
    // computeEnvParity scores FINNHUB_KEY as ABSENT_BOTH and calls that
    // agreement — inParity stays true while the tape is dead. The near-miss
    // detector is what makes the same env legible.
    const host: EnvPresence = { FINNHUB_KEY_: "redacted" };
    const parity = computeEnvParity(["FINNHUB_KEY"], {}, host);
    expect(parity.inParity).toBe(true);            // the blind spot, documented
    expect(detectEnvNameNearMisses(["FINNHUB_KEY"], host)).toHaveLength(1); // and covered
  });
});
