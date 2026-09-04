import { beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  subscribe: null as null | ((notify: () => void) => () => void),
  client: null as null | (() => readonly unknown[]),
  server: null as null | (() => readonly unknown[]),
}));

// Exercise the callbacks passed by the real hooks, not a copied selector.
// This checks React's snapshot identity contract; it is not a browser test.
vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useSyncExternalStore: (subscribe: typeof captured.subscribe, client: typeof captured.client, server: typeof captured.server) => {
    Object.assign(captured, { subscribe, client, server });
    return client!();
  },
}));

import { useDecisionMemory, useDecisionMemoryRecords } from "../useDecisionMemory";
import { DecisionMemoryStore } from "../decisionMemoryStore";

describe.each([useDecisionMemory, useDecisionMemoryRecords])("decision hook %s", (hook) => {
  let store: DecisionMemoryStore;
  beforeEach(() => { store = new DecisionMemoryStore(); });

  it.each([null, undefined, ""])("keeps an immutable stable snapshot without owner %s", (owner) => {
    const subscribe = vi.spyOn(store, "subscribe");
    hook(owner, store);
    const first = captured.client!();
    expect(captured.client!()).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first).toEqual([]);
    captured.subscribe!(vi.fn())();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("uses a stable empty server snapshot even with an owner", () => {
    hook("owner-a", store);
    const first = captured.server!();
    expect(captured.server!()).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first).toEqual([]);
  });

  it("scopes subscription and unsubscribes from the existing owner", () => {
    const listener = vi.fn();
    hook("owner-a", store);
    const stop = captured.subscribe!(listener);
    listener.mockClear();
    store.clearOwner("owner-b");
    expect(listener).not.toHaveBeenCalled();
    store.clearOwner("owner-a");
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    store.clearOwner("owner-a");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
