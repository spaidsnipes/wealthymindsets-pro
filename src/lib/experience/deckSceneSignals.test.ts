/**
 * deckSceneSignals tests.
 *
 * The compiler is pure and well-tested; the wiring is where a lie would enter.
 * These tests exist to make one specific failure impossible: the adapter
 * quietly claiming the deck knows something about the trader's capital.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  SESSION_TOKEN_CLOSED,
  SESSION_TOKEN_CONTINUOUS,
  SESSION_TOKEN_UNKNOWN,
  selectCanonicalSessionToken,
} from "../marketData/canonicalIdentity";
import { compileScene } from "./compileScene";
import {
  SIGNAL_GROUPS,
  deckSceneSignals,
  rightOfWayFrom,
  sessionOpenFrom,
} from "./deckSceneSignals";

describe("sessionOpenFrom", () => {
  it("maps a closed session to false", () => {
    expect(sessionOpenFrom("CLOSED")).toBe(false);
    expect(sessionOpenFrom("closed")).toBe(false);
    expect(sessionOpenFrom("  Closed  ")).toBe(false);
  });

  it("maps the open sessions to true", () => {
    for (const s of ["RTH", "ETH", "OVERNIGHT", "PREMARKET", "AFTERHOURS"]) {
      expect(sessionOpenFrom(s)).toBe(true);
      expect(sessionOpenFrom(s.toLowerCase())).toBe(true);
    }
  });

  it("§8 LAW: never infers an open session from an unknown value", () => {
    for (const s of ["UNKNOWN", "", "   ", "GARBAGE", "OPEN?", null, undefined]) {
      expect(sessionOpenFrom(s as string | null | undefined)).toBe(null);
    }
  });

  it("maps 24X7 to true — a continuous market IS open, and that IS established", () => {
    // Before this it fell through to null, so the deck reported crypto's
    // session UNOBSERVED while reporting a Saturday equity's OBSERVED: one
    // mapper wrong in both directions at once.
    expect(sessionOpenFrom(SESSION_TOKEN_CONTINUOUS)).toBe(true);
    expect(sessionOpenFrom("24x7")).toBe(true);
  });

  it("never throws on a non-string", () => {
    expect(sessionOpenFrom(42 as unknown as string)).toBe(null);
    expect(sessionOpenFrom({} as unknown as string)).toBe(null);
  });
});

describe("rightOfWayFrom", () => {
  it("passes real verdicts through unchanged", () => {
    for (const v of ["ACTION", "WAIT", "CAUTION", "NO TRADE"] as const) {
      expect(rightOfWayFrom(v)).toBe(v);
    }
  });

  it("collapses UNKNOWN to null — an unknown verdict is not a decision", () => {
    expect(rightOfWayFrom("UNKNOWN")).toBe(null);
    expect(rightOfWayFrom(null)).toBe(null);
    expect(rightOfWayFrom(undefined)).toBe(null);
  });
});

describe("deckSceneSignals — the capital column is never invented", () => {
  it("§14.1 LAW: never reports FLAT for a book it has not read", () => {
    const inputs = [
      { session: "RTH", rightOfWay: "ACTION" as const },
      { session: "CLOSED", rightOfWay: "NO TRADE" as const },
      { session: "UNKNOWN", rightOfWay: null },
      { session: null, rightOfWay: undefined },
    ];
    for (const input of inputs) {
      const { signals } = deckSceneSignals(input);
      expect(signals.position).toBe("POSITION UNCONFIRMED");
      expect(signals.positionConfidence).toBe("UNOBSERVED");
    }
  });

  it("§14.1 LAW: the deck can never compile DONE — it has not read a book", () => {
    for (const session of ["RTH", "ETH", "CLOSED", "UNKNOWN", "OVERNIGHT"]) {
      for (const rightOfWay of ["ACTION", "WAIT", "CAUTION", "NO TRADE", "UNKNOWN"] as const) {
        const { signals } = deckSceneSignals({ session, rightOfWay });
        expect(compileScene(signals).scene).not.toBe("DONE");
      }
    }
  });

  it("reports the capital column as UNOBSERVED in the provenance record", () => {
    const { provenance } = deckSceneSignals({ session: "RTH", rightOfWay: "ACTION" });
    expect(provenance.POSITION).toBe("UNOBSERVED");
    expect(provenance.ORDERS).toBe("UNOBSERVED");
    expect(provenance.LINK).toBe("UNOBSERVED");
  });

  it("never claims capital is at risk on a route with no broker", () => {
    for (const session of ["RTH", "CLOSED", "UNKNOWN"]) {
      const { signals } = deckSceneSignals({ session, rightOfWay: "ACTION" });
      expect(compileScene(signals).capitalAtRisk).toBe(false);
    }
  });
});

describe("deckSceneSignals — provenance is honest in both directions", () => {
  it("marks the observed signals OBSERVED when they are real", () => {
    const out = deckSceneSignals({ session: "RTH", rightOfWay: "ACTION" });
    expect(out.provenance.SESSION).toBe("OBSERVED");
    expect(out.provenance.DECISION).toBe("OBSERVED");
    expect(out.observedCount).toBe(2);
    expect(out.totalCount).toBe(SIGNAL_GROUPS.length);
  });

  it("marks an unknown session UNOBSERVED rather than guessing", () => {
    const out = deckSceneSignals({ session: "UNKNOWN", rightOfWay: "ACTION" });
    expect(out.provenance.SESSION).toBe("UNOBSERVED");
    expect(out.observedCount).toBe(1);
  });

  it("marks an unknown right-of-way UNOBSERVED rather than guessing", () => {
    const out = deckSceneSignals({ session: "RTH", rightOfWay: "UNKNOWN" });
    expect(out.provenance.DECISION).toBe("UNOBSERVED");
    expect(out.observedCount).toBe(1);
  });

  it("reports zero observed when nothing is known", () => {
    const out = deckSceneSignals({ session: null, rightOfWay: null });
    expect(out.observedCount).toBe(0);
  });

  it("observedCount always equals the number of OBSERVED groups (positive control)", () => {
    const cases = [
      { session: "RTH", rightOfWay: "ACTION" as const },
      { session: "UNKNOWN", rightOfWay: "WAIT" as const },
      { session: "CLOSED", rightOfWay: "UNKNOWN" as const },
      { session: null, rightOfWay: null },
    ];
    for (const input of cases) {
      const out = deckSceneSignals(input);
      const counted = SIGNAL_GROUPS.filter((g) => out.provenance[g] === "OBSERVED").length;
      expect(out.observedCount).toBe(counted);
    }
  });
});

describe("deckSceneSignals — the scenes the deck can actually reach", () => {
  it("an earned right-of-way in an open session compiles to PERMISSION", () => {
    const { signals } = deckSceneSignals({ session: "RTH", rightOfWay: "ACTION" });
    expect(compileScene(signals).scene).toBe("PERMISSION");
  });

  it("a withheld right-of-way compiles to WAIT", () => {
    for (const row of ["WAIT", "CAUTION"] as const) {
      const { signals } = deckSceneSignals({ session: "RTH", rightOfWay: row });
      expect(compileScene(signals).scene).toBe("WAIT");
    }
  });

  it("a closed session with nothing pending compiles to CLOSED", () => {
    const { signals } = deckSceneSignals({ session: "CLOSED", rightOfWay: null });
    expect(compileScene(signals).scene).toBe("CLOSED");
  });

  it("nothing resolved compiles to PREGAME", () => {
    const { signals } = deckSceneSignals({ session: "UNKNOWN", rightOfWay: "UNKNOWN" });
    expect(compileScene(signals).scene).toBe("PREGAME");
  });

  it("the scene genuinely varies with the inputs (positive control — no constant output)", () => {
    const scenes = new Set(
      [
        { session: "RTH", rightOfWay: "ACTION" as const },
        { session: "RTH", rightOfWay: "WAIT" as const },
        { session: "CLOSED", rightOfWay: null },
        { session: "UNKNOWN", rightOfWay: "UNKNOWN" as const },
      ].map((i) => compileScene(deckSceneSignals(i).signals).scene),
    );
    expect(scenes.size).toBeGreaterThanOrEqual(4);
  });

  it("§10 ADMISSION: a WAIT scene genuinely withholds the expression shortlist", () => {
    const wait = compileScene(deckSceneSignals({ session: "RTH", rightOfWay: "WAIT" }).signals);
    const permission = compileScene(
      deckSceneSignals({ session: "RTH", rightOfWay: "ACTION" }).signals,
    );
    expect(wait.admits).not.toContain("EXPRESSION_CARD");
    expect(permission.admits).toContain("EXPRESSION_CARD");
  });

  it("§9 CLOSED: a closed session withholds the thesis and the story", () => {
    const closed = compileScene(deckSceneSignals({ session: "CLOSED", rightOfWay: null }).signals);
    expect(closed.admits).not.toContain("THESIS_GEOMETRY");
    expect(closed.admits).not.toContain("ONE_STORY");
    expect(closed.admits).toContain("MARKET_CANVAS");
  });
});

/* ── The question no test above asks ──────────────────────────────────────────
 *
 * Every input in this file is hand-written: `{ session: "RTH", … }`. So the
 * mapper is proven correct FOR the value "RTH" — and not one line asks whether
 * the caller can legitimately HAVE "RTH". It could not. /command-deck passed
 * `identity.session`, the store key, which `canonicalSession()` answers "RTH"
 * for every non-crypto instrument on every day of the week.
 *
 * A pure-function suite can be completely correct and completely irrelevant.
 * The unit was never the risk; this file's own header says so — "the compiler
 * is pure and well-tested; the wiring is where a lie would enter" — and then
 * every test tested the compiler and none tested the wiring.
 *
 * Observed in production on Saturday 2026-09-05, /command-deck, symbol GC1!:
 *   SCENE           "WAIT — Right-of-way is withheld, holding is the action."
 *   SESSION tile    "SESSION UNKNOWN"
 *   mobile pill     "CLOSED"
 *   DATA strip      "SESSION CLOSED — LAST VERIFIED"  (×8 nodes)
 * Four owners, one market, one instant, four claims.
 */
const DECK_PAGE = (): string =>
  readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const SATURDAY = new Date(2026, 8, 5);
const SUNDAY = new Date(2026, 8, 6);
const WEDNESDAY = new Date(2026, 8, 2);

/** The real wire: owner → adapter → compiler. No hand-written session strings. */
function sceneFor(symbol: string, at: Date | null, rightOfWay: "WAIT" | null = null) {
  const token = selectCanonicalSessionToken({ symbol, at });
  const out = deckSceneSignals({ session: token.token, rightOfWay });
  return { token, out, scene: compileScene(out.signals).scene };
}

describe("deckSceneSignals — fed by the real owner, not a hand-written string", () => {
  it("THE CORE REGRESSION: a Saturday equity compiles to CLOSED, not WAIT", () => {
    for (const symbol of ["TSLA", "SPY", "AAPL"]) {
      expect(sceneFor(symbol, SATURDAY).scene, symbol).toBe("CLOSED");
      expect(sceneFor(symbol, SATURDAY, "WAIT").scene, `${symbol} +WAIT`).toBe("CLOSED");
    }
  });

  it("Saturday futures compile to CLOSED too — the deck's shrug was not humility", () => {
    for (const symbol of ["GC1!", "NQ1!", "ES1!"]) {
      expect(sceneFor(symbol, SATURDAY).scene, symbol).toBe("CLOSED");
    }
  });

  it("Sunday equities compile to CLOSED", () => {
    expect(sceneFor("TSLA", SUNDAY).scene).toBe("CLOSED");
  });

  it("PROOF OF THE DEFECT: the store key can never reach CLOSED (positive control)", () => {
    // This is what the call site used to pass. If a future edit routes the
    // store key back in, the scene silently loses its CLOSED branch again —
    // so the wrong input is asserted to be wrong, by name.
    const storeKeyScene = compileScene(
      deckSceneSignals({ session: "RTH", rightOfWay: null }).signals,
    ).scene;
    expect(storeKeyScene).not.toBe("CLOSED");
    // …while the owner, for the same instrument on the same day, does reach it.
    expect(sceneFor("TSLA", SATURDAY).scene).toBe("CLOSED");
  });

  it("crypto is open every day — 24X7 compiles away from CLOSED and reads OBSERVED", () => {
    for (const at of [SATURDAY, SUNDAY, WEDNESDAY]) {
      const { token, out, scene } = sceneFor("BTC", at);
      expect(token.token).toBe(SESSION_TOKEN_CONTINUOUS);
      expect(scene).not.toBe("CLOSED");
      expect(out.provenance.SESSION).toBe("OBSERVED");
    }
  });

  it("a weekday equity is honestly UNOBSERVED — there is still no intraday calendar", () => {
    // The honest downgrade. The deck used to report SESSION OBSERVED on a
    // Tuesday on the strength of a store key; it had observed nothing.
    const { token, out, scene } = sceneFor("TSLA", WEDNESDAY);
    expect(token.token).toBe(SESSION_TOKEN_UNKNOWN);
    expect(out.provenance.SESSION).toBe("UNOBSERVED");
    expect(out.observedCount).toBe(0);
    expect(scene).not.toBe("CLOSED");
  });

  it("a proven closure IS an observation — Saturday reads OBSERVED, not UNOBSERVED", () => {
    // §8 is symmetric: withholding an established fact is as much a violation
    // as inventing one. CLOSED on a Saturday is knowledge, not a guess.
    const { token, out } = sceneFor("TSLA", SATURDAY);
    expect(token.token).toBe(SESSION_TOKEN_CLOSED);
    expect(out.provenance.SESSION).toBe("OBSERVED");
  });

  it("at: null makes no day claim at all — the first paint may not assert a session", () => {
    for (const symbol of ["TSLA", "GC1!", "SPY"]) {
      const { out, scene } = sceneFor(symbol, null);
      expect(out.signals.sessionOpen, symbol).toBe(null);
      expect(out.provenance.SESSION, symbol).toBe("UNOBSERVED");
      expect(scene, symbol).not.toBe("CLOSED");
    }
  });

  it("the wire genuinely varies by day and symbol (positive control — not a constant)", () => {
    const seen = new Set([
      sceneFor("TSLA", SATURDAY).token.token,
      sceneFor("TSLA", WEDNESDAY).token.token,
      sceneFor("BTC", SATURDAY).token.token,
      sceneFor("TSLA", null).token.token,
    ]);
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});

describe("/command-deck wires the scene from the owner, not the store key", () => {
  it("PROOF the comment-stripper leaves this file's real code intact", () => {
    // Without this, neutering the stripper would make every BAN below pass
    // vacuously. That has actually happened in this codebase.
    const src = stripComments(DECK_PAGE());
    expect(src).toContain("deckSceneSignals");
    expect(src).toContain("compileScene");
    expect(src.length).toBeGreaterThan(5000);
  });

  it("BANS passing the store key into the scene adapter", () => {
    const src = stripComments(DECK_PAGE());
    expect(src).not.toMatch(/session:\s*identity\.session\s*,\s*rightOfWay/);
  });

  it("calls selectCanonicalSessionToken and feeds ITS token to the adapter", () => {
    const src = stripComments(DECK_PAGE());
    expect(src).toContain("selectCanonicalSessionToken");
    expect(src).toMatch(/session:\s*sessionTruth\.token/);
  });

  it("uses the mount-safe day clock, not the 5s cadence clock, for closure", () => {
    const src = stripComments(DECK_PAGE());
    expect(src).toContain("useSessionClockDate");
    expect(src).toMatch(/at:\s*sessionClockDate/);
  });
});
