import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { certifySource } from "@/lib/marketData/sourceCapabilityCertification";
import {
  alpacaReadinessWireView,
  classifyProviderReceiptFailure,
  moomooTickWireView,
  matrixProviderWireView,
  providerWireView,
  providerConfigReadinessWireView,
  tastytradeWireView,
  longbridgeTickWireView,
  witnessedProviderWireView,
  selectProviderWires,
} from "./ProviderWireStrip";
import { buildAthosCapabilityMatrix } from "@/lib/marketData/canonicalCapabilityResolver";
import { WIRE_PROOF_SYMBOL } from "@/lib/marketData/wireProofScope";

describe("providerWireView", () => {
  it("shows bounded snapshot observations as limited, never live", () => {
    const source = certifySource("webull", [
      { capability: "TICKS", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" },
      { capability: "EXECUTED_VOLUME", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" },
    ]);
    expect(providerWireView(source)).toMatchObject({ tone: "LIMITED", label: "2 observed" });
  });

  it("distinguishes entitlement, auth, and unwired states", () => {
    expect(providerWireView(certifySource("webull", [{ capability: "FUTURES", status: "BLOCKED_ENTITLEMENT", note: "US futures subscription required" }])).tone).toBe("BLOCKED");
    expect(providerWireView(certifySource("moomoo", [{ capability: "PRICE", status: "BLOCKED_AUTH" }])).label).toBe("Authentication blocked");
    expect(providerWireView(certifySource("moomoo", [])).tone).toBe("OFFLINE");
  });

  it("keeps tastytrade auth, quote-token, and real-time proof distinct", () => {
    expect(tastytradeWireView({ configured: false, connected: false, note: "refresh token missing" })).toMatchObject({ tone: "OFFLINE", label: "Not runtime-wired" });
    expect(tastytradeWireView({ configured: true, connected: false })).toMatchObject({ tone: "BLOCKED", label: "Connection failed" });
    expect(tastytradeWireView({ configured: true, connected: true, quotes: false, realTime: null })).toMatchObject({ tone: "LIMITED", label: "Account connected" });
    expect(tastytradeWireView({ configured: true, connected: true, quotes: true, realTime: null })).toMatchObject({ tone: "LIMITED", label: "Quote token ready" });
    // Entitlement is PERMISSION to receive real-time data, not evidence any
    // arrived — and tastytrade ships no /ticks route, so this view has never
    // seen a print. Capped at LIMITED so a config read cannot outrank the
    // receipt-proven chips beside it. See providerWireLiveTone.test.ts.
    expect(tastytradeWireView({ configured: true, connected: true, quotes: true, realTime: true })).toMatchObject({ tone: "LIMITED", label: "Real-time entitled" });
  });

  it("names the exact moomoo tick edge and never upgrades receipt presence to live", () => {
    expect(moomooTickWireView({ label: "NOT CONFIGURED", detail: "MOOMOO_BRIDGE_URL is not configured.", eventCount: 0 })).toMatchObject({ tone: "OFFLINE", label: "Not configured" });
    expect(moomooTickWireView({ label: "AUTH BLOCKED", detail: "Sign in required.", eventCount: 0 })).toMatchObject({ tone: "BLOCKED", label: "AUTH BLOCKED" });
    expect(moomooTickWireView({ label: "NO EVENTS RECEIVED", detail: "No prints returned.", eventCount: 0 })).toMatchObject({ tone: "LIMITED", label: "NO EVENTS RECEIVED" });
    expect(moomooTickWireView({ label: "PROVIDER ERROR", detail: "HTTP 503 before a receipt.", eventCount: 0 })).toMatchObject({ tone: "OFFLINE", label: "Provider error" });
    expect(moomooTickWireView({ label: "RATE LIMITED", detail: "HTTP 429 before a receipt.", eventCount: 0 })).toMatchObject({ tone: "LIMITED", label: "Rate limited" });
    // The chip now names the instrument the probe actually asked about. The
    // assertion that matters here is unchanged: RECEIVING stays LIMITED and is
    // never upgraded to LIVE. See wireProofScope.test.ts for the scope claim.
    expect(moomooTickWireView({ label: "RECEIVING", receiving: true, eventCount: 4 })).toMatchObject({ tone: "LIMITED", label: `Ticks receiving (${WIRE_PROOF_SYMBOL})` });
    expect(moomooTickWireView({ label: "ACCESS UNPROVEN", detail: "HTTP 403 did not classify the failed edge.", eventCount: 0 })).toMatchObject({ tone: "BLOCKED", label: "ACCESS UNPROVEN" });
  });

  it("does not turn an unclassified provider 403 into an authentication claim", () => {
    expect(classifyProviderReceiptFailure(401, "moomoo")).toMatchObject({ label: "AUTH BLOCKED", receiving: false, eventCount: 0 });
    const denied = classifyProviderReceiptFailure(403, "longbridge");
    expect(denied).toMatchObject({ label: "ACCESS UNPROVEN", receiving: false, eventCount: 0 });
    expect(denied.detail).toContain("failed edge");
    expect(classifyProviderReceiptFailure(429, "moomoo")).toMatchObject({ label: "RATE LIMITED", receiving: false, eventCount: 0 });
    expect(classifyProviderReceiptFailure(503, "moomoo")).toMatchObject({ label: "PROVIDER ERROR", receiving: false, eventCount: 0 });
  });

  it("keeps Longbridge receiving below live until entitlement is certified", () => {
    expect(longbridgeTickWireView({ label: "RECEIVING", receiving: true, eventCount: 20 })).toMatchObject({ source: "longbridge", tone: "LIMITED", label: `Ticks receiving (${WIRE_PROOF_SYMBOL})` });
    expect(longbridgeTickWireView({ label: "NOT CONFIGURED", detail: "LONGBRIDGE_BRIDGE_URL missing", eventCount: 0 })).toMatchObject({ source: "longbridge", tone: "OFFLINE", label: "Not configured" });
  });

  it("keeps Alpaca env readiness below connected or receiving", () => {
    const ready = alpacaReadinessWireView({
      providers: [
        { provider: "alpaca-paper", label: "Alpaca (paper)", lane: "broker", status: "BLOCKED", missing: ["ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET"], missingRecommended: [], note: "Paper pair." },
        { provider: "alpaca-live", label: "Alpaca (live)", lane: "broker", status: "CONFIGURED", missing: [], missingRecommended: [], note: "Live pair." },
      ],
    });
    expect(ready).toMatchObject({ source: "alpaca", tone: "LIMITED", label: "Configured to attempt" });
    expect(ready.detail).toContain("no accepted live event receipt");

    const blocked = alpacaReadinessWireView({
      providers: [
        { provider: "alpaca-live", label: "Alpaca (live)", lane: "broker", status: "BLOCKED", missing: ["ALPACA_KEY"], missingRecommended: [], note: "Live pair." },
      ],
    });
    expect(blocked).toMatchObject({ tone: "OFFLINE", label: "Not configured" });
    expect(blocked.detail).toContain("ALPACA_KEY");
  });

  it("turns missing Tastytrade configuration into the exact visible blocker", () => {
    const view = providerConfigReadinessWireView({
      providers: [{
        provider: "tastytrade", label: "Tastytrade", lane: "broker", status: "BLOCKED",
        missing: ["TASTYTRADE_REFRESH_TOKEN"], missingRecommended: [], note: "OAuth token required.",
      }],
    }, "tastytrade", ["tastytrade"]);
    expect(view).toMatchObject({ source: "tastytrade", tone: "OFFLINE", label: "Not configured" });
    expect(view?.detail).toContain("TASTYTRADE_REFRESH_TOKEN");
  });
});

describe("matrixProviderWireView", () => {
  const session = { state: "UNKNOWN" as const, asOf: "2026-08-31T00:00:00.000Z", reason: "calendar owner pending" };

  it("counts only certified realtime capabilities as certified in mixed receipts", () => {
    const matrix = buildAthosCapabilityMatrix([{ certification: certifySource("alpaca", [
      { capability: "PRICE", status: "ACTIVE_CERTIFIED", fidelity: "REALTIME" },
      { capability: "TICKS", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" },
    ]), providerTier: "CANONICAL" }], session);
    expect(matrixProviderWireView(matrix, "alpaca").label).toBe("1 certified · 1 observed");
  });

  it("renders observed snapshot truth below live", () => {
    const matrix = buildAthosCapabilityMatrix([{ certification: certifySource("alpaca", [
      { capability: "PRICE", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", stalenessMs: 500, note: "bounded IEX trade" },
    ]), providerTier: "CANONICAL" }], session);
    expect(matrixProviderWireView(matrix, "alpaca")).toMatchObject({ tone: "LIMITED", label: "1 observed" });
  });

  it("preserves exact auth and not-receiving notes from rejected sources", () => {
    const matrix = buildAthosCapabilityMatrix([
      { certification: certifySource("webull", [{ capability: "TICKS", status: "BLOCKED_AUTH", note: "HTTP 401 from provider" }]), providerTier: "CERTIFIED_NEW" },
      { certification: certifySource("tastytrade", [{ capability: "OPTIONS", status: "NOT_IMPLEMENTED", note: "refresh token missing" }]), providerTier: "CERTIFIED_NEW" },
    ], session);
    expect(matrixProviderWireView(matrix, "webull")).toMatchObject({ tone: "BLOCKED", label: "Authentication blocked", detail: "HTTP 401 from provider" });
    expect(matrixProviderWireView(matrix, "tastytrade")).toMatchObject({ tone: "OFFLINE", label: "Not receiving", detail: "refresh token missing" });
  });

  it("names an observed but unclassified HTTP 403 as access unproven", () => {
    const detail = "Webull Data API returned HTTP 403. Access was denied, but the failed edge was not proven.";
    const matrix = buildAthosCapabilityMatrix([
      { certification: certifySource("webull", [{ capability: "TICKS", status: "NOT_IMPLEMENTED", note: detail }]), providerTier: "CERTIFIED_NEW" },
    ], session);
    expect(matrixProviderWireView(matrix, "webull")).toEqual({
      source: "webull",
      tone: "BLOCKED",
      label: "Access unproven",
      detail,
    });
  });

  it.each([
    ["Webull Data API returned HTTP 500. The provider failed before a tick observation was returned.", "Provider error", "OFFLINE"],
    ["Webull Data API did not respond within 8000 ms; no tick observation was returned.", "Timed out", "OFFLINE"],
    ["Webull Data API returned HTTP 429. The bounded read was rate limited; no tick observation was returned.", "Rate limited", "LIMITED"],
    ["Webull Data API returned no valid, symbol-matched tick observations.", "No events", "LIMITED"],
    ["Webull Data API returned symbol-matched prints, but the newest provider timestamp was 65000 ms old; stale prints were not exposed as current.", "Stale data", "LIMITED"],
  ])("keeps the observed runtime edge '%s' out of the unwired bucket", (detail, label, tone) => {
    const matrix = buildAthosCapabilityMatrix([
      { certification: certifySource("webull", [{ capability: "TICKS", status: "NOT_IMPLEMENTED", note: detail }]), providerTier: "CERTIFIED_NEW" },
    ], session);
    expect(matrixProviderWireView(matrix, "webull")).toMatchObject({ label, tone, detail });
  });
});

describe("ProviderWireStrip touch truth surface", () => {
  it("keeps exact provider state accessible while compact surfaces stay calm", () => {
    const source = readFileSync(new URL("./ProviderWireStrip.tsx", import.meta.url), "utf8");
    expect(source).toContain('aria-label={`${wire.source}: ${wire.label}. ${wire.detail} Open provider readiness wireboard.`}');
    expect(source).toContain('data-provider-tone={wire.tone}');
    expect(source).toContain('href="/readiness"');
    expect(source).toContain('readJson<ReadinessPayload>("/api/broker/readiness")');
    expect(source).toContain("readJsonReceipt<T>(fetch, url, controller.signal)");
    expect(source).toContain("readClassifiedJsonReceipt<MoomooTickReceipt>(");
    expect(source).not.toContain("const body = await response.json()");
    expect(source).toContain("Inspect wire →");
    expect(source).toContain('{compact ? "Connections" : "Market data wires"}');
    expect(source).toContain('compact ? "View details →"');
    expect(source).toContain("{!compact && (");
    expect(source).toContain("WebkitLineClamp: 3");
    expect(source).not.toContain('whiteSpace: "nowrap" }}>{wire.detail}');
    expect(source).toContain('minmax(min(100%, 180px), 1fr)');
    expect(source).toContain('flexWrap: "wrap"');
    expect(source).not.toContain('whiteSpace: "nowrap" }}>{wire.label}');
    expect(source).not.toContain('"1 0 126px"');
  });

  it("uses compact connection summaries on the chart and command deck surfaces", () => {
    const brokers = readFileSync(new URL("../broker/BrokerConnectPanel.tsx", import.meta.url), "utf8");
    const deck = readFileSync(new URL("../../app/command-deck/page.tsx", import.meta.url), "utf8");
    expect(brokers).toContain("<ProviderWireStrip compact />");
    expect(deck).toContain("<ProviderWireStrip");
    expect(deck).toContain('className="wm-cd-connection-diagnostics"');
    expect(deck).toContain("Connections · provider readiness");
  });

  it("the deck hands the strip its own witness, from the same values it publishes upward", () => {
    // THE ADOPTION GATE. `witnessedProviderWireView` is inert unless a surface
    // actually passes `sourcedObservation`, and an owner nobody calls is a
    // convention with extra steps. This pins the CALL, not just the export.
    //
    // It also pins that the three witness values are the SAME expressions the
    // deck already publishes in `usePublishOsStanding({ feed })`. If the strip
    // were fed a second, independently-derived notion of "did a quote arrive",
    // this whole fix would have re-created the defect it closes one panel over.
    const deck = readFileSync(new URL("../../app/command-deck/page.tsx", import.meta.url), "utf8");
    expect(deck).toContain("sourcedObservation={");
    expect(deck).toContain('wsFeed.source && wsFeed.source !== "unavailable"');
    expect(deck).toContain("quotePresent: Number.isFinite(wsFeed.ticker.price) && wsFeed.ticker.price > 0");
    expect(deck).toContain("barsPresent: (deckCandles?.length ?? 0) > 0");
  });
});

/**
 * §14.1 — AN ABSENCE MUST BE A FINDING, NOT A DEFAULT.
 *
 * Reproduces the live 2026-09-18 /command-deck contradiction: the Connections
 * strip printed `alpaca Not receiving` while the hero inches above it printed
 * `source alpaca · 365.65` over 120 drawn bars.
 */
describe("witnessedProviderWireView (canon Weakness #1, third panel)", () => {
  const session = { state: "UNKNOWN" as const, asOf: "2026-08-31T00:00:00.000Z", reason: "calendar owner pending" };
  const notReceiving = { source: "alpaca", tone: "OFFLINE", label: "Not receiving", detail: "refresh token missing" } as const;
  // The only absence a witness may contradict: the branch that KNOWS it
  // measured nothing at all. See `ProviderWireView.evidenceless`.
  const unknown = { source: "alpaca", tone: "OFFLINE", label: "Status unavailable", detail: "The canonical capability probe did not return.", evidenceless: true } as const;
  const witness = { source: "alpaca", quotePresent: true, barsPresent: true };

  it("PRECONDITION: the matrix ladder really does end at Not receiving", () => {
    // Without this the assertions below could pass over a label that no longer
    // exists, which is the vacuous green this suite must not rot into.
    const matrix = buildAthosCapabilityMatrix([
      { certification: certifySource("alpaca", [{ capability: "PRICE", status: "NOT_IMPLEMENTED", note: "refresh token missing" }]), providerTier: "CERTIFIED_NEW" },
    ], session);
    expect(matrixProviderWireView(matrix, "alpaca")).toMatchObject({ tone: "OFFLINE", label: "Not receiving" });
  });

  it("a provider sourcing a drawn observation may not be called Status unavailable", () => {
    const wire = witnessedProviderWireView(unknown, witness);
    expect(wire.label).toBe("Observed · not certified");
    expect(wire.tone).toBe("LIMITED");
  });

  it("keeps the witnessed reason rather than deleting it", () => {
    // The owner was not wrong about what it measured. Losing the stated reason
    // would trade one silent inaccuracy for another.
    expect(witnessedProviderWireView(unknown, witness).detail).toContain("did not return");
    expect(witnessedProviderWireView(unknown, witness).detail).toContain("alpaca");
  });

  it("bars alone are enough — a closed session serves no quote and hundreds of bars", () => {
    const barsOnly = witnessedProviderWireView(unknown, { source: "alpaca", quotePresent: false, barsPresent: true });
    expect(barsOnly.label).toBe("Observed · not certified");
    expect(barsOnly.detail).toContain("drawn bars");
  });

  it("THE CORRECTION: a MEASURED absence survives the witness — only an assumed one yields", () => {
    // MEASURED LIVE 2026-09-18 on /command-deck TSLA, by going BACK to
    // production to observe the previous fix rather than trusting it worked.
    // Alpaca's rejection note read: "...its provider timestamp was 43549376 ms
    // old; stale evidence was not exposed as current." 12.1 hours — a
    // MEASUREMENT, not a default.
    //
    // The first draft of this witness gated on a set of LABEL STRINGS that
    // included "Not receiving". That label is only ever produced when a
    // rejected capability row EXISTS, so the draft would have promoted a
    // staleness refusal to "Observed · not certified" — laundering an earned
    // verdict. The over-correction guards below covered BLOCKED and LIVE; they
    // did not cover an OFFLINE verdict that had been EARNED. This one does.
    expect(witnessedProviderWireView(notReceiving, witness)).toEqual(notReceiving);
  });

  it("the live staleness wording is classified as Stale data, not flattened to Not receiving", () => {
    // Root cause #1 of the same live reading: the classifier matched PHRASING
    // ("stale prints"/"stale data"/"print … old") rather than MEANING, so the
    // synonym "stale evidence" and the unit-carrying "43549376 ms old" both
    // fell through, and a SPECIFIC verdict was flattened into a generic one.
    // Rewording an upstream note must not silently downgrade its verdict.
    const matrix = buildAthosCapabilityMatrix([
      {
        certification: certifySource("alpaca", [{
          capability: "PRICE",
          status: "NOT_IMPLEMENTED",
          note: "Alpaca returned a valid TSLA IEX trade, but its provider timestamp was 43549376 ms old; stale evidence was not exposed as current.",
        }]),
        providerTier: "CERTIFIED_NEW",
      },
    ], session);
    const wire = matrixProviderWireView(matrix, "alpaca");
    expect(wire.label).toBe("Stale data");
    expect(wire.tone).toBe("LIMITED");
    expect(wire.detail).toContain("43549376 ms old");
    // and being a finding, no witness may overrule it
    expect(witnessedProviderWireView(wire, witness)).toEqual(wire);
  });

  it("NOT an over-correction: an earned BLOCKED verdict survives the witness", () => {
    // A provider can be authenticated-blocked for ORDERS while still relaying
    // PRICE. The witness answers "did anything arrive", never "is this wire
    // healthy", and it must never launder a probe that actually ran and failed.
    const blocked = { source: "alpaca", tone: "BLOCKED", label: "Authentication blocked", detail: "HTTP 401" } as const;
    expect(witnessedProviderWireView(blocked, witness)).toEqual(blocked);
  });

  it("NOT an over-correction: a certified LIVE wire is not demoted to LIMITED", () => {
    const live = { source: "alpaca", tone: "LIVE", label: "1 certified", detail: "price realtime" } as const;
    expect(witnessedProviderWireView(live, witness)).toEqual(live);
  });

  it("speaks only for the provider it witnessed", () => {
    // The bug this guards against is a witness for alpaca silencing an honest
    // absence on tastytrade, which would be a far worse lie than the original.
    const tasty = { ...unknown, source: "tastytrade" } as const;
    expect(witnessedProviderWireView(tasty, witness)).toEqual(tasty);
  });

  it("an absent or empty witness changes nothing", () => {
    expect(witnessedProviderWireView(unknown, null)).toEqual(unknown);
    expect(witnessedProviderWireView(unknown, { source: "alpaca", quotePresent: false, barsPresent: false })).toEqual(unknown);
  });

  it("selectProviderWires applies the witness AFTER the readiness override", () => {
    // ORDER IS THE WHOLE POINT. The readiness override runs late and can stamp
    // "Not configured" over a matrix result; if the witness ran first, that
    // override would reinstate the absence the page had already disproved.
    const wires = selectProviderWires({
      matrix: null, readiness: null, moomooTicks: null, longbridgeTicks: null,
      webullTicks: null, failures: new Set(["market"]), suspended: false,
      sourcedObservation: witness,
    });
    const alpaca = wires.find((w) => w.source === "alpaca");
    expect(alpaca?.label).toBe("Observed · not certified");
    // and every provider the page did NOT witness still reports honestly
    expect(wires.find((w) => w.source === "moomoo")?.label).toBe("Status unavailable");
  });
});

describe("THE PROSE ROUND-TRIP (the generalised root cause)", () => {
  // WHY THIS SENTINEL EXISTS.
  //
  // The 2026-09-18 staleness defect was not a one-off typo in a regex. It was
  // an instance of a STRUCTURAL arrangement this repo builds on purpose:
  //
  //   `zeroState(...)` in src/lib/marketData/adapters/* AUTHORS AN ENGLISH
  //   SENTENCE, and `matrixProviderWireView` below PARSES THAT SENTENCE BACK
  //   with regular expressions to decide a verdict.
  //
  // Prose is the wire format. Nothing type-checks it, so rewording a note — or
  // adding a new one — silently downgrades a SPECIFIC, MEASURED refusal into
  // the generic "Not receiving", which is a claim about DELIVERY that no branch
  // measured. That is §14.1 violated by drift rather than by decision.
  //
  // So: read the notes out of the adapters, run every one of them through the
  // real classifier, and fail BY NAME on any that lands on the generic arm.
  // A new unclassified note cannot reach production without turning this red.
  //
  // SCOPE, HONESTLY STATED: this covers `zeroState(...)` arguments, which are
  // refusals by construction. moomoo/longbridge author their refusal notes
  // inline on capability rows instead, and separating those from ACCEPTED-row
  // notes statically is not reliable — they are NOT covered here. That gap is
  // real and is recorded rather than papered over.
  const ADAPTER_DIR = "src/lib/marketData/adapters";

  function extractZeroStateNotes(): ReadonlyArray<{ file: string; note: string }> {
    const out: { file: string; note: string }[] = [];
    for (const file of readdirSync(ADAPTER_DIR)) {
      if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
      const src = readFileSync(`${ADAPTER_DIR}/${file}`, "utf8");
      // zeroState("..."), zeroState('...'), zeroState(`...`) — first argument only.
      const re = /zeroState\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        // Template placeholders stand in for runtime values. `999` is chosen so
        // that unit-carrying notes ("within ${ms} ms", "HTTP ${status}") remain
        // well-formed rather than degenerating into unparseable text.
        out.push({ file, note: m[2].replace(/\$\{[^}]*\}/g, "999") });
      }
    }
    return out;
  }

  const notes = extractZeroStateNotes();

  it("PRECONDITION: the adapter corpus was actually found and is non-trivial", () => {
    // Without this, a rename of `zeroState` or a move of the adapter directory
    // would empty the corpus and every assertion below would pass over nothing.
    // A vacuous gate is worse than no gate: it reports safety it never checked.
    expect(notes.length).toBeGreaterThanOrEqual(8);
    expect(new Set(notes.map((n) => n.file)).size).toBeGreaterThanOrEqual(2);
  });

  it("no adapter refusal note is flattened into the generic label", () => {
    const session = { state: "UNKNOWN" as const, asOf: "2026-08-31T00:00:00.000Z", reason: "calendar owner pending" };
    const flattened = notes.filter(({ note }) => {
      const matrix = buildAthosCapabilityMatrix([
        { certification: certifySource("alpaca", [{ capability: "PRICE", status: "NOT_IMPLEMENTED", note }]), providerTier: "CERTIFIED_NEW" },
      ], session);
      const label = matrixProviderWireView(matrix, "alpaca").label;
      return label === "Not receiving" || label === "Status unavailable";
    });
    // Reported as file + note so a failure names the exact sentence to classify,
    // not merely a count.
    expect(flattened.map((n) => `${n.file}: ${n.note}`)).toEqual([]);
  });

  // The Sentinel above proves no note lands on the generic arm. It does NOT
  // prove each lands on the RIGHT arm — "not generic" is a weaker claim than
  // "correct". These pin the verdict itself for every note the round-trip
  // audit moved off the generic arm, so a later regex widening that captures
  // one of them into the wrong bucket fails by name.
  const session = { state: "UNKNOWN" as const, asOf: "2026-08-31T00:00:00.000Z", reason: "calendar owner pending" };
  function classify(note: string) {
    const matrix = buildAthosCapabilityMatrix([
      { certification: certifySource("alpaca", [{ capability: "PRICE", status: "NOT_IMPLEMENTED", note }]), providerTier: "CERTIFIED_NEW" },
    ], session);
    return matrixProviderWireView(matrix, "alpaca");
  }

  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ["Alpaca live market-data credentials are not configured together in this runtime.", "Not configured", "OFFLINE"],
    ["Alpaca IEX snapshot transport was unreachable; no market observation was returned.", "Unreachable", "OFFLINE"],
    ["Alpaca IEX snapshot did not contain a valid provider-timestamped trade for the canary symbol.", "No events", "LIMITED"],
    ["Webull data bridge configured (https://x) but its response envelope is not yet verified in this adapter — refusing to claim capabilities from an unproven transport.", "Transport unproven", "OFFLINE"],
    // An HTTP code nobody has met yet still names itself rather than claiming silence.
    ["Alpaca returned HTTP 404; the failed edge is not proven and no capability is claimed.", "HTTP 404", "OFFLINE"],
  ];

  for (const [note, label, tone] of cases) {
    it(`classifies as ${label}: ${note.slice(0, 56)}…`, () => {
      const wire = classify(note);
      expect(wire.label).toBe(label);
      expect(wire.tone).toBe(tone);
      // Every one of these is a FINDING, so none may be overruled by a witness.
      expect(wire.evidenceless).not.toBe(true);
    });
  }

  it("SENTINEL: no composed wire's display LABEL is ever used as control flow", () => {
    // THE RULE THIS FILE HAD TO LEARN THREE TIMES.
    //
    //   1. `receiptAffirmsTicks` re-detected "prints arrived" by comparing a
    //      composed label to the literal "Ticks receiving".
    //   2. `witnessedProviderWireView` gated on a SET of labels including
    //      "Not receiving" — which let a witness overrule a MEASURED absence.
    //   3. `selectProviderWires` decided whether a readiness override could
    //      replace a matrix verdict by testing for "Status unavailable" or
    //      "Not runtime-wired". The second of those is emitted by two branches
    //      that mean OPPOSITE things (noted = a finding, no-note = a default),
    //      so the label could not express the distinction the code needed.
    //
    // Each time, a display string was load-bearing: renaming a chip would have
    // silently changed which claims the code believed. Verdicts must be carried
    // by FIELDS (`tone`, `evidenceless`), never re-parsed from what the user
    // happens to read on screen. A point fix would not have stopped a fourth
    // instance, so the rule itself is pinned.
    //
    // Receipt labels ("RECEIVING", "AUTH BLOCKED") are deliberately NOT covered:
    // those are protocol tokens arriving from an API, not text this file chose
    // for display. That distinction is the whole point.
    const src = readFileSync("src/components/marketData/ProviderWireStrip.tsx", "utf8");
    const code = src
      .split("\n")
      .filter((line) => !/^\s*(?:\/\/|\*|\/\*)/.test(line))
      .join("\n");
    // PRECONDITION: the file was actually read and comment-stripping did not
    // eat the implementation, or this assertion would pass over nothing.
    expect(code.length).toBeGreaterThan(8000);
    expect(code).toContain("evidenceless");

    const offenders = code
      .split("\n")
      .filter((line) => /\b(?:wire|view|resolved|override)\.label\s*[!=]==/.test(line));
    expect(offenders).toEqual([]);
  });

  it("the arms added above did not steal the verdicts the ladder already got right", () => {
    // Over-correction guard. Widening a classifier is how a previously-correct
    // row quietly changes meaning; these are the neighbours most at risk.
    expect(classify("Alpaca returned HTTP 401; the credential was rejected.").label).toBe("Authentication blocked");
    expect(classify("Alpaca returned HTTP 503; the provider failed.").label).toBe("Provider error");
    expect(classify("Alpaca returned HTTP 429. The bounded read was rate limited.").label).toBe("Rate limited");
    expect(classify("Alpaca returned HTTP 403; the failed edge is not proven and no capability is claimed.").label).toBe("Access unproven");
    expect(classify("Alpaca IEX snapshot did not respond within 2500 ms; no market observation was returned.").label).toBe("Timed out");
    expect(classify("Alpaca returned a valid TSLA IEX trade, but its provider timestamp was 43549376 ms old; stale evidence was not exposed as current.").label).toBe("Stale data");
  });
});
