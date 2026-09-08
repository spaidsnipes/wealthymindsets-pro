import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const hooks = vi.hoisted(() => ({ value: null as unknown, effect: null as null | (() => () => void) }));
vi.mock("react", () => ({
  useState: (initial: unknown) => { hooks.value = initial; return [initial, (value: unknown) => { hooks.value = value; }]; },
  useEffect: (effect: () => () => void) => { hooks.effect = effect; },
}));
import { useSharedAuthorityProbe } from "./useSharedAuthorityProbe";
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
beforeEach(() => { hooks.value = null; hooks.effect = null; });
afterEach(() => { vi.unstubAllGlobals(); });

describe("shared authority receipt boundary", () => {
  it.each([null, [], {}, { serverAuthority: 42 }])("does not promote malformed receipt %s", async body => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => body })));
    useSharedAuthorityProbe();
    const cleanup = hooks.effect!();
    await settle();
    expect(hooks.value).toMatchObject({ status: "UNOBSERVED", authority: null });
    cleanup();
  });

  it("preserves explicit absence and a named authority as different observations", async () => {
    for (const authority of [null, "wm_decision_positions"]) {
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ serverAuthority: authority }) })));
      useSharedAuthorityProbe();
      const cleanup = hooks.effect!();
      await settle();
      expect(hooks.value).toMatchObject({ status: "OBSERVED", authority });
      cleanup();
    }
  });

  it("aborts the request and rejects a late body after unmount", async () => {
    let signal: AbortSignal | undefined;
    let resolveBody: (body: unknown) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return { ok: true, status: 200, json: () => new Promise(resolve => { resolveBody = resolve; }) };
    }));
    useSharedAuthorityProbe();
    const cleanup = hooks.effect!();
    await settle();
    cleanup();
    expect(signal?.aborted).toBe(true);
    resolveBody({ serverAuthority: "wm_decision_positions" });
    await settle();
    expect(hooks.value).toMatchObject({ status: "UNOBSERVED" });
  });
});
