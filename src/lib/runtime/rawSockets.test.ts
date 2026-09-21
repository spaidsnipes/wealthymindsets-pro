/**
 * The capability seam is small, so the only things worth pinning are the two
 * that have actually cost this project money: that an ABSENT capability is
 * described as a fact about our runtime, and that the global name the worker
 * entry writes is the same one this module reads.
 */
import { describe, it, expect } from "vitest";
import { rawSocketSupport, RAW_SOCKET_GLOBAL } from "./rawSockets";

describe("rawSocketSupport", () => {
  it("reports the capability when the worker entry has published it", () => {
    const connect = () => ({}) as never;
    const support = rawSocketSupport({ [RAW_SOCKET_GLOBAL]: connect });
    expect(support.available).toBe(true);
    if (support.available) expect(support.connect).toBe(connect);
  });

  it("treats an absent capability as a fact about US, never about a provider", () => {
    const support = rawSocketSupport({});
    expect(support.available).toBe(false);
    if (support.available) throw new Error("unreachable");

    // The sentence must locate the failure in this runtime...
    expect(support.reason).toMatch(/this runtime/i);
    expect(support.reason).toMatch(/where this code is executing/i);

    // ...and must NOT reach for the explanation that cost three months.
    expect(support.reason).not.toMatch(/subscri/i);
    expect(support.reason).not.toMatch(/entitle/i);
    expect(support.reason).not.toMatch(/webull/i);
    expect(support.reason).not.toMatch(/\bbuy\b/i);
  });

  it("refuses a non-function under the global name rather than trusting it", () => {
    // A stale string or object left by a half-applied patch must not be called.
    for (const junk of ["connect", 42, {}, null, undefined]) {
      expect(rawSocketSupport({ [RAW_SOCKET_GLOBAL]: junk }).available).toBe(false);
    }
  });

  it("names the same global the worker entry writes", () => {
    // If this constant drifts, the worker silently loses raw TCP and the
    // Webull real-time lane reports 'no sockets' on a runtime that has them.
    expect(RAW_SOCKET_GLOBAL).toBe("__wmCloudflareConnect");
  });

  it("defaults to the real globalThis, where Node genuinely has no sockets", () => {
    expect(rawSocketSupport().available).toBe(false);
  });
});
