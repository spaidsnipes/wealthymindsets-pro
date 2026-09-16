/**
 * MainLayout · residency retirement — the Ticket T G12 gate.
 *
 * The parent-cut sentinel (MainLayout.founderRoute.sentinel.test.tsx) gates
 * G2: "did the actual parent change?". This file gates G12: "did the old
 * shell lose residency?". Two different questions.
 *
 * The audit's F9 evidence table names the exact things that must NOT be
 * available as accidental parents of the Founder route:
 *
 *   TickerTape          — the July multi-symbol tape
 *   MusicPlayer         — the shell's music bar
 *   MobileSessionPill   — the mobile shell fixture
 *   SpaidbotButton      — the shell chrome floating action
 *   lucide iconography  — the July nav's icon-per-route language
 *
 * On the Founder route the escape-hatch returns `<WMExperienceShell>` and
 * NONE of the above should be reachable from the shell that wraps it. This
 * sentinel proves it by reading source, not markup — MainLayout is a
 * 1400-line client component and its imports/JSX are the honest gate.
 *
 * The July shell still holds the address for /charts, /nectar, /journal and
 * every other route (Ticket T is about the FOUNDER route, not every route),
 * so this file must NOT assert those imports are absent from MainLayout
 * overall. It asserts the FOUNDER BRANCH does not reference them.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const SOURCE = readFileSync(
  path.resolve(__dirname, "MainLayout.tsx"),
  "utf-8",
);

/**
 * The isFounderOperatingRoom branch — from `if (isFounderOperatingRoom) {`
 * to the closing `}` and one more line. Read the source once, slice it,
 * and every test asserts against the slice rather than the whole file. That
 * lets the same file keep TickerTape / MobileSessionPill / etc for OTHER
 * routes — the audit only retires them from the Founder route.
 */
function founderBranch(): string {
  const startTag = "if (isFounderOperatingRoom)";
  const start = SOURCE.indexOf(startTag);
  if (start < 0) {
    throw new Error(
      "no `if (isFounderOperatingRoom)` branch found — Ticket T parent cut is missing",
    );
  }
  // Walk forward until the matching brace closes. Naive but honest — the
  // branch body is a single return expression with a controlled shape and
  // no inner braces beyond the JSX itself.
  let depth = 0;
  let i = SOURCE.indexOf("{", start);
  const bodyStart = i;
  for (; i < SOURCE.length; i++) {
    const ch = SOURCE[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return SOURCE.slice(bodyStart, i + 1);
    }
  }
  throw new Error("could not find the closing brace of the Founder branch");
}

describe("MainLayout · Founder-route residency — Ticket T G12 gate", () => {
  it("the Founder branch exists (parent cut is still in place)", () => {
    // If G2 is red, G12 is undefined. This test guards the precondition
    // so the messages below stay meaningful in isolation.
    expect(() => founderBranch()).not.toThrow();
  });

  it("does not mount TickerTape on the Founder route", () => {
    // The audit's headline anti-pattern: a full multi-symbol tape above
    // the operating room that competes with MARKET and runs an unnecessary
    // quote round. The shell's own comment already called this out at
    // line 844-848; this test locks the correction into code.
    expect(founderBranch()).not.toMatch(/\bTickerTape\b/);
  });

  it("does not mount MusicPlayer on the Founder route", () => {
    expect(founderBranch()).not.toMatch(/\bMusicPlayer\b/);
  });

  it("does not mount MobileSessionPill on the Founder route", () => {
    expect(founderBranch()).not.toMatch(/\bMobileSessionPill\b/);
  });

  it("does not mount the Spaidbot chrome button on the Founder route", () => {
    // SpaidbotButton is the July shell's floating action. Spaidbot itself
    // remains an OS-level capability, so this must not forbid the string
    // "spaidbot" everywhere — only the shell chrome mount.
    expect(founderBranch()).not.toMatch(/\bSpaidBotButton\b|\bSpaidbotButton\b|\bSpaidbot Button\b/);
  });

  it("does not mount them under their new collective name either", () => {
    /**
     * THE NAMES ABOVE MOVED, AND THAT ALMOST UNGUARDED THIS FILE.
     *
     * MusicPlayer and SpaidBotButton were declared inline at the tail of the
     * July branch. They are now one component — `ShellCompanions` — because
     * two copies of "these are always on screen" is two places for that claim
     * to quietly stop being true.
     *
     * But the five assertions above scan for the OLD names. After the
     * extraction, mounting `<ShellCompanions />` on the Founder branch would
     * reinstate BOTH retired fixtures and every one of those tests would
     * still be green, because neither string appears. A Sentinel aimed at a
     * name that moved does not fail loudly — it passes, guarding nothing.
     *
     * So the retirement is restated against the name that owns the fact now.
     */
    expect(founderBranch()).not.toMatch(/\bShellCompanions\b/);
  });

  it("does not carry any lucide icon vocabulary on the Founder route", () => {
    // The July nav rail was built from a lucide icon pack (BarChart2,
    // ScanLine, Map, Newspaper, GraduationCap, Users, ShoppingBag, Globe,
    // User, ChevronLeft, ChevronRight, Bell, Settings, Search, Zap,
    // BookOpen, FlaskConical, TrendingUp, Tv, Handshake, Crosshair,
    // Trophy, Menu, Radio, Copy, Heart …). The Asset-10 shell speaks
    // typographically; any lucide invocation on the Founder route would
    // reinstate the "icon-per-tool" grammar.
    expect(founderBranch()).not.toMatch(/from\s*"lucide-react"|<\s*(BarChart2|ScanLine|Newspaper|Trophy|Menu)\b/);
  });

  it("returns WMExperienceShell — the only mount on the Founder branch", () => {
    // Restatement of the parent-cut law for locality: if a future edit
    // forgets to render WMExperienceShell inside this branch, MainLayout
    // will still compile (it can return null) but the Founder route will
    // vanish visually. Names the failure mode explicitly.
    expect(founderBranch()).toMatch(/<WMExperienceShell\b/);
  });
});
