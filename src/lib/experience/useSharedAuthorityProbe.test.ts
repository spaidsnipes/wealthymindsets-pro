import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const hooks = vi.hoisted(() => ({ value: null as unknown, effect: null as null | (() => () => void) }));
vi.mock("react", () => ({
  useState: (initial: unknown) => { hooks.value = initial; return [initial, (value: unknown) => { hooks.value = value; }]; },
  useEffect: (effect: () => () => void) => { hooks.effect = effect; },
}));
import { useSharedAuthorityProbe } from "./useSharedAuthorityProbe";
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
let browser: EventTarget & { setInterval: typeof setInterval; clearInterval: typeof clearInterval };
let page: EventTarget & { visibilityState: string };
beforeEach(() => {
  hooks.value = null; hooks.effect = null;
  browser = Object.assign(new EventTarget(), { setInterval, clearInterval });
  page = Object.assign(new EventTarget(), { visibilityState: "visible" });
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", page);
  vi.stubGlobal("navigator", { onLine: true });
});
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

  it("invalidates a successful check offline and verifies again online", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ serverAuthority: "shared" }) }));
    vi.stubGlobal("fetch", fetcher);
    useSharedAuthorityProbe();
    const cleanup = hooks.effect!();
    await settle();
    expect(hooks.value).toMatchObject({ status: "OBSERVED" });
    vi.stubGlobal("navigator", { onLine: false });
    browser.dispatchEvent(new Event("offline"));
    expect(hooks.value).toMatchObject({ status: "UNOBSERVED" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.stubGlobal("navigator", { onLine: true });
    browser.dispatchEvent(new Event("online"));
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(hooks.value).toMatchObject({ status: "OBSERVED" });
    cleanup();
    browser.dispatchEvent(new Event("online"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects an older success after hiding and a newer foreground failure", async () => {
    let resolveOld: (body: unknown) => void = () => {};
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => new Promise(resolve => { resolveOld = resolve; }) })
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    vi.stubGlobal("fetch", fetcher);
    useSharedAuthorityProbe();
    const cleanup = hooks.effect!();
    await settle();
    page.visibilityState = "hidden";
    page.dispatchEvent(new Event("visibilitychange"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    await settle();
    resolveOld({ serverAuthority: "old-success" });
    await settle();
    expect(hooks.value).toMatchObject({ status: "UNOBSERVED", authority: null });
    cleanup();
  });
});

/**
 * A RE-CHECK IS NOT AN UN-ASK.
 *
 * The probe used to reset to UNOBSERVED at the top of every refresh, including
 * the routine 60s poll. `selectCrossDeviceProgress` renders a note-less
 * UNOBSERVED as "WM has not asked yet." and suppresses `nextDependency` — so
 * on /paper the founder's one actionable sentence (the migration that stands
 * between him and his phone) blinked out once a minute, replaced by a
 * statement that was false the moment WM had asked once.
 *
 * The eight assertions above all passed while that was true, because none of
 * them looked at what the founder sees BETWEEN two answers.
 */
describe("a re-check is not an un-ask", () => {
  it("holds the last answer while the routine poll is in flight", async () => {
    let release: (body: unknown) => void = () => {};
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ serverAuthority: "wm_decision_positions" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => new Promise(resolve => { release = resolve; }) });
    vi.stubGlobal("fetch", fetcher);
    useSharedAuthorityProbe();
    const cleanup = hooks.effect!();
    await settle();
    expect(hooks.value).toMatchObject({ status: "OBSERVED", authority: "wm_decision_positions" });

    // Second poll starts. Nothing new has been learned yet, so nothing the
    // founder is reading may change.
    browser.dispatchEvent(new Event("online"));
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(hooks.value).toMatchObject({ status: "OBSERVED", authority: "wm_decision_positions" });

    release({ serverAuthority: "wm_decision_positions" });
    await settle();
    expect(hooks.value).toMatchObject({ status: "OBSERVED" });
    cleanup();
  });

  it("never says it has not asked once it has asked", async () => {
    // `note: null` is the selector's licence to print "WM has not asked yet."
    // Every post-ask silence must carry its own reason instead.
    for (const response of [
      { ok: false, status: 503, json: async () => ({}) },
      { ok: true, status: 200, json: async () => ({ serverAuthority: 42 }) },
    ]) {
      vi.stubGlobal("fetch", vi.fn(async () => response));
      useSharedAuthorityProbe();
      const cleanup = hooks.effect!();
      await settle();
      const seen = hooks.value as { status: string; note: string | null };
      expect(seen.status).toBe("UNOBSERVED");
      expect(seen.note, "a silence after an ask must explain itself, not claim it never asked").not.toBeNull();
      cleanup();
    }
  });

  it("explains itself when it goes quiet offline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ serverAuthority: "shared" }) })));
    useSharedAuthorityProbe();
    const cleanup = hooks.effect!();
    await settle();
    vi.stubGlobal("navigator", { onLine: false });
    browser.dispatchEvent(new Event("offline"));
    const seen = hooks.value as { status: string; note: string | null };
    expect(seen.status).toBe("UNOBSERVED");
    expect(seen.note).toMatch(/offline|background/);
    cleanup();
  });
});
