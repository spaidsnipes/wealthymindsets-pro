import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn(), signJWT: vi.fn(), setAuthCookie: vi.fn(), verifyJWT: vi.fn(), getAuthToken: vi.fn(),
  userStore: { get: vi.fn(async () => null) }, useSupabase: () => true,
  supabaseSignIn: vi.fn(async () => { throw new Error("invalid login credentials"); }),
}));
vi.mock("@/lib/email", () => ({ sendLoginAlertEmail: vi.fn(async () => {}), loginAlertDetailsFromRequest: () => ({}) }));

import { POST } from "./route";

const attempt = (email: string, ip: string) =>
  POST(new Request("https://x/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ email, password: "wrong-password" }),
  }));

describe("login is rate-limited (brute force / shared-limit lockout, 2026-10-04)", () => {
  it("refuses the 11th attempt on one address in the window, in plain words", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 10; i++) codes.push((await attempt("target@example.com", `198.51.100.${i}`)).status);
    expect(codes.every(c => c !== 429)).toBe(true);
    const eleventh = await attempt("Target@Example.com", "198.51.100.99");
    expect(eleventh.status).toBe(429);
    expect((await eleventh.json()).error).toMatch(/Wait a minute/);
  });
});
