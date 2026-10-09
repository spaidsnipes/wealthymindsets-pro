/**
 * API audit P1-4 (2026-10-09) — operator notes are for the operator.
 *  · /api/diagnostics/email: guest 401, member 403, operator the report.
 *  · /api/diagnostics/supabase: stays public while UNHEALTHY (the lock-out case
 *    it exists for); when healthy a guest or a member gets { healthy: true } and
 *    only the operator the whole report.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OWNER = "owner-1";
let who: string | null = null;
let healthy = true;

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: async () => (who
    ? { ok: true, user: { sub: who, email: "x@wm.test", iat: 0 } }
    : { ok: false, response: new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 }) }),
}));
vi.mock("@/lib/supabaseConfigStatus", () => ({
  SERVICE_KEY_VARS: ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"],
  resolveSupabaseServiceKey: () => "service-key-value",
  supabaseServiceKeySource: () => "SUPABASE_SECRET_KEY",
  supabaseCapabilityGaps: () => [],
  supabaseConfigStatus: () => ({ configured: healthy, missing: healthy ? [] : ["NEXT_PUBLIC_SUPABASE_URL"] }),
  supabaseEnvDefects: () => [],
  supabaseEnvShape: () => "SUPABASE_PROJECT_URL",
}));
vi.mock("@/lib/email", () => ({
  emailConfigStatus: () => ({ hasApiKey: true, apiKeyName: "RESEND_API_KEY", from: "WM <no-reply@wm.test>", usingTestSender: false, appUrl: "https://wm.test" }),
}));

beforeEach(() => { who = null; healthy = true; vi.resetModules(); vi.stubEnv("TASTYTRADE_OWNER_USER_ID", OWNER); });
afterEach(() => { vi.unstubAllEnvs(); });

const supabase = async () => (await import("./supabase/route")).GET(new Request("https://wm.test/api/diagnostics/supabase"));
const email = async () => (await import("./email/route")).GET(new Request("https://wm.test/api/diagnostics/email"));

describe("/api/diagnostics/supabase", () => {
  it.each([["a guest", null], ["a member", "member-7"]])("healthy → %s receives { healthy: true } and nothing else", async (_n, user) => {
    who = user;
    const res = await supabase();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ healthy: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("healthy → the operator still receives the whole report (names and shapes, never a value)", async () => {
    who = OWNER;
    const body = await (await supabase()).json() as Record<string, unknown>;
    expect(body.healthy).toBe(true);
    expect(body.serviceRoleKeySource).toBe("SUPABASE_SECRET_KEY");
    expect(body.serviceRoleKeyAcceptedNames).toEqual(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]);
    expect(JSON.stringify(body)).not.toContain("service-key-value");
  });

  it("UNHEALTHY → the fix list stays readable without a session (the lock-out case), still without a value", async () => {
    healthy = false;
    const body = await (await supabase()).json() as Record<string, unknown>;
    expect(body.healthy).toBe(false);
    expect(body.missing).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
    expect(body.serviceRoleKeyPresent).toBe(true);
    expect(JSON.stringify(body)).not.toContain("service-key-value");
  });
});

describe("/api/diagnostics/email", () => {
  it("a guest is 401", async () => { expect((await email()).status).toBe(401); });

  it("a member is 403 and receives no sender, app URL or setup hint", async () => {
    who = "member-7";
    const res = await email();
    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).not.toMatch(/RESEND|no-reply|wm\.test|hint|appUrl/);
  });

  it("the operator's report is unchanged", async () => {
    who = OWNER;
    const body = await (await email()).json() as Record<string, unknown>;
    expect(body).toMatchObject({ hasApiKey: true, from: "WM <no-reply@wm.test>", ok: true });
  });
});
