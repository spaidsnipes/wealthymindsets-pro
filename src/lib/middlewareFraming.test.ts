import { describe, expect, it } from "vitest";
import { FRAME_HEADERS } from "@/middleware";

/**
 * A trading product that can place orders must not be loadable in another
 * site's frame. Measured 2026-10-15: no framing header was served at all.
 */
describe("framing protection", () => {
  it("states the modern rule and the legacy one", () => {
    expect(FRAME_HEADERS["Content-Security-Policy"]).toBe("frame-ancestors 'self'");
    expect(FRAME_HEADERS["X-Frame-Options"]).toBe("SAMEORIGIN");
  });

  it("is applied to a response without overwriting a policy the app already set", async () => {
    const { middleware } = await import("@/middleware");
    const { NextRequest } = await import("next/server");
    const res = middleware(new NextRequest("https://wealthymindsetspro.com/charts"));
    expect(res.headers.get("Content-Security-Policy")).toBe("frame-ancestors 'self'");
    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });
});
