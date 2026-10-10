/**
 * NO MOTION ON NOTHING (Founder "no blinking/spazzing", 2026-10-10). A spinning
 * disc or a dancing equalizer says something is playing; where nothing is,
 * the element is still.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => { const s = readFileSync(p, "utf8"); expect(s.length).toBeGreaterThan(1000); return s; };

describe("no motion on nothing", () => {
  it("lounge: the 'No track selected' disc does not spin", () => {
    const s = read("src/app/lounge/page.tsx");
    const at = s.indexOf("now playing — spinning vinyl");
    expect(at).toBeGreaterThan(-1);
    expect(s.slice(at, s.indexOf("No track selected", at))).not.toContain("animate-[spin");
  });
  it("radio: discs spin only while tuned in / playing (hover is the trader's own motion)", () => {
    const s = read("src/app/radio/page.tsx");
    expect(s).not.toContain("animate-[spin_22s_linear_infinite]");
    expect(s).not.toContain("animate-[spin_18s_linear_infinite]");
    expect(s).not.toContain("animate-[spin_5s_linear_infinite]");
  });
  it("tv: the hero equalizer is still while no verified room is live", () => {
    const s = read("src/app/tv/page.tsx");
    expect(s).not.toMatch(/animation: `wmtv-eq/);
  });
  it("radio: the wave beside 'Stream not connected' is still", () => {
    const s = read("src/app/radio/page.tsx");
    const at = s.indexOf("Stream not connected");
    expect(at).toBeGreaterThan(-1);
    expect(s.slice(at, at + 400)).toContain("<LiveWave color={c} still />");
  });
  it("Alpaca panel: the environment dot does not pulse", () => {
    const s = read("src/components/broker/AlpacaTradingPanel.tsx");
    expect(s).not.toContain('rounded-full animate-pulse" style={{ background: isLive ? "#ef4444" : "#00C076" }}');
  });
});
