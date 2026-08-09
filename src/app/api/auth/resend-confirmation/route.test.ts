import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  useSupabase: vi.fn(),
  supabaseResendSignup: vi.fn(),
}));

import { supabaseResendSignup, useSupabase } from "@/lib/auth";
import { POST } from "./route";

const mockedUseSupabase = vi.mocked(useSupabase);
const mockedResend = vi.mocked(supabaseResendSignup);

function request(body: unknown) {
  return new Request("https://wealthymindsets-pro.vercel.app/api/auth/resend-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/resend-confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseSupabase.mockReturnValue(true);
    mockedResend.mockResolvedValue({ ok: true, data: {} });
  });

  it("normalizes the email and requests the durable confirmation redirect", async () => {
    const response = await POST(request({ email: "  Trader@Example.com " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mockedResend).toHaveBeenCalledWith(
      "trader@example.com",
      "https://wealthymindsets-pro.vercel.app/login?confirmed=1",
    );
  });

  it("does not disclose provider failures or account existence", async () => {
    mockedResend.mockRejectedValue(new Error("provider unavailable"));

    const response = await POST(request({ email: "trader@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("rejects a missing email without calling the provider", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
    expect(mockedResend).not.toHaveBeenCalled();
  });

  it("fails closed when the account service is not configured", async () => {
    mockedUseSupabase.mockReturnValue(false);

    const response = await POST(request({ email: "trader@example.com" }));

    expect(response.status).toBe(503);
    expect(mockedResend).not.toHaveBeenCalled();
  });
});
