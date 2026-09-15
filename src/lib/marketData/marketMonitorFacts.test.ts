/**
 * Sentinel — /ai-bot "Live market monitor".
 *
 * PINNED TO MEANING. Each assertion fails when WM collapses distinguishable
 * refusals into one, renders a refusal as a glyph, or lets one feed's silence
 * stand as evidence about another feed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyMonitorLink,
  monitorLinkReason,
  monitorPriceFact,
  monitorLatencyFact,
  monitorConnectionFact,
  monitorSourceFact,
  monitorTapeFact,
  monitorChangeFact,
  type MonitorLinkState,
  type MonitorFact,
} from "./marketMonitorFacts";

const ALL: MonitorLinkState[] = [
  "OBSERVED",
  "TRANSPORT_DOWN",
  "PROVIDER_DISOWNED",
  "PRICE_NOT_NUMERIC",
  "AWAITING_FIRST_PRINT",
];

describe("classifyMonitorLink", () => {
  it("names a healthy link", () => {
    expect(classifyMonitorLink({ transportConnected: true, price: 431.2, source: "finnhub" }))
      .toBe("OBSERVED");
  });

  it("× THE DEFECT: three refusals must not share one `false`", () => {
    const down = classifyMonitorLink({ transportConnected: false, price: 431.2, source: "finnhub" });
    const disowned = classifyMonitorLink({ transportConnected: true, price: 431.2, source: "unavailable" });
    const waiting = classifyMonitorLink({ transportConnected: true, price: 0, source: "finnhub" });
    expect(new Set([down, disowned, waiting]).size).toBe(3);
    expect(down).toBe("TRANSPORT_DOWN");
    expect(disowned).toBe("PROVIDER_DISOWNED");
    expect(waiting).toBe("AWAITING_FIRST_PRINT");
  });

  it("× THE DEFECT: `price > 0` is not isFinite — a feed fault is its own state", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, "431.2", {}]) {
      expect(classifyMonitorLink({ transportConnected: true, price: bad, source: "finnhub" }))
        .toBe("PRICE_NOT_NUMERIC");
    }
  });

  it("a missing source is the provider disowning, not a feed fault", () => {
    for (const s of [null, undefined, ""]) {
      expect(classifyMonitorLink({ transportConnected: true, price: 431.2, source: s }))
        .toBe("PROVIDER_DISOWNED");
    }
  });

  it("× THE WORSE LIE: a dead socket must never be reported as patience", () => {
    // Transport down wins over every downstream condition.
    expect(classifyMonitorLink({ transportConnected: false, price: Number.NaN, source: "unavailable" }))
      .toBe("TRANSPORT_DOWN");
    expect(classifyMonitorLink({ transportConnected: false, price: 0, source: "finnhub" }))
      .toBe("TRANSPORT_DOWN");
  });

  it("a negative or absent price with a live provider is awaiting a print", () => {
    expect(classifyMonitorLink({ transportConnected: true, price: null, source: "finnhub" }))
      .toBe("AWAITING_FIRST_PRINT");
    expect(classifyMonitorLink({ transportConnected: true, price: -3, source: "finnhub" }))
      .toBe("AWAITING_FIRST_PRINT");
  });
});

describe("monitorLinkReason", () => {
  it("gives five DIFFERENT sentences — no two states may collapse", () => {
    expect(new Set(ALL.map(s => monitorLinkReason(s, "NVDA"))).size).toBe(5);
  });

  it("every sentence names the symbol and says more than a dash could", () => {
    for (const s of ALL) {
      const r = monitorLinkReason(s, "NVDA");
      expect(r).toContain("NVDA");
      expect(r.length).toBeGreaterThan(60);
    }
  });

  it("only the awaiting case promises the next tick resolves it", () => {
    const resolves = ALL.filter(s => /resolves itself/i.test(monitorLinkReason(s, "NVDA")));
    expect(resolves).toEqual(["AWAITING_FIRST_PRINT"]);
  });

  it("× THE FABRICATED HALT: no refusal may claim the symbol is not trading", () => {
    for (const s of ALL) {
      const said = monitorLinkReason(s, "NVDA")
        // The disclaimers say what WM is NOT claiming; strip them before the
        // claim check, or this Sentinel fires on the right sentence. Same
        // failure mode as the /profile outcome check firing on its own
        // disclaimer — pinned to a spelling it forbids the fix.
        .replace(/not a statement about[^.]*\./gi, "")
        .replace(/not evidence that[^.]*\./gi, "");
      expect(said).not.toMatch(/\bis not trading\b|\bhalted\b|\bis flat\b/i);
    }
    // ...and the disclaimers must actually be there, so this cannot be passed
    // by deleting them.
    expect(monitorLinkReason("TRANSPORT_DOWN", "NVDA")).toMatch(/not a statement about/i);
  });
});

describe("monitorPriceFact", () => {
  it("states an observed price and picks decimals from the finite value", () => {
    expect(monitorPriceFact("OBSERVED", 431.2, "NVDA").text).toBe("431.20");
    expect(monitorPriceFact("OBSERVED", 4.5, "DOGE").text).toBe("4.5000");
    expect(monitorPriceFact("OBSERVED", 0.5, "DOGE").text).toBe("0.500000");
  });

  it("× THE DEFECT: the page's headline number must not be a glyph", () => {
    for (const s of ALL.filter(x => x !== "OBSERVED")) {
      const f = monitorPriceFact(s, null, "NVDA");
      expect(f.text).not.toBe("—");
      expect(f.measured).toBe(false);
      expect(f.reason).toBe(monitorLinkReason(s, "NVDA"));
    }
  });

  it("× THE STALE FIGURE: a broken link must not report a last-known price", () => {
    const f = monitorPriceFact("TRANSPORT_DOWN", 431.2, "NVDA");
    expect(f.text).not.toContain("431");
    expect(f.measured).toBe(false);
  });

  it("× THE DEFECT: NaN must never be formatted", () => {
    const f = monitorPriceFact("OBSERVED", Number.NaN, "NVDA");
    expect(f.text).not.toMatch(/NaN|Infinity/);
    expect(f.measured).toBe(false);
  });
});

describe("monitorLatencyFact", () => {
  it("states a measured latency and scopes what it describes", () => {
    const f = monitorLatencyFact("OBSERVED", 42.4, "NVDA");
    expect(f.text).toBe("42 ms");
    expect(f.measured).toBe(true);
    expect(f.reason).toMatch(/floor on delay/i);
  });

  it("× THE FABRICATED ZERO: an unmeasured latency must not print 0 ms", () => {
    for (const bad of [Number.NaN, null, -5, "42"]) {
      const f = monitorLatencyFact("OBSERVED", bad, "NVDA");
      expect(f.text).not.toMatch(/^0 ms$/);
      expect(f.measured).toBe(false);
    }
  });

  it("a live socket with no latency reading differs from having no socket", () => {
    const noReading = monitorLatencyFact("OBSERVED", Number.NaN, "NVDA");
    const noSocket = monitorLatencyFact("TRANSPORT_DOWN", 42, "NVDA");
    expect(noReading.text).not.toBe(noSocket.text);
    expect(noReading.reason).not.toBe(noSocket.reason);
  });
});

describe("monitorConnectionFact", () => {
  it("names the provider when observing", () => {
    expect(monitorConnectionFact("OBSERVED", "finnhub", "NVDA").text).toBe("Observed · finnhub");
  });

  it("× THE COLLAPSE: each refusal gets its own label, not one word", () => {
    const labels = ALL.filter(s => s !== "OBSERVED")
      .map(s => monitorConnectionFact(s, null, "NVDA").text);
    expect(new Set(labels).size).toBe(4);
    for (const l of labels) expect(l).not.toBe("Unavailable");
  });
});

describe("monitorSourceFact", () => {
  it("names the provider rather than claiming the exchange", () => {
    const f = monitorSourceFact("OBSERVED", "finnhub", "NVDA");
    expect(f.text).toBe("FINNHUB");
    expect(f.reason).toMatch(/rather than presenting the price as its own observation/i);
  });

  it("× THE SECOND SOURCE OF TRUTH: it is its own owner, not a reshaped copy", () => {
    // If this tile were `{...connectionFact, text: …}` the two would share a
    // sentence and drift apart the day either one changes.
    const src = monitorSourceFact("TRANSPORT_DOWN", "finnhub", "NVDA");
    const conn = monitorConnectionFact("TRANSPORT_DOWN", "finnhub", "NVDA");
    expect(src.text).not.toBe(conn.text);
    expect(src.reason).not.toBe(conn.reason);
    // ...but they must still agree about the link itself.
    expect(src.state).toBe(conn.state);
    expect(src.reason).toContain(monitorLinkReason("TRANSPORT_DOWN", "NVDA"));
  });

  it("a disowned provider is not reported as a price feed", () => {
    expect(monitorSourceFact("PROVIDER_DISOWNED", "unavailable", "NVDA").measured).toBe(false);
    expect(monitorSourceFact("OBSERVED", "", "NVDA").measured).toBe(false);
  });
});

describe("monitorTapeFact", () => {
  it("× THE BORROWED SILENCE: a missing tape must not read as a dead price feed", () => {
    const f = monitorTapeFact(null, "NVDA");
    expect(f.measured).toBe(false);
    expect(f.reason).toMatch(/separate feed/i);
    expect(f.reason).toMatch(/says nothing about whether the price above is live/i);
    expect(f.text).not.toBe("Unavailable");
  });

  it("names the tape source when there is one", () => {
    const f = monitorTapeFact("alpaca", "NVDA");
    expect(f.text).toBe("ALPACA");
    expect(f.measured).toBe(true);
  });

  it("whitespace is not a tape source", () => {
    expect(monitorTapeFact("   ", "NVDA").measured).toBe(false);
  });
});

describe("no cell is a bare glyph", () => {
  const all: MonitorFact[] = [
    ...ALL.map(s => monitorPriceFact(s, 431.2, "NVDA")),
    ...ALL.map(s => monitorLatencyFact(s, 42, "NVDA")),
    ...ALL.map(s => monitorConnectionFact(s, "finnhub", "NVDA")),
    ...ALL.map(s => monitorSourceFact(s, "finnhub", "NVDA")),
    monitorTapeFact("alpaca", "NVDA"),
    monitorTapeFact(null, "NVDA"),
  ];

  it("every fact carries words and a reason", () => {
    for (const f of all) {
      expect(f.text.trim()).not.toBe("—");
      expect(f.text.trim()).not.toBe("-");
      expect(f.text.trim().length).toBeGreaterThan(0);
      expect(f.reason.length).toBeGreaterThan(60);
    }
  });

  it("× COLOUR IS A CLAIM: `measured` is true only when the link is OBSERVED", () => {
    for (const f of all) {
      if (f.measured) expect(f.state).toBe("OBSERVED");
    }
  });
});

describe("monitorChangeFact — the survivor found by USE, not by reading", () => {
  const LIVE = { displayable: true, changePct: 1.234, direction: "up" as const };
  const NO_REF = { displayable: false, changePct: 0, direction: "flat" as const };

  it("× THE SURVIVOR: a dead link and a missing reference close are not one word", () => {
    const dead = monitorChangeFact("TRANSPORT_DOWN", NO_REF, "TSLA");
    const noRef = monitorChangeFact("OBSERVED", NO_REF, "TSLA");
    expect(dead.text).not.toBe(noRef.text);
    expect(dead.reason).not.toBe(noRef.reason);
    expect(dead.measured).toBe(false);
    expect(noRef.measured).toBe(false);
  });

  it("× THE WORD ITSELF: no arm of this cell may say \"Unavailable\"", () => {
    for (const s of ALL) {
      for (const c of [LIVE, NO_REF]) {
        expect(monitorChangeFact(s, c, "TSLA").text).not.toMatch(/unavailable/i);
      }
    }
  });

  it("× THE SEPARATE GAP: a missing reference close says the price above is live", () => {
    const noRef = monitorChangeFact("OBSERVED", NO_REF, "TSLA");
    expect(noRef.reason).toMatch(/SEPARATE gap/);
    expect(noRef.reason).toMatch(/which is live/);
  });

  it("× THE QUIET ZERO: WM must never print 0.00% for an absent reference", () => {
    expect(monitorChangeFact("OBSERVED", NO_REF, "TSLA").text).not.toMatch(/0\.00/);
    expect(monitorChangeFact("OBSERVED", { displayable: true, changePct: Number.NaN, direction: "flat" }, "TSLA").measured)
      .toBe(false);
  });

  it("a link that is down speaks in the link's own vocabulary", () => {
    for (const s of ALL.filter(x => x !== "OBSERVED")) {
      expect(monitorChangeFact(s, LIVE, "TSLA").reason).toContain(monitorLinkReason(s, "TSLA"));
    }
  });

  it("a real reading is formatted with its sign and marked measured", () => {
    const f = monitorChangeFact("OBSERVED", LIVE, "TSLA");
    expect(f.text).toBe("+1.23%");
    expect(f.measured).toBe(true);
  });
});

describe("/ai-bot page", () => {
  const src = readFileSync(join(process.cwd(), "src/app/ai-bot/page.tsx"), "utf8");
  /* Comments are prose ABOUT the code and are never rendered, so they are
     stripped before the phrase checks — a Sentinel that fires on the file's own
     documentation of the defect is pinned to a spelling, not to a meaning.
     Inline trailing `//` is deliberately NOT stripped: that would truncate any
     string containing `://`. */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter(line => !/^\s*\/\//.test(line))
    .join("\n");

  it("× THE DEFECT: the monitor must not render a bare glyph", () => {
    expect(code).not.toMatch(/connected \? price\.toFixed\(dp\) : "—"/);
    expect(code).not.toMatch(/\["Latency",[^\]]*"—"\]/);
  });

  it("× THE DEFECT: the three refusals must not be re-collapsed into one `&&`", () => {
    expect(code).not.toMatch(/market\.connected\s*&&\s*price\s*>\s*0\s*&&/);
  });

  it("the monitor routes its cells through the owner", () => {
    expect(code).toContain("classifyMonitorLink");
    expect(code).toContain("monitorPriceFact");
    expect(code).toContain("monitorLatencyFact");
    expect(code).toContain("monitorConnectionFact");
    expect(code).toContain("monitorSourceFact");
    expect(code).toContain("monitorTapeFact");
  });

  it("× THE SILENT CELL: the headline price must carry its reason", () => {
    expect(code).toMatch(/priceFact\.reason/);
  });

  /* THE TWO SURVIVORS. Both of these sat INSIDE the forty lines the first fix
     rewrote, and neither was visible from the source — they were caught by a
     DOM read of the deployed page, where "none" and "Unavailable" were still
     on screen beside the four repaired cells. */

  it("× SURVIVOR ONE: the Source line must not be a second source of truth", () => {
    expect(code).not.toMatch(/Source: \{connected \? market\.source : "none"\}/);
    expect(code).toMatch(/Source: \{sourceFact\.text\}/);
    expect(code).toMatch(/title=\{sourceFact\.reason\}/);
  });

  it("× SURVIVOR TWO: the session-change cell must not say \"Unavailable\"", () => {
    expect(code).not.toContain('"Unavailable"');
    expect(code).not.toMatch(/connected && tickerChange\.displayable/);
    expect(code).toContain("monitorChangeFact");
    expect(code).toMatch(/changeFact\.reason/);
  });

  it("× THE RESIDUE: no cell in the monitor renders a bare em dash", () => {
    expect(code).not.toMatch(/[:?]\s*"—"/);
  });
});
