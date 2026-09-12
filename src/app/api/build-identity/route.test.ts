/**
 * The route is thin on purpose — `readBuildIdentity` owns the states. What this
 * suite protects is the part a reader cannot see from the module: that the
 * receipt is actually SERVED, uncacheable, and carrying nothing it should not.
 *
 * The last point is why this file exists at all. The route reads the whole
 * process environment, and the whole process environment on this app contains
 * Supabase service-role keys and broker refresh tokens. A future edit that
 * widened the response — "while we're here, return the env for debugging" —
 * would be a one-line change with no type error and no visible symptom.
 */

import { afterEach, describe, expect, it } from "vitest";
import { BUILD_SHA_ENV, BUILD_TIME_ENV } from "@/lib/buildIdentity";
import { GET } from "./route";

const SHA = "64cbf8dcffc8e5a4b3b7e6ed4c901bc44da9cca0";
const SECRET = "sk-this-must-never-appear-in-a-build-receipt";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("/api/build-identity", () => {
  it("serves the stamped commit as JSON", async () => {
    process.env[BUILD_SHA_ENV] = SHA;
    process.env[BUILD_TIME_ENV] = "2026-09-12T20:45:00Z";

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.state).toBe("STAMPED");
    expect(body.sha).toBe(SHA);
    expect(body.shortSha).toBe("64cbf8d");
    expect(body.builtAt).toBe("2026-09-12T20:45:00Z");
  });

  it("answers UNSTAMPED with a 200, not an error", async () => {
    // "I do not know which commit I am" is a successful answer to the question
    // asked. A 500 would make the receipt itself look broken and send whoever
    // is debugging a stale deploy chasing the wrong thing.
    delete process.env[BUILD_SHA_ENV];
    delete process.env[BUILD_TIME_ENV];

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.state).toBe("UNSTAMPED");
    expect(body.sha).toBeNull();
  });

  it("is never cached — a build receipt may not outlive its build", async () => {
    process.env[BUILD_SHA_ENV] = SHA;
    const res = await GET();
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("carries the commit and nothing else from the environment", async () => {
    process.env[BUILD_SHA_ENV] = SHA;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    process.env.TASTYTRADE_REFRESH_TOKEN = SECRET;

    const raw = await (await GET()).text();
    expect(raw).not.toContain(SECRET);
    expect(raw, "the receipt is leaking env NAMES, which is infra recon")
      .not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(raw).not.toContain("TASTYTRADE_REFRESH_TOKEN");

    // Positive control: the response really was read, and really does carry the
    // one thing it is supposed to carry.
    expect(raw).toContain(SHA);
  });
});
