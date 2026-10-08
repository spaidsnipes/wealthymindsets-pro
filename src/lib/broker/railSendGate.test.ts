/** Sheriff P0 (2026-10-08): no enabled send on a rail that is not connected; the reason at the control, in member words. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { alpacaRailState, RAIL_STATES, railSendGate } from "./railSendGate";

const PANEL = readFileSync(path.resolve(__dirname, "../../components/broker/AlpacaTradingPanel.tsx"), "utf8");
const OPERATOR = /\.env|env\.local|ALPACA_|_KEY|_SECRET|api key/i;

describe("rail send gate", () => {
  it("every non-connected state disables the send control and says why; connected and unverified fall through to §14.6", () => {
    for (const s of RAIL_STATES) {
      const g = railSendGate(s, "Paper");
      if (s === "CONNECTED" || s === "UNVERIFIED") expect(g, s).toEqual({ canSend: true, reason: null });
      else { expect(g.canSend, s).toBe(false); expect(g.reason!.length, s).toBeGreaterThan(20); expect(g.reason!, s).not.toMatch(OPERATOR); }
    }
    expect(railSendGate("NOT_CONNECTED", "Paper").reason).toBe("Paper account not connected — nothing can be sent or closed here.");
  });
  it("the Alpaca drawer's reads → state: refused / no account → NOT_CONNECTED; loading → CHECKING; a failed read on a connected rail → UNVERIFIED", () => {
    const base = { loading: false, disconnected: false, refused: false, error: false, accountObserved: false };
    expect(alpacaRailState({ ...base, refused: true, error: true })).toBe("NOT_CONNECTED");      // the glass case
    expect(alpacaRailState(base)).toBe("NOT_CONNECTED");
    expect(alpacaRailState({ ...base, loading: true })).toBe("CHECKING");
    expect(alpacaRailState({ ...base, disconnected: true, accountObserved: true })).toBe("DISCONNECTED_BY_YOU");
    expect(alpacaRailState({ ...base, error: true })).toBe("UNVERIFIED");
    expect(alpacaRailState({ ...base, accountObserved: true })).toBe("CONNECTED");
  });
  it("the drawer wires it: disabled by the gate AND §14.6; reason at the control; no operator text left for members", () => {
    expect(PANEL.length).toBeGreaterThan(20_000);
    expect(PANEL).toContain("disabled={!railGate.canSend || !exitPermission.allowed}");
    expect(PANEL).toContain('aria-describedby={!railGate.canSend ? "wm-alpaca-send-refusal" : undefined}');
    expect(PANEL).toContain('data-testid="alpaca-send-refusal"');
    expect(PANEL).toContain("onClick={() => { if (railGate.canSend) void placeOrder(); }}");
    const code = PANEL.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    expect(code).not.toMatch(/env\.local|ALPACA_PAPER_KEY|ALPACA_PAPER_SECRET/);
  });
});
