import { afterEach, describe, expect, it, vi } from "vitest";
import {
  supabaseGetSessionEpoch,
  supabaseGetUser,
  supabaseResendSignup,
  supabaseVerifyEmail,
} from "./auth";
import { SupabaseAuthShapeError } from "./supabaseConfigStatus";

describe("supabaseResendSignup", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });

  it("requests a signup resend with the canonical confirmation redirect", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.example";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await supabaseResendSignup(
      "trader@example.com",
      "https://wealthymindsets-pro.vercel.app/login?confirmed=1",
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://project.example/auth/v1/resend?redirect_to=https%3A%2F%2Fwealthymindsets-pro.vercel.app%2Flogin%3Fconfirmed%3D1",
    );
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ apikey: "publishable-test-key" });
    expect(JSON.parse(String(init.body))).toEqual({ email: "trader@example.com", type: "signup" });
  });

  it("returns a structured failure when Supabase rejects the resend", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.example";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "rate limited" }), { status: 429 }),
    ));

    const result = await supabaseResendSignup("trader@example.com");

    expect(result.ok).toBe(false);
    expect(result.data).toEqual({ message: "rate limited" });
  });
});

/**
 * These helpers used to end in `.catch(() => ({}))` or a bare `res.json()`.
 *
 * On 2026-09-05 NEXT_PUBLIC_SUPABASE_URL on the production host held a Supabase
 * publishable KEY rather than a project URL, so every auth fetch resolved to an
 * unrelated origin that answered HTML. The swallow turned that into an empty
 * object, and each caller read the empty object as a verdict about the person:
 * "that code has expired", "no such session". Nobody was told the service was
 * misdirected, so nobody could fix it.
 *
 * A body that will not parse is a fact about the SERVICE. It must arrive as a
 * throw the caller cannot mistake for an answer.
 */
describe("auth helpers reject a non-JSON body instead of degrading to {}", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });

  function stubHtmlResponse() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://not-a-supabase-host.example";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("<!doctype html><title>Not found</title>", {
        status: 403,
        headers: { "content-type": "text/html" },
      }),
    ));
  }

  const cases: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
    ["supabaseVerifyEmail", () => supabaseVerifyEmail({ email: "t@example.com", token: "123456" })],
    ["supabaseGetUser", () => supabaseGetUser("access-token")],
    ["supabaseResendSignup", () => supabaseResendSignup("t@example.com")],
  ];

  for (const [name, call] of cases) {
    it(`${name} throws a named SupabaseAuthShapeError`, async () => {
      stubHtmlResponse();
      await expect(call()).rejects.toBeInstanceOf(SupabaseAuthShapeError);
    });

    it(`${name} reports the status and content-type but withholds the configured value`, async () => {
      stubHtmlResponse();
      const error = await call().catch((e: unknown) => e) as Error;
      expect(error.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(error.message).toContain("403");
      expect(error.message).toContain("text/html");
      // SECURITY: a URL variable holding the wrong thing is holding it because
      // someone pasted a KEY there, so the configured value must not be echoed.
      expect(error.message).not.toContain("not-a-supabase-host.example");
      // The body is evidence, not copy — a misdirected host's page can say anything.
      expect(error.message).not.toContain("Not found");
    });
  }

  it("still returns the parsed body when the backend answers JSON", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.example";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "at" }), { status: 200 }),
    ));

    const verified = await supabaseVerifyEmail({ tokenHash: "hash" });

    expect(verified).toEqual({ ok: true, data: { access_token: "at" } });
  });
});

/**
 * The SECOND blocker on the 2026-09-05 production host, recorded here as an
 * executed proof rather than an assertion from reading.
 *
 * `GET /api/diagnostics/supabase` reported `serviceRoleKeyPresent: false` while
 * Supabase auth was enabled. Session revocation is checked on every guarded
 * request through `supabaseGetSessionEpoch`, which reads the user through the
 * ADMIN api and therefore needs the service role key. Without it the lookup
 * cannot be performed, so it returns `null` — and `requireAuth` correctly fails
 * CLOSED on `null`, answering 503 "Session verification is temporarily
 * unavailable" for every authenticated route.
 *
 * Why this matters more than it looks: it is invisible while sign-in is broken,
 * because nobody can obtain a session to trip it. Repair the Supabase URL alone
 * and the host trades one outage for a second one — sign-in succeeds and then
 * every route behind it answers 503. Both variables have to be set in the same
 * visit, which is only knowable if this link is proven before the first is
 * fixed.
 */
describe("session revocation depends on the service role key", () => {
  const original = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (original === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = original;
  });

  it("cannot verify revocation when SUPABASE_SERVICE_ROLE_KEY is absent", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // `null` is the value requireAuth turns into a 503 — see requireAuth.test.ts
    // "fails closed when revocation state cannot be verified".
    await expect(supabaseGetSessionEpoch("user-1")).resolves.toBeNull();
    // And it is decided locally: no request is attempted, so this is a property
    // of the configuration and not of the network.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only service role key as absent", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "   ";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(supabaseGetSessionEpoch("user-1")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports epoch 0 — never revoked — when the admin lookup succeeds", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "user-1", user_metadata: {} }), { status: 200 }),
    ));

    await expect(supabaseGetSessionEpoch("user-1")).resolves.toBe(0);
  });

  it("reports the stored epoch when one has been set", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "user-1", user_metadata: { sessionEpoch: 1234 } }), { status: 200 }),
    ));

    await expect(supabaseGetSessionEpoch("user-1")).resolves.toBe(1234);
  });
});
