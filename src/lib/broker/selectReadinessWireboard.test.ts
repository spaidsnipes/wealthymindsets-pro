import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripComments } from "@/lib/sourceScan";
import { selectReadinessWireboard, type ReadinessPayload, type ReadinessWireboard } from "./selectReadinessWireboard";
import type { ProviderReadiness } from "./providerReadiness";

const ready: ProviderReadiness = {
  provider: "alpaca-live",
  label: "Alpaca (live)",
  lane: "broker",
  status: "CONFIGURED",
  missing: [],
  missingRecommended: [],
  note: "Live-account key/secret pair.",
};

const blocked: ProviderReadiness = {
  provider: "webull-data",
  label: "Webull market data",
  lane: "market-data",
  status: "BLOCKED",
  missing: ["WEBULL_API_HOST"],
  missingRecommended: ["WEBULL_DATA_URL", "WEBULL_CANARY_SYMBOL"],
  note: "Signed tick reads.",
};

const payload = (providers: ProviderReadiness[]): ReadinessPayload => ({
  surface: "broker-readiness",
  providers,
  envPresence: [
    { name: "ALPACA_KEY", present: true },
    { name: "ALPACA_SECRET", present: true },
    { name: "WEBULL_API_HOST", present: false },
  ],
});

describe("selectReadinessWireboard", () => {
  it("projects Supabase account-service presence without claiming authentication", () => {
    const configured = selectReadinessWireboard({
      providers: [ready],
      accountService: { configured: true, missing: [] },
    });
    expect(configured.accountService.blockerClass).toBe("SETUP PRESENT");
    expect(configured.accountService.detail).toContain("still requires a successful auth receipt");

    const blocked = selectReadinessWireboard({
      providers: [ready],
      accountService: { configured: false, missing: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] },
    });
    expect(blocked.accountService.blockerClass).toBe("NOT CONFIGURED");
    expect(blocked.accountService.detail).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("maps providers to rows preserving identity, lane, and status", () => {
    const wb = selectReadinessWireboard(payload([ready, blocked]));
    expect(wb.rows).toHaveLength(2);
    expect(wb.rows[0]).toMatchObject({ provider: "alpaca-live", lane: "broker", status: "CONFIGURED" });
    expect(wb.rows[1]).toMatchObject({ provider: "webull-data", lane: "market-data", status: "BLOCKED" });
  });

  it("labels a BLOCKED provider as NOT CONFIGURED and names the exact missing var — never entitlement", () => {
    const wb = selectReadinessWireboard(payload([blocked]));
    const row = wb.rows[0];
    expect(row.blockerClass).toBe("NOT CONFIGURED");
    expect(row.blockerDetail).toContain("WEBULL_API_HOST");
    expect(row.blockerDetail).toContain("NOT CONFIGURED");
    // Monday Test 2 law: presence-only readiness must NEVER fabricate an
    // entitlement/delay blocker.
    expect(row.blockerDetail.toUpperCase()).not.toContain("ENTITLEMENT");
    expect(row.blockerDetail.toUpperCase()).not.toContain("DELAYED");
  });

  it("labels a CONFIGURED provider honestly as not-yet-connected, never certified", () => {
    const wb = selectReadinessWireboard(payload([ready]));
    const row = wb.rows[0];
    expect(row.blockerClass).toBe("SETUP PRESENT");
    expect(row.blockerDetail.toLowerCase()).toContain("not yet connected");
    expect(row.blockerDetail.toLowerCase()).not.toContain("certified — ");
  });

  it("surfaces a fidelity gap for a CONFIGURED provider missing recommended vars, without blocking it", () => {
    const readyWithGap: ProviderReadiness = { ...ready, missingRecommended: ["ALPACA_FEED"] };
    const wb = selectReadinessWireboard(payload([readyWithGap]));
    expect(wb.rows[0].status).toBe("CONFIGURED");
    expect(wb.rows[0].blockerDetail).toContain("ALPACA_FEED");
    expect(wb.rows[0].blockerDetail.toLowerCase()).toContain("fidelity gap");
  });

  it("pluralizes the missing-variables sentence correctly", () => {
    const twoMissing: ProviderReadiness = { ...blocked, missing: ["A", "B"] };
    const oneMissing: ProviderReadiness = { ...blocked, missing: ["A"] };
    expect(selectReadinessWireboard(payload([twoMissing])).rows[0].blockerDetail).toContain("variables: A, B");
    expect(selectReadinessWireboard(payload([oneMissing])).rows[0].blockerDetail).toContain("variable: A");
  });

  it("computes a value-free headline summary and ready count", () => {
    const wb = selectReadinessWireboard(payload([ready, blocked]));
    expect(wb.summary).toBe("1/2 providers configured");
    expect(wb.summary).not.toContain("READY");
    expect(wb.readyCount).toBe(1);
    expect(wb.totalCount).toBe(2);
  });

  it("counts env presence without leaking any value", () => {
    const wb = selectReadinessWireboard(payload([ready]));
    expect(wb.envPresentCount).toBe(2);
    expect(wb.envTotalCount).toBe(3);
  });

  it("treats a null / empty payload as empty, never throwing", () => {
    expect(selectReadinessWireboard(null).empty).toBe(true);
    expect(selectReadinessWireboard(undefined).rows).toEqual([]);
    expect(selectReadinessWireboard({}).summary).toBe("0/0 providers configured");
  });
});

describe("selectReadinessWireboard near-miss section", () => {
  it("is empty when the payload carries no near misses (the normal case)", () => {
    expect(selectReadinessWireboard({ providers: [] }).nearMisses).toEqual([]);
    expect(selectReadinessWireboard(null).nearMisses).toEqual([]);
    expect(selectReadinessWireboard({ providers: [], nearMisses: [] }).nearMisses).toEqual([]);
  });

  it("renders the 2026-09-05 typo as NEAR-CERTAIN and names both sides", () => {
    const wb = selectReadinessWireboard({
      providers: [],
      nearMisses: [
        { expected: "FINNHUB_KEY", found: "FINNHUB_KEY_", confidence: "EXACT_MODULO_PUNCTUATION" },
      ],
    });
    expect(wb.nearMisses).toHaveLength(1);
    const [miss] = wb.nearMisses;
    expect(miss.strength).toBe("NEAR-CERTAIN");
    expect(miss.expected).toBe("FINNHUB_KEY");
    expect(miss.found).toBe("FINNHUB_KEY_");
    expect(miss.detail).toContain("FINNHUB_KEY_");
    expect(miss.detail).toContain("FINNHUB_KEY");
  });

  it("demotes a token overlap to LEAD and refuses to call it a diagnosis", () => {
    const wb = selectReadinessWireboard({
      providers: [],
      nearMisses: [
        { expected: "LIVEKIT_API_KEY", found: "ATH_LIVEKIT_KEY_", confidence: "SHARED_DISTINCTIVE_TOKENS" },
      ],
    });
    expect(wb.nearMisses[0].strength).toBe("LEAD");
    expect(wb.nearMisses[0].detail).toContain("not a diagnosis");
  });

  it("never claims renaming will make the provider work (values are unproven)", () => {
    // The detector compares NAMES. It cannot know the value behind the
    // lookalike is valid, so the copy must not promise a working connection.
    const wb = selectReadinessWireboard({
      providers: [],
      nearMisses: [
        { expected: "FINNHUB_KEY", found: "FINNHUB_KEY_", confidence: "EXACT_MODULO_PUNCTUATION" },
      ],
    });
    const copy = wb.nearMisses.map((m) => m.detail).join(" ").toLowerCase();
    for (const forbidden of ["will work", "will fix", "connected", "live", "certified"]) {
      expect(copy).not.toContain(forbidden);
    }
  });
});

/**
 * A BLOCKED ROW MUST CARRY ITS OWN COUNTER-EVIDENCE.
 *
 * Measured, 2026-09-05 → 2026-09-11 (six days, stock tape dark):
 *
 *   providers section → "finnhub … NOT CONFIGURED — missing required
 *                        variable: FINNHUB_KEY."
 *   near-miss section → "this host carries FINNHUB_KEY_"
 *
 * Both were rendered on /readiness. Neither pointed at the other, and the
 * row's own visible line read "This provider still needs setup in the current
 * runtime." A reader who stopped at the row — which is the row's whole job —
 * concluded the credential was ABSENT and would have gone to obtain a new key.
 * The correct action was to declare the host's real name as an alias.
 *
 * The invariant is not "render near misses somewhere". It is that the sentence
 * which states a credential is missing must itself carry the evidence that it
 * may not be. Proximity on a page is not a join.
 */
describe("a blocked row names the lookalike sitting on its own missing name", () => {
  const finnhubBlocked: ProviderReadiness = {
    provider: "finnhub",
    label: "Finnhub",
    lane: "market-data",
    status: "BLOCKED",
    missing: ["FINNHUB_KEY"],
    missingRecommended: [],
    note: "Quote proxy.",
  };

  const withHit = (): ReadinessWireboard =>
    selectReadinessWireboard({
      providers: [finnhubBlocked, blocked],
      nearMisses: [{ expected: "FINNHUB_KEY", found: "FINNHUB_KEY_", confidence: "EXACT_MODULO_PUNCTUATION" }],
    });

  it("THE MEASURED FAILURE: the blocker sentence carries the lookalike", () => {
    const row = withHit().rows[0];
    expect(row.nameMismatches.map((m) => m.found)).toEqual(["FINNHUB_KEY_"]);
    expect(row.blockerDetail).toContain("FINNHUB_KEY_");
    expect(row.blockerDetail).toContain("NAME MISMATCH");
  });

  it("and does not let the reader conclude the credential is simply absent", () => {
    const row = withHit().rows[0];
    // The original sentence ended at the missing name. Ending there is the bug.
    expect(row.blockerDetail).not.toMatch(/missing required variable: FINNHUB_KEY\.$/);
  });

  it("joins by name — an unrelated blocked provider stays clean", () => {
    // webull-data is missing WEBULL_API_HOST, which has no hit. A row must not
    // inherit another row's evidence; that would be noise dressed as a finding.
    const row = withHit().rows[1];
    expect(row.nameMismatches).toEqual([]);
    expect(row.blockerDetail).not.toContain("FINNHUB_KEY_");
  });

  it("a hit for a name NO blocked row is missing reaches no row", () => {
    const wb = selectReadinessWireboard({
      providers: [finnhubBlocked],
      nearMisses: [{ expected: "LIVEKIT_API_KEY", found: "ATH_LIVEKIT_KEY_", confidence: "SHARED_DISTINCTIVE_TOKENS" }],
    });
    expect(wb.rows[0].nameMismatches).toEqual([]);
    // …but it is NOT discarded: the fleet-level list still reports it.
    expect(wb.nearMisses.map((m) => m.found)).toEqual(["ATH_LIVEKIT_KEY_"]);
  });

  it("the normal case stays quiet — no hits, no qualifier", () => {
    const row = selectReadinessWireboard(payload([blocked])).rows[0];
    expect(row.nameMismatches).toEqual([]);
    expect(row.blockerDetail).toContain("NOT CONFIGURED");
    expect(row.blockerDetail).not.toContain("lookalike");
  });

  it("never leaks a value through the row join — names and labels only", () => {
    const row = withHit().rows[0];
    for (const m of row.nameMismatches) {
      expect(Object.keys(m).sort()).toEqual(["detail", "expected", "found", "strength"]);
    }
  });

  it("the /readiness page renders the mismatch OUTSIDE the collapsed receipt", () => {
    // stripComments, not the raw file: the first draft of this scan matched the
    // explanatory COMMENT above the block it was trying to locate and failed on
    // prose. A scan that can be satisfied or broken by a comment proves nothing
    // about what renders.
    const page = stripComments(
      readFileSync(resolve(__dirname, "..", "..", "app", "readiness", "page.tsx"), "utf8"),
    );
    expect(page).toContain("row.nameMismatches");
    const details = page.indexOf("Technical receipt");
    const mismatch = page.indexOf("row.nameMismatches.length > 0 && (");
    expect(mismatch).toBeGreaterThan(-1);
    expect(
      mismatch,
      "The mismatch block renders inside/after the collapsed Technical receipt. " +
        "Evidence that only appears when a reader expands a disclosure is exactly " +
        "how this fact lost to the summary sentence for six days.",
    ).toBeLessThan(details);
  });
});

/**
 * THE TRUTH GAP THIS CLOSES.
 *
 * On 2026-09-20 /readiness rendered the Webull broker row as "SETUP PRESENT"
 * — green border, reassuring sentence — while /api/broker/webull/status, on
 * the same runtime, was returning a live BLOCKED_AUTH. Neither statement was
 * a lie. Read together by a human they produce the Founder's three-month
 * complaint verbatim: "it says it's connected but I can't see my data."
 *
 * Presence is the weaker evidence. When the stronger evidence is in hand, a
 * page that still shows the weaker one is not being careful; it is withholding.
 */
describe("selectReadinessWireboard · live measurement overrides presence", () => {
  const webullBroker: ProviderReadiness = {
    provider: "webull-broker",
    label: "Webull (broker)",
    lane: "broker",
    status: "CONFIGURED",
    missing: [],
    missingRecommended: [],
    note: "Signed account reads.",
  };
  const measure = (state: string, connected = false) => ({
    provider: "webull-broker",
    connected,
    state,
    note: "provider said so",
    checkedAt: "2026-09-20T00:00:00Z",
  });
  const rowFor = (state: string, connected = false) =>
    selectReadinessWireboard(payload([webullBroker]), [measure(state, connected)]).rows[0];

  it("a CONFIGURED provider measured BLOCKED_AUTH does NOT render as SETUP PRESENT", () => {
    const row = rowFor("BLOCKED_AUTH");
    expect(row.status).toBe("CONFIGURED");
    expect(row.blockerClass).toBe("AUTH BLOCKED");
    expect(row.blockerClass).not.toBe("SETUP PRESENT");
  });

  it("keeps 'tap approve' and 'identity rejected' as different classes with different actions", () => {
    const waiting = rowFor("AWAITING_2FA");
    const rejected = rowFor("BLOCKED_AUTH");
    expect(waiting.blockerClass).toBe("AWAITING 2FA");
    expect(rejected.blockerClass).toBe("AUTH BLOCKED");
    expect(waiting.live?.nextAction).not.toBe(rejected.live?.nextAction);
    // The 2FA action must not send anyone hunting for a credential.
    expect(waiting.live!.nextAction).toMatch(/approve/i);
    expect(waiting.live!.nextAction).not.toMatch(
      /\b(add|set|paste|re-?enter|supply|obtain)\s+(a|the\s+)?\w*\s*(secret|credential|token|variable|key)/i,
    );
    // And an account-lane 401 must never be narrated as an entitlement fact —
    // that sentence is what sent the Founder shopping for data he owned.
    expect(rejected.live!.nextAction).toMatch(/subscription|data package/i);
    expect(rejected.live!.nextAction).toMatch(/says nothing about/i);
  });

  it("promotes a measured-connected provider past SETUP PRESENT", () => {
    expect(rowFor("CONNECTED", true).blockerClass).toBe("CONNECTED");
  });

  it("reads an UNRECOGNISED provider state as NOT CONNECTED, never as setup present", () => {
    // A token we do not understand must not fall through to the reassuring
    // reading. Unknown is closer to "not connected" than to "fine".
    expect(rowFor("SOME_STATE_WE_HAVE_NOT_SEEN").blockerClass).toBe("NOT CONNECTED");
  });

  it("leaves an UNMEASURED provider on presence-only truth and marks it so", () => {
    const wb = selectReadinessWireboard(payload([ready, webullBroker]), [measure("BLOCKED_AUTH")]);
    const unmeasured = wb.rows.find((r) => r.provider === "alpaca-live")!;
    expect(unmeasured.live).toBeNull();
    expect(unmeasured.blockerClass).toBe("SETUP PRESENT");
    // A probe for one provider may never silently re-grade another.
    expect(wb.rows.find((r) => r.provider === "webull-broker")!.live).not.toBeNull();
  });

  it("carries the provider's own words and the time it said them", () => {
    const row = rowFor("BLOCKED_AUTH");
    expect(row.live!.note).toBe("provider said so");
    expect(row.live!.checkedAt).toBe("2026-09-20T00:00:00Z");
    expect(row.live!.state).toBe("BLOCKED_AUTH");
  });

  it("the /readiness page renders the measurement ABOVE the collapsed receipt, and colours by it", () => {
    const page = stripComments(
      readFileSync(resolve(__dirname, "..", "..", "app", "readiness", "page.tsx"), "utf8"),
    );
    // It must actually ASK for the measurement, not just be able to accept one.
    //
    // UPDATED 2026-09-25 to the new truth. The page used to fetch
    // /api/broker/webull/status inline and build the webull-broker measurement
    // itself — so it asked ONE lane, and the "Webull market data" row read
    // "NOT MEASURED. No live probe exists" beside a probe answering 403
    // MARKET_DATA_NOT_SUBSCRIBED. Both lanes are now read by the one lane owner
    // (`readWebullLanes`) and mapped to rows by `webullWireboardMeasurements`,
    // so the pin follows the ask to where it lives — and now demands BOTH
    // routes and BOTH row ids, which is strictly more than it demanded before.
    expect(page).toContain("readWebullLanes(fetch, controller.signal)");
    expect(page).toContain("webullWireboardMeasurements(");
    const owner = stripComments(readFileSync(resolve(__dirname, "webullStatus.ts"), "utf8"));
    expect(owner).toContain('"/api/broker/webull/status"');
    expect(owner).toContain("/api/market-data/webull/ticks?symbol=");
    expect(owner).toContain('broker: "webull-broker"');
    expect(owner).toContain('data: "webull-data"');

    const live = page.indexOf("row.live && (");
    const details = page.indexOf("Technical receipt");
    expect(live).toBeGreaterThan(-1);
    expect(
      live,
      "The live measurement renders inside/after the collapsed Technical receipt. " +
        "Evidence a reader must expand a disclosure to find is how 'SETUP PRESENT' " +
        "beat a live AUTH BLOCKED on the same page.",
    ).toBeLessThan(details);

    // The green border decides whether anyone keeps investigating. It must be
    // driven by the measurement when one exists, not by credential presence.
    expect(page).toContain('row.live ? row.live.blockerClass === "CONNECTED" : row.status === "CONFIGURED"');
    // An unprobed row must SAY it is unprobed rather than implying a pass.
    expect(page).toContain("NOT MEASURED");
  });
});
