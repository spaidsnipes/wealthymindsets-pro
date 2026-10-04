import { describe, it, expect } from "vitest";
import { edgeAllows } from "./edgeRateLimit";

const limiterWith = (deny: Set<string>) => ({ AUTH_MAIL_LIMITER: { limit: async ({ key }: { key: string }) => ({ success: !deny.has(key) }) } });

describe("edgeAllows", () => {
  it("allows when there is no Worker binding (dev, vitest)", async () => {
    expect(await edgeAllows(["ip:1"], undefined, {})).toBe(true);
  });
  it("refuses when any key is over the edge ceiling", async () => {
    expect(await edgeAllows(["ip:1", "addr:a@b.c"], undefined, limiterWith(new Set(["addr:a@b.c"])))).toBe(false);
    expect(await edgeAllows(["ip:1", "addr:a@b.c"], undefined, limiterWith(new Set()))).toBe(true);
  });
  it("a limiter outage never locks a person out", async () => {
    const env = { AUTH_MAIL_LIMITER: { limit: async () => { throw new Error("down"); } } };
    expect(await edgeAllows(["ip:1"], undefined, env)).toBe(true);
  });
});
