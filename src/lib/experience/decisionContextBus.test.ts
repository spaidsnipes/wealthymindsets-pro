import { describe, it, expect, vi } from "vitest";
import {
  DecisionContextBus,
  EXPERIENCE_MODES,
  DECISION_CONTEXT_SCHEMA_VERSION,
} from "./decisionContextBus";

function busAt(t = { v: 1_000 }) {
  return new DecisionContextBus({ confirmationsRequired: 3, now: () => t.v, initialMode: "OBSERVE" });
}

describe("DecisionContextBus — human job, with interface hysteresis (P29)", () => {
  it("seeds a deterministic default context", () => {
    const bus = busAt();
    const c = bus.getContext();
    expect(c.schemaVersion).toBe(DECISION_CONTEXT_SCHEMA_VERSION);
    expect(c.mode).toBe("OBSERVE");
    expect(c.source).toBe("default");
    expect(c.question.length).toBeGreaterThan(0);
  });

  it("exposes exactly the seven founder-named modes in order", () => {
    expect([...EXPERIENCE_MODES]).toEqual([
      "PREP", "OBSERVE", "WAIT", "EXECUTE", "MANAGE", "REVIEW", "LEARN",
    ]);
  });

  it("USER intent commits a mode change immediately (bypasses hysteresis)", () => {
    const bus = busAt();
    const listener = vi.fn();
    bus.subscribe(listener);
    const c = bus.setMode("EXECUTE");
    expect(c.mode).toBe("EXECUTE");
    expect(c.source).toBe("user");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("MARKET proposal does NOT commit until N consecutive confirmations", () => {
    const bus = busAt();
    const listener = vi.fn();
    bus.subscribe(listener);

    const r1 = bus.proposeMode("WAIT");
    expect(r1.status).toBe("PENDING");
    expect(r1.remaining).toBe(2);
    expect(bus.getContext().mode).toBe("OBSERVE"); // not yet
    const r2 = bus.proposeMode("WAIT");
    expect(r2.status).toBe("PENDING");
    expect(r2.remaining).toBe(1);
    const r3 = bus.proposeMode("WAIT");
    expect(r3.status).toBe("COMMITTED");
    expect(bus.getContext().mode).toBe("WAIT");
    expect(bus.getContext().source).toBe("market");
    // Only ONE notification — at commit, not on each pending proposal.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("a flip-flopping market cannot thrash the workspace mode", () => {
    const bus = busAt();
    bus.proposeMode("WAIT");      // pending WAIT (1)
    bus.proposeMode("EXECUTE");   // resets → pending EXECUTE (1)
    bus.proposeMode("WAIT");      // resets → pending WAIT (1)
    // Never reached 3-in-a-row for any single mode.
    expect(bus.getContext().mode).toBe("OBSERVE");
    expect(bus.peekPending()).toEqual({ mode: "WAIT", count: 1 });
  });

  it("proposing the already-committed mode is a NOOP and clears pending", () => {
    const bus = busAt();
    bus.proposeMode("WAIT"); // pending WAIT (1)
    const r = bus.proposeMode("OBSERVE"); // current mode
    expect(r.status).toBe("NOOP");
    expect(bus.peekPending()).toBeNull();
  });

  it("records the commit timestamp via the injected clock", () => {
    const t = { v: 5_000 };
    const bus = new DecisionContextBus({ confirmationsRequired: 1, now: () => t.v });
    t.v = 9_000;
    const c = bus.setMode("REVIEW");
    expect(c.since).toBe(9_000);
  });

  it("setQuestion updates the lens without changing mode and notifies", () => {
    const bus = busAt();
    const listener = vi.fn();
    bus.subscribe(listener);
    const c = bus.setQuestion("Is seller effort actually producing downside?");
    expect(c.question).toBe("Is seller effort actually producing downside?");
    expect(c.mode).toBe("OBSERVE");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops further notifications", () => {
    const bus = new DecisionContextBus({ confirmationsRequired: 1 });
    const listener = vi.fn();
    const off = bus.subscribe(listener);
    bus.setMode("PREP");
    off();
    bus.setMode("MANAGE");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

/**
 * getContext() is the getSnapshot for `useDecisionContext`'s useSyncExternalStore.
 * React calls getSnapshot on every render and compares the reference: if it ever
 * returns a FRESH object while nothing changed, React sees an endless stream of
 * "new" snapshots, logs "The result of getSnapshot should be cached to avoid an
 * infinite loop", and re-renders forever (React #185 / max-update-depth). These
 * tests lock the reference-identity contract that keeps that loop impossible —
 * the same #185 guard the session/nectar/decision-memory stores already carry.
 */
describe("DecisionContextBus — getContext snapshot identity (useSyncExternalStore #185 guard)", () => {
  it("returns the SAME reference on repeated reads when nothing changed", () => {
    const bus = busAt();
    const a = bus.getContext();
    const b = bus.getContext();
    expect(b).toBe(a); // identical reference — not merely deep-equal
  });

  it("holds the reference STABLE across hysteresis-PENDING market proposals", () => {
    // A pending (un-committed) proposal must NOT change the published snapshot,
    // or every pending tick would thrash useSyncExternalStore into a re-render
    // storm before the mode ever commits — the exact cold-mount burst symptom.
    const bus = busAt();
    const before = bus.getContext();
    const r1 = bus.proposeMode("WAIT"); // pending (1 of 3)
    expect(r1.status).toBe("PENDING");
    expect(bus.getContext()).toBe(before);
    const r2 = bus.proposeMode("WAIT"); // pending (2 of 3)
    expect(r2.status).toBe("PENDING");
    expect(bus.getContext()).toBe(before); // still the same reference
  });

  it("keeps the SAME reference on no-op user intent and no-op question set", () => {
    const bus = busAt(); // seeded OBSERVE
    const seed = bus.getContext();
    // Re-asserting the current mode with no question change is a no-op.
    expect(bus.setMode("OBSERVE")).toBe(seed);
    expect(bus.getContext()).toBe(seed);
    // Setting the identical question is a no-op.
    expect(bus.setQuestion(seed.question)).toBe(seed);
    expect(bus.getContext()).toBe(seed);
    // Proposing the already-committed mode is a NOOP.
    bus.proposeMode("OBSERVE");
    expect(bus.getContext()).toBe(seed);
  });

  it("publishes a NEW reference only when the context truly changes", () => {
    const bus = busAt();
    const seed = bus.getContext();
    const afterMode = bus.setMode("EXECUTE");
    expect(afterMode).not.toBe(seed); // real change → fresh snapshot
    expect(bus.getContext()).toBe(afterMode); // then stable again at the new ref
    const afterQuestion = bus.setQuestion("Is right-of-way actually open?");
    expect(afterQuestion).not.toBe(afterMode);
    expect(bus.getContext()).toBe(afterQuestion);
  });

  it("a committed market proposal flips the reference exactly once, then holds it", () => {
    const bus = busAt();
    const seed = bus.getContext();
    bus.proposeMode("WAIT"); // 1
    bus.proposeMode("WAIT"); // 2
    const committed = bus.proposeMode("WAIT"); // 3 → COMMITTED
    expect(committed.status).toBe("COMMITTED");
    const after = bus.getContext();
    expect(after).not.toBe(seed);
    expect(after.mode).toBe("WAIT");
    expect(bus.getContext()).toBe(after); // stable at the committed reference
  });
});
