import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseGetUser, supabaseResendSignup, supabaseVerifyEmail } from "./auth";
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
