/**
 * Sign-in lane 2026-10-06 — a friend of the Founder could not sign in on his
 * phone. These lock the non-layout causes found in the same pass.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { signJWT, verifyJWT, MAX_SESSION_TOKEN_BYTES } from "@/lib/auth";
import { authLinkForwardTarget } from "@/lib/auth/authLinkForward";
import { squareCrop } from "@/lib/profile/avatarImage";

const read = (rel: string) => readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("the session always fits in a cookie", () => {
  const base = { sub: "u1", email: "trader@example.com", displayName: "Trader", handle: "@trader", profileComplete: true };

  it("REGRESSION: a data-URL avatar never rides in the session cookie", () => {
    const photo = `data:image/jpeg;base64,${"A".repeat(3_000_000)}`;
    const token = signJWT({ ...base, avatar: photo });
    expect(token.length).toBeLessThanOrEqual(MAX_SESSION_TOKEN_BYTES);
    const payload = verifyJWT(token);
    expect(payload?.avatar).toBeUndefined();
    // The facts the route guard needs survive.
    expect(payload?.profileComplete).toBe(true);
    expect(payload?.displayName).toBe("Trader");
  });

  it("a short https avatar URL is kept", () => {
    const payload = verifyJWT(signJWT({ ...base, avatar: "https://cdn.example.com/a.jpg" }));
    expect(payload?.avatar).toBe("https://cdn.example.com/a.jpg");
  });

  it("an oversized bio is dropped before the cookie would be refused", () => {
    const token = signJWT({ ...base, bio: "x".repeat(10_000) });
    expect(token.length).toBeLessThanOrEqual(MAX_SESSION_TOKEN_BYTES);
    expect(verifyJWT(token)?.profileComplete).toBe(true);
  });
});

describe("an emailed link that landed on the wrong page is handed on", () => {
  it("a confirmation token on the bare domain goes to /login with its fragment", () => {
    expect(authLinkForwardTarget("/", "#access_token=abc&type=signup")).toBe("/login#access_token=abc&type=signup");
  });
  it("a recovery token goes to /reset-password, even from /login", () => {
    expect(authLinkForwardTarget("/charts", "#access_token=abc&type=recovery")).toBe("/reset-password#access_token=abc&type=recovery");
    expect(authLinkForwardTarget("/login", "#access_token=abc&type=recovery")).toBe("/reset-password#access_token=abc&type=recovery");
  });
  it("an expired-link error reaches a page that can say so", () => {
    expect(authLinkForwardTarget("/", "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"))
      .toMatch(/^\/login#error=/);
  });
  it("leaves the reading pages and ordinary anchors alone", () => {
    expect(authLinkForwardTarget("/login", "#access_token=abc&type=signup")).toBeNull();
    expect(authLinkForwardTarget("/reset-password", "#access_token=abc&type=recovery")).toBeNull();
    expect(authLinkForwardTarget("/legal", "#privacy")).toBeNull();
    expect(authLinkForwardTarget("/charts", "")).toBeNull();
  });
});

describe("profile photo is cropped square before it is stored", () => {
  it("centre-crops landscape and portrait", () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000 });
    expect(squareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, side: 3000 });
  });
  it("the profile page stores the downscaled photo, never the raw file", () => {
    const src = read("app/profile/page.tsx");
    expect(src).toContain("avatarDataUrlFromFile(file)");
    expect(src).not.toMatch(/reader\.readAsDataURL\(file\)/);
  });
});

describe("phone sign-in fields", () => {
  const login = read("app/login/page.tsx");
  it("no sign-in input is under 16px (iOS zooms the page into it)", () => {
    const inputs = login.match(/<input[\s\S]*?\/>/g) ?? [];
    expect(inputs.length).toBeGreaterThanOrEqual(4);
    for (const input of inputs) expect(input, input.slice(0, 80)).not.toMatch(/text-\[1[0-5]px\]/);
  });
  it("the email field opens the email keyboard without capitals or autocorrect", () => {
    expect(login).toMatch(/type="email" required autoComplete="email"/);
    expect(login).toContain('inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}');
  });
  it("password fields name their autocomplete purpose", () => {
    expect(login).toContain('autoComplete={mode === "signup" ? "new-password" : "current-password"}');
    expect(read("app/reset-password/page.tsx")).toContain('autoComplete="new-password"');
  });
  it("auth calls are bounded so the door never spins forever", () => {
    const ctx = read("contexts/AuthContext.tsx");
    expect(ctx).toContain("fetchWithTimeout(\"/api/auth/me\"");
    expect(ctx).toContain("fetchWithTimeout(\"/api/auth/login\"");
    expect(ctx).toContain("SESSION_NOT_KEPT_MESSAGE");
  });
  it("profile setup has a way out", () => {
    expect(read("app/profile/page.tsx")).toContain("Not you? Sign out");
  });
});
