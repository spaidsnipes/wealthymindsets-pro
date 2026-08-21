import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("/api/broker/webull/status — canon §12 truth", () => {
  it("returns implemented=false with an honest note (never claims wired)", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.provider).toBe("webull");
    expect(body.implemented).toBe(false);
    expect(body.configured).toBe(false);
    expect(body.connected).toBe(false);
    expect(body.note).toContain("not implemented");
    expect(typeof body.checkedAt).toBe("string");
    // must not leak a token/secret regardless of upstream env var presence
    const s = JSON.stringify(body);
    expect(s.toLowerCase()).not.toContain("token");
    expect(s.toLowerCase()).not.toContain("secret");
    expect(s.toLowerCase()).not.toContain("password");
  });

  it("never caches — no-store", async () => {
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
