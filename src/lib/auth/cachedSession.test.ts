/**
 * Every case in the first block was MEASURED against the code as it stood —
 * a real `selectAuthenticatedRouteState` call with the value the old
 * `JSON.parse(raw) as WMUser` produced — not imagined.
 */

import { describe, expect, it } from "vitest";
import { hydrateCachedUser, readCachedSession } from "./cachedSession";
import { selectAuthenticatedRouteState } from "@/lib/authRoutes";

const KEY = "wm_session_v1";
const storageOf = (raw: string | null) => ({ getItem: (k: string) => (k === KEY ? raw : null) });

describe("THE MEASURED FAILURE — any truthy JSON was a signed-in trader", () => {
  it("an object with no id trapped the trader on profile setup", () => {
    // Measured: truthy -> gate PROFILE_SETUP_REQUIRED -> the route guard runs
    // router.replace("/profile?setup=1") on EVERY navigation. Not signed out.
    // Trapped, with no explanation and no way back.
    expect(selectAuthenticatedRouteState("/command-deck", {} as never, false))
      .toBe("PROFILE_SETUP_REQUIRED");
    // Now: there is no session, so the guard sends them somewhere with a door.
    expect(hydrateCachedUser({})).toBeNull();
    expect(selectAuthenticatedRouteState("/command-deck", hydrateCachedUser({}), false))
      .toBe("SIGN_IN_REQUIRED");
  });

  it("a bare string, an array and a number are not accounts", () => {
    expect(hydrateCachedUser("corrupted")).toBeNull();
    expect(hydrateCachedUser([])).toBeNull();
    expect(hydrateCachedUser(42)).toBeNull();
    expect(hydrateCachedUser(null)).toBeNull();
    expect(hydrateCachedUser(true)).toBeNull();
  });

  it("a NUMERIC id no longer runs the app under a number", () => {
    // Measured: gate READY, and owner-scoped reads keyed off `123`. Every
    // record written under it is unreachable from a string-keyed comparison
    // forever after.
    expect(hydrateCachedUser({ id: 123, email: "a@b.c", profileComplete: true })).toBeNull();
  });

  it("a null id no longer shows a signed-in account with an empty book", () => {
    // Measured: gate READY, id null, every owner-scoped surface empty. The
    // trader is shown their own account with no journal — 'your book is gone'
    // rather than 'sign in again'.
    expect(hydrateCachedUser({ id: null, email: "a@b.c", profileComplete: true })).toBeNull();
  });

  it("a blank or whitespace id is absence, not an id", () => {
    expect(hydrateCachedUser({ id: "", email: "a@b.c" })).toBeNull();
    expect(hydrateCachedUser({ id: "   ", email: "a@b.c" })).toBeNull();
  });

  it("an account with no email is not a session either", () => {
    expect(hydrateCachedUser({ id: "u1", profileComplete: true })).toBeNull();
    expect(hydrateCachedUser({ id: "u1", email: 42 })).toBeNull();
  });
});

describe("a real session is read whole", () => {
  const full = {
    id: "u1", email: "trader@wm.com", displayName: "Dave", handle: "dave",
    avatar: "https://x/y.png", bio: "b", botName: "SPAID", timezone: "America/Chicago",
    bgColor: "#111", profileComplete: true, verified: true, ceo: true,
  };

  it("keeps every field it can read", () => {
    expect(hydrateCachedUser(full)).toEqual(full);
  });

  it("an unreadable preference does not sign the trader out", () => {
    const user = hydrateCachedUser({ ...full, bgColor: 42, timezone: null, bio: "" });
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u1");
    expect(user!.bgColor).toBeUndefined();
    expect(user!.timezone).toBeUndefined();
  });
});

describe("badges are granted, never inferred", () => {
  const base = { id: "u1", email: "a@b.c" };

  it("only a literal true verifies an account", () => {
    for (const v of ["true", 1, {}, "yes", [], "false"]) {
      expect(hydrateCachedUser({ ...base, verified: v })!.verified).toBe(false);
    }
    expect(hydrateCachedUser({ ...base, verified: true })!.verified).toBe(true);
  });

  it("only a literal true grants the core-team crown", () => {
    expect(hydrateCachedUser({ ...base, ceo: "yes" })!.ceo).toBe(false);
  });

  it("only a literal true completes a profile", () => {
    // `"false"` is a truthy string. Under the old spread it let a trader skip
    // setup; the honest reading of an unrecognised value is 'not complete'.
    expect(hydrateCachedUser({ ...base, profileComplete: "false" })!.profileComplete).toBe(false);
    expect(hydrateCachedUser({ ...base, profileComplete: true })!.profileComplete).toBe(true);
  });
});

describe("reading the cache never throws", () => {
  it("absent, unparseable and non-account bytes all read as no session", () => {
    expect(readCachedSession(storageOf(null), KEY)).toBeNull();
    expect(readCachedSession(storageOf("{not json"), KEY)).toBeNull();
    expect(readCachedSession(storageOf("null"), KEY)).toBeNull();
    expect(readCachedSession(storageOf("[]"), KEY)).toBeNull();
  });

  it("a storage port that throws is no session, not a crash", () => {
    // Safari private mode and blocked third-party contexts both throw on read.
    const denied = { getItem: () => { throw new Error("denied"); } };
    expect(() => readCachedSession(denied, KEY)).not.toThrow();
    expect(readCachedSession(denied, KEY)).toBeNull();
  });

  it("a real cached session round-trips", () => {
    const user = { id: "u1", email: "a@b.c", profileComplete: true };
    const out = readCachedSession(storageOf(JSON.stringify(user)), KEY);
    expect(out!.id).toBe("u1");
    expect(out!.email).toBe("a@b.c");
  });
});
