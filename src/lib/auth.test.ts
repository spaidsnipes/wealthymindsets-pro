import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseResendSignup } from "./auth";

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
