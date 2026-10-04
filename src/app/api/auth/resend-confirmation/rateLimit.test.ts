import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ supabaseResendSignup: vi.fn(async () => {}), useSupabase: () => true }));

import { POST } from "./route";

const call = (email: string, ip = "203.0.113.9") =>
  POST(new Request("https://x/api/auth/resend-confirmation", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ email }),
  }));

describe("resend-confirmation is rate-limited (guest audit 2026-10-04)", () => {
  it("refuses the sixth mail to one address in the window", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await call("Probe@Example.com ", `198.51.100.${i}`)).status);
    expect(codes.slice(0, 5).every(c => c === 200)).toBe(true);
    expect(codes[5]).toBe(429);
  });
  it("refuses the 21st request from one IP across addresses", async () => {
    let last = 0;
    for (let i = 0; i < 21; i++) last = (await call(`a${i}@example.com`, "192.0.2.77")).status;
    expect(last).toBe(429);
  });
});
