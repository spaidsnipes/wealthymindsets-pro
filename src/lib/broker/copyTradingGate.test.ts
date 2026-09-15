import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectCopyTradingGate,
  type CopyTradingProviderInput,
} from "./copyTradingGate";

const gemini: CopyTradingProviderInput = { provider: "gemini", kind: "ai" };

function broker(provider: string, certLevel?: CopyTradingProviderInput["certLevel"]): CopyTradingProviderInput {
  return { provider, kind: "broker", certLevel };
}

describe("× AN UNMEASURED NO IS STILL AN UNMEASURED CLAIM", () => {
  it("× THE STOPPED CLOCK: the verdict moves when the evidence moves", () => {
    const none = selectCopyTradingGate([broker("alpaca", "NONE")]);
    const read = selectCopyTradingGate([broker("alpaca", "READ_ONLY")]);
    const paper = selectCopyTradingGate([broker("alpaca", "WRITE_PAPER")]);

    // The old page rendered identical pixels for all three. A gate that
    // cannot distinguish these is a sign.
    expect(none.metCount).toBe(0);
    expect(read.metCount).toBe(1);
    expect(paper.metCount).toBe(2);
  });

  it("× THE ROUNDED-UP UNKNOWN: UNMEASURED never counts as MET", () => {
    const g = selectCopyTradingGate([broker("alpaca", "WRITE_LIVE")]);
    const auth = g.requirements.find(r => r.id === "authorization");
    expect(auth?.state).toBe("UNMEASURED");
    // Three requirements measured MET, the fourth unknown — and the gate
    // stays SHUT. An unknown may not be spent as a pass.
    expect(g.metCount).toBe(3);
    expect(g.available).toBe(false);
  });

  it("× THE ABSENT VS FAILED CONFLATION: no registered broker is UNMEASURED, not UNMET", () => {
    const g = selectCopyTradingGate([gemini]);
    expect(g.bestBroker).toBeNull();
    expect(g.bestLevel).toBe("NONE");
    for (const r of g.requirements) {
      expect(r.state).toBe("UNMEASURED");
    }
    expect(g.metCount).toBe(0);
    expect(g.available).toBe(false);
  });

  it("× THE AI VOTER: a non-broker row may never contribute to a trading verdict", () => {
    // gemini has no certLevel and is kind:"ai" — if it were counted as a
    // broker it would pin bestBroker to "gemini" and mislabel the evidence.
    const g = selectCopyTradingGate([gemini, broker("alpaca", "READ_ONLY")]);
    expect(g.bestBroker).toBe("alpaca");
    expect(g.bestLevel).toBe("READ_ONLY");
  });

  it("× THE WEAKEST LINK PROMOTED: the furthest-certified broker sets the level", () => {
    const g = selectCopyTradingGate([
      broker("webull", "NONE"),
      broker("alpaca", "WRITE_PAPER"),
      broker("tastytrade", "READ_ONLY"),
    ]);
    expect(g.bestBroker).toBe("alpaca");
    expect(g.bestLevel).toBe("WRITE_PAPER");
  });

  it("× THE SILENT VERDICT: every requirement carries its own evidence", () => {
    const g = selectCopyTradingGate([broker("alpaca", "READ_ONLY")]);
    for (const r of g.requirements) {
      expect(r.evidence.length).toBeGreaterThan(20);
      expect(r.label.length).toBeGreaterThan(0);
    }
    // The MET one names the broker and its level, so the claim is traceable.
    const hist = g.requirements.find(r => r.id === "brokerHistory");
    expect(hist?.state).toBe("MET");
    expect(hist?.evidence).toContain("alpaca");
    expect(hist?.evidence).toContain("READ_ONLY");
  });

  it("× THE ASSUMED HEADLINE: the headline reports the count it measured", () => {
    const g = selectCopyTradingGate([broker("alpaca", "READ_ONLY")]);
    expect(g.headline).toContain("1 of 4");
    expect(g.headline).toContain("measured, not assumed");
  });

  it("× THE MISSING CERT: an adapter with no certLevel is treated as NONE, not as absent", () => {
    const g = selectCopyTradingGate([broker("moomoo")]);
    // It IS a registered broker, so requirements are measured (UNMET),
    // not UNMEASURED — the distinction the whole selector exists to keep.
    expect(g.bestBroker).toBe("moomoo");
    expect(g.bestLevel).toBe("NONE");
    expect(g.requirements.find(r => r.id === "brokerHistory")?.state).toBe("UNMET");
  });
});

describe("× THE HARD-CODED VERDICT RETURNS", () => {
  const pagePath = resolve(__dirname, "../../app/copy-trading/page.tsx");
  const page = readFileSync(pagePath, "utf8");

  it("× THE DEAD IMPORT: /copy-trading actually composes the gate selector", () => {
    expect(page).toContain("selectCopyTradingGate");
    // A single occurrence would be satisfied by an unused import.
    const hits = page.split("selectCopyTradingGate").length - 1;
    expect(hits).toBeGreaterThan(1);
  });

  it("× THE RESURRECTED PLACARD: the verdict chip is not a literal string", () => {
    // The old page rendered the words as JSX text with no state behind
    // them. Reviving that exact form must fail here.
    expect(page).not.toMatch(/>\s*Not available\s*</);
  });

  it("× THE UNREAD REPORT: the page reads the honest aggregate endpoint", () => {
    expect(page).toContain("/api/broker/status");
  });
});

const TONE_SOURCE = readFileSync(
  resolve(__dirname, "../../app/copy-trading/page.tsx"),
  "utf8",
);

describe("× COLOUR IS A CLAIM", () => {
  it("× THE DEFAULTED TONE: requirement tone comes from a TOTAL record", () => {
    // A fourth requirement state must fail the BUILD, not inherit a colour.
    expect(TONE_SOURCE).toMatch(
      /Record<\s*CopyTradingRequirementState\s*,/,
    );
  });
});
