import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";

// Route gated behind requireAuth so the per-provider infra status isn't
// public recon. Tests stub the auth so the existing assertions still cover
// the truthful-status behavior; a separate test proves the 401 path.
vi.mock("@/lib/requireAuth", () => ({
  requireAuth: vi.fn(async () => ({ ok: true, user: { sub: "u1" } })),
}));

import { GET } from "./route";
import { requireAuth } from "@/lib/requireAuth";
import { missingSecretsForState, webullCredentialPresence } from "@/lib/broker/webullStatus";

function req(): Request {
  return new Request("http://localhost/api/broker/webull/status");
}

describe("/api/broker/webull/status — canon §12 truth", () => {
  it("returns the unconfigured live probe honestly (never claims wired)", async () => {
    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.provider).toBe("webull");
    expect(body.authMode).toBe("SIGNED_OPENAPI");
    expect(body.implemented).toBe(true);
    expect(body.configured).toBe(false);
    expect(body.connected).toBe(false);
    expect(body.state).toBe("UNCONFIGURED");
    expect(body.accountCount).toBe(0);
    expect(body.note).toContain("not configured");
    expect(typeof body.checkedAt).toBe("string");
    // Monday Test 2 shape: when UNCONFIGURED the body must NAME the
    // exact host secrets the founder needs to set. These are env-var
    // NAMES (not values) so they can appear in the JSON body honestly.
    expect(Array.isArray(body.missing)).toBe(true);
    expect(body.missing.length).toBeGreaterThan(0);
    expect(body.missing.some((m: string) => m.includes("WEBULL_APP_KEY"))).toBe(true);
    expect(body.credentialPresence).toEqual({
      appKey: false,
      appSecret: false,
      accessToken: false,
    });
    // Anti-value-leak Sentinel — a config gap must never surface actual
    // secret values (keys, tokens, passwords). We check the SHAPE, not
    // the word content: the response body must not carry secret-holding
    // fields like appKey/appSecret/accessToken/password.
    expect(body.appKey).toBeUndefined();
    expect(body.appSecret).toBeUndefined();
    expect(body.accessToken).toBeUndefined();
    expect(body.password).toBeUndefined();
    // Additionally: values look like hex/base64 blobs; the response's
    // note field must not embed a plausible secret VALUE.
    expect(body.note).not.toMatch(/["'][a-f0-9]{24,}["']/i);
    expect(body.note).not.toMatch(/["'][A-Za-z0-9+/=]{40,}["']/);
  });

  it("names only the absent member of the OpenAPI key pair", () => {
    expect(missingSecretsForState("UNCONFIGURED", { WEBULL_APP_KEY: "configured-key" })).toEqual([
      "WEBULL_APP_SECRET (or WEBULL_API_SECRET)",
    ]);
    expect(missingSecretsForState("UNCONFIGURED", { WEBULL_API_SECRET: "configured-secret" })).toEqual([
      "WEBULL_APP_KEY (or WEBULL_API_KEY)",
    ]);
  });

  it("does not invent a missing access token from an HTTP 401", () => {
    expect(missingSecretsForState("BLOCKED_AUTH", {})).toEqual([]);
    expect(missingSecretsForState("BLOCKED_AUTH", { WEBULL_ACCESS_TOKEN: "configured-token" })).toEqual([]);
  });

  it("never returns configured credential values", () => {
    const key = "founder-key-value";
    const secret = "founder-secret-value";
    const token = "founder-token-value";
    const missing = missingSecretsForState("UNCONFIGURED", {
      WEBULL_APP_KEY: key,
      WEBULL_APP_SECRET: secret,
      WEBULL_ACCESS_TOKEN: token,
    });
    expect(missing).toEqual([]);
    expect(JSON.stringify(missing)).not.toContain(key);
    expect(JSON.stringify(missing)).not.toContain(secret);
    expect(JSON.stringify(missing)).not.toContain(token);
  });

  it("reports credential presence without returning credential values", () => {
    const env = {
      WEBULL_API_KEY: "founder-key-value",
      WEBULL_API_SECRET: "founder-secret-value",
      WEBULL_ACCESS_TOKEN: "founder-token-value",
    };
    const presence = webullCredentialPresence(env);
    expect(presence).toEqual({ appKey: true, appSecret: true, accessToken: true });
    const serialized = JSON.stringify(presence);
    expect(serialized).not.toContain(env.WEBULL_API_KEY);
    expect(serialized).not.toContain(env.WEBULL_API_SECRET);
    expect(serialized).not.toContain(env.WEBULL_ACCESS_TOKEN);
  });

  it("never caches — no-store", async () => {
    const res = await GET(req());
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("gates behind requireAuth — infra recon isn't public", async () => {
    (requireAuth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});
