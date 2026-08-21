import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveProviderKeyFrom,
  resolveProviderKey,
  __resetProviderKeyWarnings,
} from "./providerKeys";

describe("resolveProviderKeyFrom — pure", () => {
  it("prefers the server-only name", () => {
    const r = resolveProviderKeyFrom({ FINNHUB_KEY: "srv", NEXT_PUBLIC_FINNHUB_KEY: "pub" }, "finnhub");
    expect(r.value).toBe("srv");
    expect(r.source).toBe("server");
  });

  it("falls back to the public name and reports the source", () => {
    const r = resolveProviderKeyFrom({ NEXT_PUBLIC_FMP_KEY: "pub" }, "fmp");
    expect(r.value).toBe("pub");
    expect(r.source).toBe("public-fallback");
    expect(r.serverName).toBe("FMP_KEY");
    expect(r.publicName).toBe("NEXT_PUBLIC_FMP_KEY");
  });

  it("missing when neither name is set", () => {
    const r = resolveProviderKeyFrom({}, "polygon");
    expect(r.value).toBe("");
    expect(r.source).toBe("missing");
  });

  it("treats empty string as unset (prefers next candidate)", () => {
    expect(resolveProviderKeyFrom({ POLYGON_KEY: "", NEXT_PUBLIC_POLYGON_KEY: "pub" }, "polygon").source).toBe("public-fallback");
    expect(resolveProviderKeyFrom({ POLYGON_KEY: "", NEXT_PUBLIC_POLYGON_KEY: "" }, "polygon").source).toBe("missing");
  });

  it("covers all three providers with correct names", () => {
    expect(resolveProviderKeyFrom({}, "finnhub").serverName).toBe("FINNHUB_KEY");
    expect(resolveProviderKeyFrom({}, "fmp").serverName).toBe("FMP_KEY");
    expect(resolveProviderKeyFrom({}, "polygon").serverName).toBe("POLYGON_KEY");
  });
});

describe("resolveProviderKey — runtime warn-once", () => {
  const saved: Record<string, string | undefined> = {};
  const NAMES = ["FINNHUB_KEY", "NEXT_PUBLIC_FINNHUB_KEY"];
  beforeEach(() => {
    __resetProviderKeyWarnings();
    for (const n of NAMES) { saved[n] = process.env[n]; delete process.env[n]; }
  });
  afterEach(() => {
    for (const n of NAMES) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n]; }
    vi.restoreAllMocks();
  });

  it("warns exactly once when the public fallback is relied on; value never printed", () => {
    process.env.NEXT_PUBLIC_FINNHUB_KEY = "SECRET_PUB_VALUE";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = resolveProviderKey("finnhub");
    const b = resolveProviderKey("finnhub");
    expect(a.source).toBe("public-fallback");
    expect(b.source).toBe("public-fallback");
    expect(warn).toHaveBeenCalledTimes(1); // once, not twice
    expect(warn.mock.calls[0][0]).not.toContain("SECRET_PUB_VALUE");
    expect(warn.mock.calls[0][0]).toContain("NEXT_PUBLIC_FINNHUB_KEY");
  });

  it("does NOT warn when the server key is set", () => {
    process.env.FINNHUB_KEY = "srv";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = resolveProviderKey("finnhub");
    expect(r.source).toBe("server");
    expect(warn).not.toHaveBeenCalled();
  });

  it("does NOT warn when the key is entirely missing (missing != fallback)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = resolveProviderKey("finnhub");
    expect(r.source).toBe("missing");
    expect(warn).not.toHaveBeenCalled();
  });
});
