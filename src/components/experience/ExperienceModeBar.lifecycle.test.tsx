/**
 * THE MODE ROW ON /charts IS A LIFECYCLE CONTROL, NOT A LAMP — Garden 16
 * §15/§32/§40, 2026-09-27.
 *
 * Found on the glass (control walk, local /charts at 1440): pressing any of
 * PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN in the Workspace
 * changed ONLY its own aria-current. The row now writes the ONE lifecycle stage
 * the Command Deck's phase writes; the read-back under it says which deck phase
 * and chain phase that stage compiles, and LEARN is a door to the Academy.
 *
 * No DOM here (no jsdom), so a "press" is the bus write the button's onClick
 * makes (`setMode`), and the render is read before and after it.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ExperienceModeBar, EXPERIENCE_MODE_LIFECYCLE_TESTID } from "./ExperienceModeBar";
import { DecisionContextBus } from "@/lib/experience/decisionContextBus";

const readback = (html: string) => {
  const m = html.match(new RegExp(`data-testid="${EXPERIENCE_MODE_LIFECYCLE_TESTID}"[^>]*>([^<]*)<`));
  return m ? m[1] : null;
};
const current = (html: string) => html.match(/aria-current="true"[^>]*>([A-Z]+)</)?.[1] ?? null;

describe("pressing a mode visibly moves the ONE lifecycle the deck shows", () => {
  it("each lifecycle press changes the read-back to the deck phase it compiles", () => {
    const bus = new DecisionContextBus();
    const at = () => renderToStaticMarkup(<ExperienceModeBar bus={bus} lifecycle />);
    expect(readback(at())).toContain("Command Deck phase · Prep");
    for (const [mode, deck] of [
      ["WAIT", "Approach"],
      ["EXECUTE", "Decide"],
      ["MANAGE", "In Trade"],
      ["REVIEW", "Review"],
      ["PREP", "Prep"],
    ] as const) {
      bus.setMode(mode);
      const html = at();
      expect(current(html), mode).toBe(mode);
      expect(readback(html), mode).toContain(`Command Deck phase · ${deck}`);
    }
  });

  it("the deck's press moves the row: Post-Exit shows REVIEW current and says Post-Exit", () => {
    const bus = new DecisionContextBus();
    bus.setStage("POST_EXIT", "TSLA");
    const html = renderToStaticMarkup(<ExperienceModeBar bus={bus} lifecycle />);
    expect(current(html)).toBe("REVIEW");
    expect(readback(html)).toContain("Command Deck phase · Post-Exit");
    expect(html).toContain('data-stage="POST_EXIT"');
  });

  it("LEARN is a door to the Academy on the lifecycle face — never a silent phase", () => {
    const html = renderToStaticMarkup(<ExperienceModeBar bus={new DecisionContextBus()} lifecycle />);
    const learn = html.match(/<a[^>]*>LEARN<\/a>/)?.[0] ?? "";
    expect(learn).toContain('href="/education"');
    expect(learn).toContain('data-mode-route="ROOM"');
    expect(html).toMatch(/title="[^"]*opens the Academy/);
  });

  it("LEARN set elsewhere is said, not mapped", () => {
    const bus = new DecisionContextBus();
    bus.setMode("LEARN");
    expect(readback(renderToStaticMarkup(<ExperienceModeBar bus={bus} lifecycle />))).toContain("Not in a trade lifecycle");
  });

  it("every other room keeps the bar it had: no read-back, LEARN still a button", () => {
    const html = renderToStaticMarkup(<ExperienceModeBar bus={new DecisionContextBus()} />);
    expect(readback(html)).toBeNull();
    expect(html).not.toContain('href="/education"');
    expect(html).toMatch(/<button[^>]*>LEARN<\/button>/);
  });

  it("the market room's Workspace mounts the lifecycle face", () => {
    const shell = readFileSync(path.join(process.cwd(), "src/components/experience/WMExperienceShell.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\s*\}/g, "");
    const lead = shell.slice(shell.indexOf("const modeEquipment = ("), shell.indexOf("const railToggle"));
    expect(lead.length).toBeGreaterThan(100);
    expect(lead).toMatch(/<ExperienceModeBar bus=\{bus\} lifecycle \/>/);
  });
});
