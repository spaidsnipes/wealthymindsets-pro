import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_REFRESH_MARGIN_MS,
  EXPIRY_INTERPRETATIONS,
  MINT_OUTCOMES,
  TOKEN_DISPOSITIONS,
  WEBULL_TOKEN_STATUSES,
  describeTokenState,
  ensureWebullAccessToken,
  inMemoryTokenStore,
  interpretExpires,
  mintWebullAccessToken,
  parseTokenEnvelope,
  tokenDisposition,
  type WebullAccessToken,
} from "./webullAccessToken";

const NOW = 1_700_000_000_000;
const config = { appKey: "key", appSecret: "secret", now: () => new Date(NOW), nonce: () => "n" };

const token = (over: Partial<WebullAccessToken> = {}): WebullAccessToken => ({
  token: "t",
  status: WEBULL_TOKEN_STATUSES.NORMAL,
  expiresAtMs: NOW + 3_600_000,
  expiryInterpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS,
  observedAtMs: NOW,
  ...over,
});

describe("reading Webull's expiry without guessing its unit", () => {
  it("names how it read the number, rather than silently picking a unit", () => {
    // The SDK does int(...) and no arithmetic, so the unit is NOT established
    // by the source the Founder gave us. A silent guess here would resurrect
    // the original bug in its purest form: a token believed live after death.
    expect(interpretExpires(NOW + 60_000, NOW).interpretation).toBe(EXPIRY_INTERPRETATIONS.EPOCH_MILLIS);
    expect(interpretExpires(1_700_003_600, NOW).interpretation).toBe(EXPIRY_INTERPRETATIONS.EPOCH_SECONDS);
    expect(interpretExpires(3600, NOW).interpretation).toBe(EXPIRY_INTERPRETATIONS.DURATION_SECONDS);
  });

  it("converts each interpretation to the same instant a human would", () => {
    expect(interpretExpires(1_700_003_600, NOW).expiresAtMs).toBe(1_700_003_600_000);
    expect(interpretExpires(3600, NOW).expiresAtMs).toBe(NOW + 3_600_000);
  });

  it("refuses a 'duration' longer than a year rather than trusting a token for a decade", () => {
    // A number too big to be a lifetime and too small to be an epoch is a
    // misread, and treating it as a lifetime hands us a session we believe in
    // long past any real expiry.
    expect(interpretExpires(999_999_999, NOW).interpretation).toBe(EXPIRY_INTERPRETATIONS.UNINTERPRETABLE);
  });

  it("rejects garbage instead of coercing it to an instant", () => {
    for (const bad of [null, undefined, "", "soon", NaN, -1, 0, {}]) {
      expect(interpretExpires(bad, NOW).interpretation).toBe(EXPIRY_INTERPRETATIONS.UNINTERPRETABLE);
      expect(interpretExpires(bad, NOW).expiresAtMs).toBeUndefined();
    }
  });

  it("accepts the string form, because JSON numbers arrive as strings often enough", () => {
    expect(interpretExpires("3600", NOW).expiresAtMs).toBe(NOW + 3_600_000);
  });
});

describe("parsing a token envelope", () => {
  it("refuses a half-built token rather than returning one a caller will send anyway", () => {
    // token_manager.py treats a response missing any of the three as an error.
    expect(parseTokenEnvelope({ expires: 3600, status: "NORMAL" }, NOW)).toBeNull();
    expect(parseTokenEnvelope({ token: "t", expires: 3600 }, NOW)).toBeNull();
    expect(parseTokenEnvelope({ token: "   ", expires: 3600, status: "NORMAL" }, NOW)).toBeNull();
    expect(parseTokenEnvelope(null, NOW)).toBeNull();
    expect(parseTokenEnvelope("NORMAL", NOW)).toBeNull();
  });

  it("refuses a status the SDK does not enumerate", () => {
    expect(parseTokenEnvelope({ token: "t", expires: 3600, status: "OK" }, NOW)).toBeNull();
    expect(parseTokenEnvelope({ token: "t", expires: 3600, status: "ACTIVE" }, NOW)).toBeNull();
  });

  it("keeps a token whose expiry it could not read, but marks it unreadable", () => {
    // Discarding it would be worse: we hold a real session. Marking it is what
    // lets tokenDisposition renew rather than trust.
    const parsed = parseTokenEnvelope({ token: "t", expires: "???", status: "NORMAL" }, NOW);
    expect(parsed?.token).toBe("t");
    expect(parsed?.expiryInterpretation).toBe(EXPIRY_INTERPRETATIONS.UNINTERPRETABLE);
    expect(parsed?.expiresAtMs).toBeUndefined();
  });
});

describe("what WM Pro may DO about a token — the four remedies are not one", () => {
  it("PENDING is not a failure; it is a 2FA tap that only the Founder can make", () => {
    // Collapsing this into 'auth failed' is what sent the Founder to Webull's
    // billing page for three months instead of to his phone.
    const d = tokenDisposition(token({ status: WEBULL_TOKEN_STATUSES.PENDING }), NOW);
    expect(d).toBe(TOKEN_DISPOSITIONS.AWAITING_2FA);
    expect(d).not.toBe(TOKEN_DISPOSITIONS.NEEDS_MINT);
  });

  it("distinguishes never-had-one from had-one-and-it-died", () => {
    expect(tokenDisposition(null, NOW)).toBe(TOKEN_DISPOSITIONS.ABSENT);
    expect(tokenDisposition(token({ status: WEBULL_TOKEN_STATUSES.EXPIRED }), NOW)).toBe(TOKEN_DISPOSITIONS.NEEDS_MINT);
    expect(tokenDisposition(token({ status: WEBULL_TOKEN_STATUSES.INVALID }), NOW)).toBe(TOKEN_DISPOSITIONS.NEEDS_MINT);
  });

  it("renews BEFORE expiry, so a token never dies mid-request", () => {
    const expiresAtMs = NOW + DEFAULT_REFRESH_MARGIN_MS - 1;
    expect(tokenDisposition(token({ expiresAtMs }), NOW)).toBe(TOKEN_DISPOSITIONS.NEEDS_REFRESH);
    expect(tokenDisposition(token({ expiresAtMs: NOW + DEFAULT_REFRESH_MARGIN_MS + 1 }), NOW)).toBe(TOKEN_DISPOSITIONS.USABLE);
  });

  it("treats an already-expired token as dead, not merely stale", () => {
    expect(tokenDisposition(token({ expiresAtMs: NOW - 1 }), NOW)).toBe(TOKEN_DISPOSITIONS.NEEDS_MINT);
  });

  it("renews a token it cannot date rather than calling it usable", () => {
    // The conservative direction. The opposite choice is precisely how a dead
    // token gets sent for hours while the surface reads CONNECTED.
    const undated = token({ expiresAtMs: undefined, expiryInterpretation: EXPIRY_INTERPRETATIONS.UNINTERPRETABLE });
    expect(tokenDisposition(undated, NOW)).toBe(TOKEN_DISPOSITIONS.NEEDS_REFRESH);
    expect(tokenDisposition(undated, NOW)).not.toBe(TOKEN_DISPOSITIONS.USABLE);
  });
});

describe("what WM Pro SAYS about the session", () => {
  it("never tells the Founder to paste a credential", () => {
    // The three-month instruction that was always wrong. No sentence this
    // module produces may reproduce it.
    const states = [
      null,
      token(),
      token({ status: WEBULL_TOKEN_STATUSES.PENDING }),
      token({ status: WEBULL_TOKEN_STATUSES.EXPIRED }),
      token({ expiresAtMs: NOW + 1000 }),
    ];
    for (const state of states) {
      const said = describeTokenState(state, NOW);
      expect(said).not.toMatch(/paste|add the secret|set WEBULL_ACCESS_TOKEN|environment variable/i);
    }
  });

  it("names the Webull app when a 2FA tap is what is actually needed", () => {
    const said = describeTokenState(token({ status: WEBULL_TOKEN_STATUSES.PENDING }), NOW);
    expect(said).toMatch(/2FA/);
    expect(said).toMatch(/Webull app/i);
    expect(said).toMatch(/not an error/i);
  });

  it("never blames a market-data subscription for a session problem", () => {
    for (const state of [null, token({ status: WEBULL_TOKEN_STATUSES.EXPIRED }), token({ status: WEBULL_TOKEN_STATUSES.INVALID })]) {
      expect(describeTokenState(state, NOW)).not.toMatch(/subscription|not subscribed|purchase|buy/i);
    }
  });

  it("says plainly that a live session renews itself", () => {
    expect(describeTokenState(token(), NOW)).toMatch(/renews itself/i);
  });
});

describe("minting a session against Webull", () => {
  const ok = (body: unknown) =>
    vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));

  it("refuses to attempt a mint without the two credentials that never expire", async () => {
    const fetchImpl = vi.fn();
    const result = await mintWebullAccessToken(fetchImpl as unknown as typeof fetch, { ...config, appSecret: "" });
    expect(result.outcome).toBe(MINT_OUTCOMES.REFUSED);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.note).toMatch(/never expire/i);
  });

  it("signs with HMAC-SHA256, because the SDK's composer discards any other signer", async () => {
    const fetchImpl = ok({ token: "fresh", expires: 3600, status: "NORMAL" });
    await mintWebullAccessToken(fetchImpl as unknown as typeof fetch, config);
    const headers = (fetchImpl.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["x-signature-algorithm"]).toBe("HMAC-SHA256");
    expect(headers["x-signature-version"]).toBe("1.0");
    expect(headers["x-app-key"]).toBe("key");
    expect(headers["x-signature"]).toBeTruthy();
  });

  it("POSTs to the cited create path and sends the SAME body it signed", async () => {
    // Signing one serialisation and sending another produces a digest that
    // describes a payload which never went on the wire — a 401 that looks
    // exactly like a bad credential.
    const fetchImpl = ok({ token: "fresh", expires: 3600, status: "NORMAL" });
    await mintWebullAccessToken(fetchImpl as unknown as typeof fetch, config, "old");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.webull.com/auth/tokens/create");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"token":"old"}');
  });

  it("hands the previous token back, so a cold start does not restart 2FA", async () => {
    const fetchImpl = ok({ token: "fresh", expires: 3600, status: "NORMAL" });
    await mintWebullAccessToken(fetchImpl as unknown as typeof fetch, config);
    expect((fetchImpl.mock.calls[0][1] as RequestInit).body).toBe("{}");
  });

  it("reports a refusal verbatim without interpreting it as an entitlement problem", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ code: "INVALID_SIGNATURE" }), { status: 401 }));
    const result = await mintWebullAccessToken(fetchImpl as unknown as typeof fetch, config);
    expect(result.outcome).toBe(MINT_OUTCOMES.REFUSED);
    expect(result.note).toMatch(/INVALID_SIGNATURE/);
    expect(result.note).toMatch(/not proof about any market-data subscription/i);
    expect(result.token).toBeNull();
  });

  it("does not accept a 200 whose body is not a token envelope", async () => {
    const fetchImpl = ok({ ok: true });
    const result = await mintWebullAccessToken(fetchImpl as unknown as typeof fetch, config);
    expect(result.outcome).toBe(MINT_OUTCOMES.REFUSED);
    expect(result.token).toBeNull();
  });

  it("carries a PENDING mint through as a success that needs a human", async () => {
    const fetchImpl = ok({ token: "fresh", expires: 3600, status: "PENDING" });
    const result = await mintWebullAccessToken(fetchImpl as unknown as typeof fetch, config);
    expect(result.outcome).toBe(MINT_OUTCOMES.MINTED);
    expect(result.token?.status).toBe(WEBULL_TOKEN_STATUSES.PENDING);
    expect(result.note).toMatch(/2FA/);
  });
});

describe("ensureWebullAccessToken — the call every Webull request makes first", () => {
  const minting = (body: unknown) =>
    vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));

  it("serves a live session without touching the network", async () => {
    const fetchImpl = vi.fn();
    const store = inMemoryTokenStore(token());
    const result = await ensureWebullAccessToken(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.minted).toBe(false);
    expect(result.disposition).toBe(TOKEN_DISPOSITIONS.USABLE);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("REFUSES to re-mint over a PENDING session", async () => {
    // Re-minting here would restart the 2FA cycle on every single request, so
    // the Founder would face an endless stream of approval prompts and never
    // reach NORMAL. Declining to act IS the correct action.
    const fetchImpl = vi.fn();
    const store = inMemoryTokenStore(token({ status: WEBULL_TOKEN_STATUSES.PENDING }));
    const result = await ensureWebullAccessToken(fetchImpl as unknown as typeof fetch, config, store);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.disposition).toBe(TOKEN_DISPOSITIONS.AWAITING_2FA);
  });

  it("mints when nothing was ever stored, and persists what it got", async () => {
    const fetchImpl = minting({ token: "fresh", expires: 3600, status: "NORMAL" });
    const store = inMemoryTokenStore(null);
    const result = await ensureWebullAccessToken(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.minted).toBe(true);
    expect(result.token?.token).toBe("fresh");
    expect((await store.read())?.token).toBe("fresh");
  });

  it("uses the REFRESH path to renew and the CREATE path to replace a dead one", async () => {
    const refresh = minting({ token: "renewed", expires: 3600, status: "NORMAL" });
    await ensureWebullAccessToken(
      refresh as unknown as typeof fetch,
      config,
      inMemoryTokenStore(token({ expiresAtMs: NOW + 1000 })),
    );
    expect(refresh.mock.calls[0][0]).toBe("https://api.webull.com/openapi/auth/token/refresh");

    const create = minting({ token: "new", expires: 3600, status: "NORMAL" });
    await ensureWebullAccessToken(
      create as unknown as typeof fetch,
      config,
      inMemoryTokenStore(token({ status: WEBULL_TOKEN_STATUSES.EXPIRED })),
    );
    expect(create.mock.calls[0][0]).toBe("https://api.webull.com/auth/tokens/create");
  });

  it("does not persist a failed mint over a session it still holds a name for", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 500 }));
    const store = inMemoryTokenStore(token({ status: WEBULL_TOKEN_STATUSES.EXPIRED }));
    const result = await ensureWebullAccessToken(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.token).toBeNull();
    expect((await store.read())?.token).toBe("t");
  });
});
