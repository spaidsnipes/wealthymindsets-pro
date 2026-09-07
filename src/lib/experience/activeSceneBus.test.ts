/**
 * activeSceneBus — the transport between a route that owns a book and a shell
 * that owns none.
 *
 * The tests below are weighted toward the two ways a transport lies:
 * publishing something nobody computed, and keeping something after its owner
 * is gone. A stale "capital is safe" is the worse of the two, so it gets the
 * most coverage.
 */

import { describe, it, expect } from "vitest";
import { ActiveSceneBus, ACTIVE_SCENE_BUS_VERSION } from "./activeSceneBus";
import { compileScene, type SceneSignals, type SceneCompilation } from "./compileScene";
import { selectCapitalReach } from "./capitalReach";

function signals(over: Partial<SceneSignals> = {}): SceneSignals {
  return {
    position: "FLAT",
    positionConfidence: "CONFIRMED",
    intentInFlight: false,
    exposureIncreasingWorkingOrders: 0,
    linkVerified: true,
    sessionOpen: true,
    rightOfWay: null,
    composingIntent: false,
    hadCapitalEvent: false,
    receiptWritten: false,
    ...over,
  } as SceneSignals;
}

const FLAT: SceneCompilation = compileScene(signals());
const LONG: SceneCompilation = compileScene(signals({ position: "LONG" }));

/** Today's real answer for every publisher in the product. */
const LOCAL = selectCapitalReach({
  medium: "BROWSER_LOCAL", crossTabInvalidation: true, serverAuthority: null,
});
/** The verdict that does not exist yet. Used to prove the bus carries change. */
const SHARED = selectCapitalReach({
  medium: "SERVER_SHARED", crossTabInvalidation: true, serverAuthority: "wm.positions",
});

describe("activeSceneBus — a transport, not a second owner", () => {
  it("starts UNOBSERVED, which is not a claim that capital is safe", () => {
    const bus = new ActiveSceneBus();
    // §14.1: FLAT is a finding, never a default. An empty bus must be
    // distinguishable from a bus carrying a confirmed-flat book, or every
    // consumer downstream inherits a reassurance nobody computed.
    expect(bus.getActiveScene()).toBeNull();
  });

  it("hands back the EXACT compilation it was given — it synthesises nothing", () => {
    const bus = new ActiveSceneBus();
    const token = bus.claim();
    bus.publish(token, "/paper", LONG, LOCAL);
    const published = bus.getActiveScene();
    // Identity, not deep-equality: a transport that rebuilt the object could
    // quietly drop or default a field, which is how a second owner of capital
    // truth gets created by accident.
    expect(published?.compilation).toBe(LONG);
    expect(published?.route).toBe("/paper");
    expect(published?.version).toBe(ACTIVE_SCENE_BUS_VERSION);
  });

  it("notifies subscribers when the capital column changes", () => {
    const bus = new ActiveSceneBus();
    let notifications = 0;
    bus.subscribe(() => { notifications++; });
    const token = bus.claim();
    bus.publish(token, "/paper", FLAT, LOCAL);
    bus.publish(token, "/paper", LONG, LOCAL);
    expect(notifications).toBe(2);
  });

  it("does NOT notify when the same compilation is republished", () => {
    // A route re-rendering on every price tick would otherwise re-notify the
    // shell dozens of times a second, and a navigation rail that recomputes
    // that often is a rail that flickers.
    const bus = new ActiveSceneBus();
    let notifications = 0;
    bus.subscribe(() => { notifications++; });
    const token = bus.claim();
    bus.publish(token, "/paper", LONG, LOCAL);
    bus.publish(token, "/paper", LONG, LOCAL);
    bus.publish(token, "/paper", LONG, LOCAL);
    expect(notifications).toBe(1);
  });

  it("clears on release — a route that left cannot keep speaking for the book", () => {
    const bus = new ActiveSceneBus();
    const token = bus.claim();
    bus.publish(token, "/paper", LONG, LOCAL);
    bus.release(token);
    expect(bus.getActiveScene()).toBeNull();
  });

  it("survives React's mount-new-then-unmount-old ordering", () => {
    /**
     * THE bug this token scheme exists for. React commits the incoming route
     * BEFORE unmounting the outgoing one. With a naive `release() { x = null }`
     * the old route's cleanup wipes the new route's publication a tick after
     * it lands — navigation silently stops reducing at the exact moment the
     * trader moves between two capital-owning screens.
     */
    const bus = new ActiveSceneBus();
    const outgoing = bus.claim();
    bus.publish(outgoing, "/paper", LONG, LOCAL);

    const incoming = bus.claim();          // new route mounts…
    bus.publish(incoming, "/live", LONG, LOCAL);  // …and publishes…
    bus.release(outgoing);                 // …then the old route unmounts.

    expect(bus.getActiveScene()?.route).toBe("/live");
    expect(bus.getActiveScene()).not.toBeNull();
  });

  it("a stale token cannot notify subscribers either", () => {
    const bus = new ActiveSceneBus();
    const outgoing = bus.claim();
    const incoming = bus.claim();
    bus.publish(outgoing, "/paper", LONG, LOCAL);
    bus.publish(incoming, "/live", LONG, LOCAL);
    let notifications = 0;
    bus.subscribe(() => { notifications++; });
    bus.release(outgoing);
    expect(notifications).toBe(0);
  });

  it("unsubscribing actually stops delivery", () => {
    const bus = new ActiveSceneBus();
    let notifications = 0;
    const off = bus.subscribe(() => { notifications++; });
    const token = bus.claim();
    bus.publish(token, "/paper", FLAT, LOCAL);
    off();
    bus.publish(token, "/paper", LONG, LOCAL);
    expect(notifications).toBe(1);
  });

  it("carries capitalAtRisk truthfully in both directions", () => {
    const bus = new ActiveSceneBus();
    const token = bus.claim();
    bus.publish(token, "/paper", LONG, LOCAL);
    expect(bus.getActiveScene()?.compilation.capitalAtRisk).toBe(true);
    bus.publish(token, "/paper", FLAT, LOCAL);
    expect(bus.getActiveScene()?.compilation.capitalAtRisk).toBe(false);
  });

  it("keeps instances isolated — the singleton is a convenience, not a global", () => {
    const a = new ActiveSceneBus();
    const b = new ActiveSceneBus();
    a.publish(a.claim(), "/paper", LONG, LOCAL);
    expect(b.getActiveScene()).toBeNull();
  });
});

describe("activeSceneBus — a capital column may not travel without declaring its reach", () => {
  it("carries the reach verdict alongside the compilation", () => {
    const bus = new ActiveSceneBus();
    bus.publish(bus.claim(), "/paper", LONG, LOCAL);
    expect(bus.getActiveScene()?.reach.reach).toBe("THIS_BROWSER_ONLY");
    expect(bus.getActiveScene()?.reach.crossDeviceBlocked).toBe(true);
  });

  it("clears reach on release — a reach with no book behind it is a stale claim", () => {
    const bus = new ActiveSceneBus();
    const token = bus.claim();
    bus.publish(token, "/paper", LONG, LOCAL);
    bus.release(token);
    // Not "reach is null" — the whole publication goes, so there is no way to
    // read a reach for a route that has left the screen.
    expect(bus.getActiveScene()).toBeNull();
  });

  it("notifies when ONLY the reach changed", () => {
    // The migration-day case. If a server authority appears mid-session, the
    // book is identical and the compilation object may even be reused — but
    // what the shell must SAY has changed completely. An idempotence guard
    // that ignored reach would keep the old sentence on screen indefinitely.
    const bus = new ActiveSceneBus();
    let notifications = 0;
    bus.subscribe(() => { notifications++; });
    const token = bus.claim();
    bus.publish(token, "/paper", LONG, LOCAL);
    bus.publish(token, "/paper", LONG, SHARED);
    expect(notifications).toBe(2);
    expect(bus.getActiveScene()?.reach.reach).toBe("ALL_DEVICES");
  });

  it("still suppresses re-notification for an equal-VALUE reach object", () => {
    // `selectCapitalReach` is pure and returns a fresh object every call, so
    // /paper hands the bus a new reference on any render where the memo is
    // dropped. Comparing by identity here would make the guard dead code and
    // re-notify the shell on every tick.
    const bus = new ActiveSceneBus();
    let notifications = 0;
    bus.subscribe(() => { notifications++; });
    const token = bus.claim();
    const facts = { medium: "BROWSER_LOCAL", crossTabInvalidation: true, serverAuthority: null } as const;
    bus.publish(token, "/paper", LONG, selectCapitalReach(facts));
    bus.publish(token, "/paper", LONG, selectCapitalReach(facts));
    expect(notifications).toBe(1);
  });

  it("does not let the bus soften or synthesise a reach", () => {
    // §24: the transport computes nothing. It must hand back exactly what the
    // store's own facts produced, including the UNKNOWN case, which is the one
    // a well-meaning default would quietly upgrade.
    const bus = new ActiveSceneBus();
    const unproven = selectCapitalReach({
      medium: "SERVER_SHARED", crossTabInvalidation: false, serverAuthority: null,
    });
    bus.publish(bus.claim(), "/paper", LONG, unproven);
    expect(bus.getActiveScene()?.reach).toEqual(unproven);
    expect(bus.getActiveScene()?.reach.reach).toBe("UNKNOWN");
  });
});
