import { describe, it, expect } from "vitest";
import {
  PROVIDER_REQUIREMENTS,
  computeProviderReadiness,
  computeAllProviderReadiness,
  allProviderEnvNames,
  computeEnvParity,
  detectEnvNameNearMisses,
  detectUnaccountedEnvNameNearMisses,
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
  it("CONFIGURED only when every required var is present & non-empty", () => {
    const env: EnvPresence = {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
      WEBULL_API_HOST: "https://api.example",
    };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("CONFIGURED");
    expect(r.missing).toEqual([]);
  });

  it("BLOCKED lists the EXACT missing required vars", () => {
    const env: EnvPresence = { WEBULL_API_KEY: "k" };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["WEBULL_APP_SECRET"]);
  });

  it("recommended vars never gate CONFIGURED but are reported as fidelity gaps", () => {
    const env: EnvPresence = {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
      WEBULL_API_HOST: "h",
    };
    const r = computeProviderReadiness("webull-data", env);
    expect(r.status).toBe("CONFIGURED");
    expect(r.missingRecommended).not.toContain("WEBULL_API_HOST");
    expect(r.missingRecommended).toContain("WEBULL_ACCESS_TOKEN");
    expect(r.missingRecommended).toContain("WEBULL_DATA_URL");
    expect(r.missingRecommended).toContain("WEBULL_CANARY_SYMBOL");
  });

  it("uses the adapter's default Webull host without falsely blocking readiness", () => {
    const r = computeProviderReadiness("webull-data", {
      WEBULL_API_KEY: "k",
      WEBULL_API_SECRET: "s",
    });
    expect(r.status).toBe("CONFIGURED");
    expect(r.missing).toEqual([]);
    expect(r.missingRecommended).toContain("WEBULL_API_HOST");
    expect(r.missingRecommended).toContain("WEBULL_ACCESS_TOKEN");
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
    expect(r.status).toBe("CONFIGURED");
    expect(r.missing).toEqual([]);
  });

  /**
   * SUPERSEDED 2026-09-11 — the PREMISE changed, not the principle.
   *
   * This test asserted the opposite: that `FINNHUB_KEY_` must NOT satisfy
   * finnhub. Its stated reason was exact, and correct at the time —
   *
   *   "The code never reads it, so the table must never round it up to READY
   *    — that would restore the original lie in a new place."
   *
   * The rule it protects is: THE RECEIPT MAY DECLARE READY ONLY FOR A NAME THE
   * CODE ACTUALLY READS. That rule is untouched. What changed is the fact it
   * was applied to. `/api/finnhub` and `/api/market` now resolve their key
   * through `resolveProviderEnv`, which reads every alias declared in this
   * table — so the code DOES read `FINNHUB_KEY_`, and READY became the honest
   * answer instead of the lie.
   *
   * This mattered: the secret was present on the production host the entire
   * time, and BLOCKED kept the real-time US equity tape dark for six days.
   * Holding the old answer would not have been caution — it would have been a
   * receipt that was wrong in the other direction.
   *
   * The rule's teeth now live in `resolveProviderEnv.test.ts` ("THE HALF-FIX
   * GUARD"), which fails if any consumer goes back to hand-writing its own env
   * names — the only way this READY could become a lie again.
   */
  it("finnhub is satisfied by the trailing-underscore host name the code now reads", () => {
    const r = computeProviderReadiness("finnhub", { FINNHUB_KEY_: "redacted" });
    expect(r.status).toBe("CONFIGURED");
    expect(r.missing).toEqual([]);
  });

  it("finnhub stays BLOCKED for a lookalike NO consumer resolves", () => {
    // The supersede above is narrow: it turns entirely on the alias being
    // DECLARED, and therefore read. An undeclared neighbour must still block.
    const r = computeProviderReadiness("finnhub", { FINNHUB_KEY__: "redacted", FINNHUB_SECRET: "x" });
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["FINNHUB_KEY"]);
  });

  it("polygon accepts its NEXT_PUBLIC_ fallback, blocks with neither", () => {
    expect(computeProviderReadiness("polygon", { NEXT_PUBLIC_POLYGON_KEY: "k" }).status).toBe("CONFIGURED");
    expect(computeProviderReadiness("polygon", {}).missing).toEqual(["POLYGON_KEY"]);
  });

  it("livekit needs the token pair AND the browser-facing host", () => {
    const r = computeProviderReadiness("livekit", {
      LIVEKIT_API_KEY: "k",
      LIVEKIT_API_SECRET: "s",
    });
    expect(r.status).toBe("BLOCKED");
    // A minted token with no wss host cannot open a room. The name reported is
    // the RUNTIME one (LIVEKIT_URL) — see "the receipt names an installable
    // artifact" below for why reporting the NEXT_PUBLIC_ spelling here would
    // be an instruction the operator cannot successfully follow.
    expect(r.missing).toEqual(["LIVEKIT_URL"]);
    expect(r.lane).toBe("realtime");
  });

  /**
   * SUPERSEDED 2026-09-21 — same shape as the FINNHUB_KEY_ supersede above,
   * for the same reason and under the same rule.
   *
   * This asserted that ATH_LIVEKIT_KEY_ / ATH_LIVEKIT_KEY_SECRET_ must NOT
   * satisfy livekit. That was correct while NO consumer read those names. It
   * is no longer the fact: `/api/livekit` and `/api/livekit/approve` now
   * resolve all three credentials through `resolveProviderEnv`, so the code
   * genuinely reads them.
   *
   * THE RULE IS UNCHANGED — the receipt may declare a name satisfied only when
   * the code actually reads it. `resolveProviderEnv.test.ts` holds the teeth.
   */
  it("livekit accepts the trailing-underscore host pair the routes now read", () => {
    const r = computeProviderReadiness("livekit", {
      ATH_LIVEKIT_KEY_: "redacted",
      ATH_LIVEKIT_KEY_SECRET_: "redacted",
    });
    // Still BLOCKED — and on ONE name, not three. That narrowing is the whole
    // point: the operator is now told the single thing that is actually
    // absent instead of three things, two of which are present under another
    // spelling.
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["LIVEKIT_URL"]);
  });

  it("THE RECEIPT NAMES AN INSTALLABLE ARTIFACT: the host is LIVEKIT_URL", () => {
    // Until 2026-09-21 this row REQUIRED `NEXT_PUBLIC_LIVEKIT_URL`, so the
    // receipt told the operator to create a Cloudflare secret under a name
    // that is inlined AT BUILD TIME. WM Pro builds on a laptop and deploys to
    // Cloudflare, so that secret can never be read: the operator follows the
    // instruction exactly, correctly, and the Lounge stays dark with no error
    // naming a variable.
    //
    // A receipt that names an unsatisfiable artifact is worse than silence —
    // it spends the operator's trust to produce a guaranteed no-op. The
    // canonical name must therefore be the RUNTIME name.
    const r = computeProviderReadiness("livekit", {
      ATH_LIVEKIT_KEY_: "redacted",
      ATH_LIVEKIT_KEY_SECRET_: "redacted",
    });
    expect(r.missing).toEqual(["LIVEKIT_URL"]);
    expect(r.missing).not.toContain("NEXT_PUBLIC_LIVEKIT_URL");
  });

  it("livekit's wss host resolves under the canonical runtime name", () => {
    const r = computeProviderReadiness("livekit", {
      ATH_LIVEKIT_KEY_: "redacted",
      ATH_LIVEKIT_KEY_SECRET_: "redacted",
      LIVEKIT_URL: "wss://example.livekit.cloud",
    });
    expect(r.status).toBe("CONFIGURED");
    expect(r.missing).toEqual([]);
  });

  it("the LEGACY NEXT_PUBLIC_ host spelling still satisfies the lane", () => {
    // Demoting a name to an alias must never strand a host that already
    // carries it. An alias is a migration tool: it keeps the old spelling
    // working while the canonical one becomes the thing we tell people to set.
    const r = computeProviderReadiness("livekit", {
      ATH_LIVEKIT_KEY_: "redacted",
      ATH_LIVEKIT_KEY_SECRET_: "redacted",
      NEXT_PUBLIC_LIVEKIT_URL: "wss://legacy.livekit.cloud",
    });
    expect(r.status).toBe("CONFIGURED");
    expect(r.missing).toEqual([]);
  });

  it("livekit stays BLOCKED for a lookalike no consumer resolves", () => {
    // The supersede is narrow: it turns on the alias being DECLARED, and
    // therefore read. An undeclared neighbour must still block.
    const r = computeProviderReadiness("livekit", {
      ATH_LIVEKIT_KEY: "redacted",
      LIVEKIT_SECRET: "redacted",
      LIVEKIT_WS_URL: "wss://example.livekit.cloud",
    });
    expect(r.status).toBe("BLOCKED");
    expect(r.missing).toEqual(["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"]);
  });
});

describe("declarative aliases & alternative groups", () => {
  it("an alias satisfies its canonical name independently (webull)", () => {
    const r = computeProviderReadiness("webull-data", {
      WEBULL_API_KEY: "k",
      WEBULL_APP_SECRET: "s",
    });
    expect(r.status).toBe("CONFIGURED");
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
  it("counts configured provider setups without implying a live wire", () => {
    const env: EnvPresence = {
      ALPACA_KEY: "k",
      ALPACA_SECRET: "s",
    };
    const all = computeAllProviderReadiness(env);
    expect(readinessSummary(all)).toBe(`1/${all.length} provider setups present`);
  });
});

describe("Alpaca legacy Cloudflare readiness", () => {
  it("recognizes the complete legacy pair without requiring duplicate canonical bindings", () => {
    const readiness = computeProviderReadiness("alpaca-live", {
      ALPACA_BROKERAGE_KEY: "legacy-key",
      ALPACA_BROKERAGE_KEY_SECRET_: "legacy-secret",
    });
    expect(readiness.status).toBe("CONFIGURED");
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

  /**
   * The three rows below were READ OFF THE LIVE /readiness PANEL on authenticated
   * Founder glass. They are not hypotheticals — each one occupied a line in the
   * NAME MISMATCH SUSPECTED receipt, next to the genuine leads, teaching the
   * reader that the panel is skippable.
   */
  it("does not accuse NODE_ENV of being a misspelt TASTYTRADE_ENV", () => {
    // Shared token: ENV. NODE_ENV is present on every Node runtime in existence,
    // so 'it is present and it shares a word' is evidence of nothing at all.
    expect(detectEnvNameNearMisses(["TASTYTRADE_ENV"], { NODE_ENV: "production" })).toEqual([]);
  });

  it("does not pair WEBULL_DATA_URL with a Twelve Data key", () => {
    // Shared token: DATA. Two different vendors that both move market data are
    // not two spellings of one variable.
    expect(detectEnvNameNearMisses(["WEBULL_DATA_URL"], {
      TWELVE_DATA_KEY_: "redacted",
      TWELVE_DATA_KEY_SECRET: "redacted",
    })).toEqual([]);
  });

  it("still keeps the genuine leads standing beside those rejections", () => {
    // The rejection must not be bought by deafening the detector. Same env map,
    // same call: the vendor-named pairs survive.
    const host: EnvPresence = {
      NODE_ENV: "production",
      TWELVE_DATA_KEY_: "redacted",
      FINNHUB_SECRET: "redacted",
      ATH_LIVEKIT_KEY_: "redacted",
    };
    const hits = detectEnvNameNearMisses(
      ["TASTYTRADE_ENV", "WEBULL_DATA_URL", "NEXT_PUBLIC_FINNHUB_KEY", "NEXT_PUBLIC_LIVEKIT_URL"],
      host,
    );
    expect(hits.map((h) => `${h.expected}|${h.found}`).sort()).toEqual([
      "NEXT_PUBLIC_FINNHUB_KEY|FINNHUB_SECRET",
      "NEXT_PUBLIC_LIVEKIT_URL|ATH_LIVEKIT_KEY_",
    ]);
  });

  it("takes its notion of 'distinctive' from the provider table, not a word list", () => {
    // The regression this fences: someone declares a provider in
    // PROVIDER_REQUIREMENTS and the detector goes on not recognising its name
    // because a SECOND list was never updated. Every declared vendor must be a
    // token the detector can match on, derived — never retyped.
    for (const req of PROVIDER_REQUIREMENTS) {
      const vendor = req.provider.split("-")[0].toUpperCase();
      const hits = detectEnvNameNearMisses([`${vendor}_API_KEY`], { [`ATH_${vendor}_KEY_`]: "x" });
      expect(hits, `${req.provider} is declared but its name is not distinctive`).toHaveLength(1);
    }
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

describe("detectUnaccountedEnvNameNearMisses (the one-call receipt entry point)", () => {
  /**
   * The original fixture here was `FINNHUB_KEY_`, and it was the right one
   * until 2026-09-11, when that name was DECLARED as a finnhub alias and the
   * consumers were wired to read it. An accounted-for name must fall silent —
   * that is this detector's documented contract — so Finnhub can no longer
   * demonstrate an unaccounted hit.
   *
   * It then used `ATH_LIVEKIT_KEY_` — and on 2026-09-21 that name graduated
   * the same way, for the same reason: declared as a livekit alias, read by
   * `/api/livekit` and `/api/livekit/approve` through `resolveProviderEnv`.
   *
   * Two fixtures lost to the detector doing its job is the success case, not a
   * maintenance burden. What is left has no CONFIRMED-live undeclared name to
   * point at, so the fixture below is SYNTHETIC and says so. The contract it
   * asserts — an unaccounted lookalike is NAMED rather than left as a silent
   * ABSENT_BOTH — does not depend on the name having been seen in production.
   */
  it("names an unaccounted host lookalike as the explanation", () => {
    const hits = detectUnaccountedEnvNameNearMisses({
      ALPACA_BROKERAGE_KEY: "redacted",
      ALPACA_BROKERAGE_KEY_SECRET_: "redacted",
      MOOMOO_BRIDGE_TOKEN_: "redacted",
    });
    expect(hits).toContainEqual({
      expected: "MOOMOO_BRIDGE_TOKEN",
      found: "MOOMOO_BRIDGE_TOKEN_",
      confidence: "EXACT_MODULO_PUNCTUATION",
    });
  });

  it("the LiveKit pair has GRADUATED — a declared alias is no longer a suspect", () => {
    // The 2026-09-21 fix. Reporting ATH_LIVEKIT_KEY_ now would be cry-wolf
    // noise against a name the routes genuinely read, and would point the
    // operator at the wrong gap: the wss host, not the key pair.
    const hits = detectUnaccountedEnvNameNearMisses({
      ATH_LIVEKIT_KEY_: "redacted",
      ATH_LIVEKIT_KEY_SECRET_: "redacted",
    });
    expect(hits.map((h) => h.found)).not.toContain("ATH_LIVEKIT_KEY_");
    expect(hits.map((h) => h.found)).not.toContain("ATH_LIVEKIT_KEY_SECRET_");
  });

  it("a name that has since been DECLARED stops being offered as a suspect", () => {
    // The graduation the 2026-09-11 fix performed: FINNHUB_KEY_ went from
    // "mystery lookalike" to "accounted-for alias the code reads". Reporting
    // it now would be cry-wolf noise against a working wire.
    const hits = detectUnaccountedEnvNameNearMisses({ FINNHUB_KEY_: "redacted" });
    expect(hits.map((h) => h.found)).not.toContain("FINNHUB_KEY_");
  });

  it("does NOT flag a declared alternative as a mystery lookalike", () => {
    // ALPACA_BROKERAGE_KEY is a declared alternativeGroup member. It is
    // accounted for, so it must not be offered as an explanation for the
    // absent canonical ALPACA_KEY. Declaring a fallback silences it here.
    const hits = detectUnaccountedEnvNameNearMisses({
      ALPACA_BROKERAGE_KEY: "redacted",
      ALPACA_BROKERAGE_KEY_SECRET_: "redacted",
    });
    expect(hits.map((h) => h.found)).not.toContain("ALPACA_BROKERAGE_KEY");
    expect(hits.map((h) => h.found)).not.toContain("ALPACA_BROKERAGE_KEY_SECRET_");
  });

  it("does NOT flag a declared recommended var against a missing required one", () => {
    // WEBULL_API_HOST is declared (recommended). It is a known var doing its
    // job, not a candidate explanation for the absent WEBULL_APP_KEY.
    const hits = detectUnaccountedEnvNameNearMisses({ WEBULL_API_HOST: "https://api.example" });
    expect(hits.map((h) => h.found)).not.toContain("WEBULL_API_HOST");
  });

  it("stays completely silent on a fully-configured host", () => {
    const complete: EnvPresence = Object.fromEntries(
      allProviderEnvNames().map((n) => [n, "redacted"]),
    );
    expect(detectUnaccountedEnvNameNearMisses(complete)).toEqual([]);
  });

  it("returns nothing for an empty host rather than flagging every name", () => {
    // Absent everything is a BLOCKED story, not a near-miss story. There is
    // no lookalike to point at, so the detector must not manufacture one.
    expect(detectUnaccountedEnvNameNearMisses({})).toEqual([]);
  });

  it("emits NAMES only — never a value (secrets boundary)", () => {
    const hits = detectUnaccountedEnvNameNearMisses({ FINNHUB_KEY_: "super-secret-value" });
    expect(JSON.stringify(hits)).not.toContain("super-secret-value");
  });
});
