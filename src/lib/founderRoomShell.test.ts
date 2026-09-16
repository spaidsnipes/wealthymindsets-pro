import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (): string =>
  readFileSync(resolve(__dirname, "../components/layout/MainLayout.tsx"), "utf8");

describe("Founder operating-room shell", () => {
  /**
   * ── WHAT THIS GATE USED TO ASSERT, AND WHY THAT WAS WORSE THAN NOTHING ─────
   *
   * Two tests here read MainLayout.tsx as text and required the string
   * `{isFounderOperatingRoom ? (` plus a `data-testid="founder-room-header-space"`
   * inside its true-arm. Both strings were present. Both were DEAD.
   *
   * The Ticket T cutover returns `WMExperienceShell` from MainLayout before
   * that markup is reached, so control only ever arrives at the July header
   * when `isFounderOperatingRoom` is false. The true-arm was unreachable JSX,
   * and the testid it carried could not appear in any rendered tree.
   *
   * A source scan cannot distinguish a live branch from a dead one; it sees
   * characters. So this gate went on reporting "the tape is suppressed in a
   * Founder room" on the strength of a branch that had stopped executing at
   * the cutover. A green light wired to nothing still turns green, and this
   * one had been green through every run since.
   *
   * ── WHAT IT ASSERTS NOW ────────────────────────────────────────────────────
   *
   * The claim worth guarding is not "there is a conditional". It is: THE JULY
   * HEADER IS UNREACHABLE FROM AN OS ROOM. That is a fact about ORDER — the
   * early return has to come before the tape — and order is something a text
   * read can actually measure honestly, by index rather than by presence.
   *
   * The complementary half, "and the OS masthead has no tape in it", is owned
   * by MainLayout.residency.sentinel.test.tsx, which retires TickerTape from
   * the Founder branch by name. It is not restated here. Two gates asserting
   * one fact is the defect this repo is named after.
   */
  it("makes the July tape unreachable from an OS room by structure, not by a flag", () => {
    const layout = source();

    const cutover = layout.indexOf("if (isFounderOperatingRoom) {");
    const julyShell = layout.indexOf('className="bg-wm-black wm-universe"');
    const tape = layout.indexOf("<TickerTape />");

    expect(cutover, "the Ticket T cutover branch is gone").toBeGreaterThan(-1);
    expect(julyShell, "the July shell markup is gone").toBeGreaterThan(-1);
    expect(tape, "the July header no longer draws the tape").toBeGreaterThan(-1);

    // ORDER IS THE INVARIANT. If the tape ever moves above the cutover it
    // starts drawing in OS rooms again, and this goes red on the index.
    expect(cutover, "the cutover must precede the July shell it replaces")
      .toBeLessThan(julyShell);
    expect(julyShell, "the tape must live inside the July shell, after the cutover")
      .toBeLessThan(tape);

    // And the dead branch must not come back. This is absence-shaped, which is
    // the weak direction — but here the fact's own existence is the defect, so
    // absence is the only shape available.
    expect(layout, "the unreachable founder-room header arm is back")
      .not.toContain('data-testid="founder-room-header-space"');
    expect(layout, "a conditional here is dead code: the cutover already returned")
      .not.toContain("{isFounderOperatingRoom ? (");
  });

  /**
   * §30 STEP 2: "Make MARKET the dominant continuous spatial field."
   *
   * The deck's <main> carried `maxWidth: 1280` — a READING measure. Measured
   * live at 1920x847, that capped the room at 1248px and left 672px (35% of
   * the screen) as dead field on the edges while the candle canvas owned 29%
   * of viewport area. Price geometry has no comfortable line length; every
   * pixel the cap refused was structure the trader could not see.
   *
   * Two facts have to hold TOGETHER or the repair silently undoes itself, so
   * they are asserted in one test rather than two. Widening the room while the
   * rail stays proportional (`0.62fr`) just hands ~35% of the new width to a
   * chip, a closed summary line, and a shortlist — none of which read better
   * wide. A bounded rail without the wider room is inert. The pairing IS the
   * invariant.
   */
  it("the deck room is measured for MARKET, and the width it gains is not spent on the rail", () => {
    const raw = readFileSync(
      resolve(__dirname, "../app/command-deck/page.tsx"),
      "utf8",
    );
    // The repair's own comment quotes the value it replaced, so the negative
    // assertion has to read CODE, not prose. A test that a comment can turn
    // red is a test that teaches the next author to stop explaining.
    const deck = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(deck, "the deck <main> is back on a fixed reading-column cap")
      .toContain('maxWidth: "min(1720px, 100%)"');
    expect(deck, "1280 is a prose measure — it caps the market room, not a paragraph")
      .not.toContain("maxWidth: 1280");

    const workspace = deck.slice(deck.indexOf(".wm-cd-market-workspace {"));
    const columns = workspace.match(/grid-template-columns:\s*([^;]+);/)?.[1];
    expect(columns, "the market workspace lost its column rule").toBeTruthy();
    expect(columns, "MARKET must take the free space")
      .toContain("minmax(0, 1fr)");
    expect(columns, "a fr-sized rail shares every new pixel with MARKET")
      .not.toMatch(/0\.\d+fr/);
    expect(workspace, "an empty gutter disconnects the support edge from MARKET")
      .toContain("column-gap: 0");
    expect(workspace, "the fused support edge needs one structural seam")
      .toContain("border-left: 1px solid rgba(139,106,41,0.22)");
  });

  it("keeps the deck and its suspense plane transparent to the sanctuary atmosphere", () => {
    const raw = readFileSync(
      resolve(__dirname, "../app/command-deck/page.tsx"),
      "utf8",
    );
    const shell = readFileSync(
      resolve(__dirname, "../components/experience/WMExperienceShell.tsx"),
      "utf8",
    );

    expect(shell).toContain('className="wm-water-breath"');
    expect(shell).toContain(".wm-sanctuary::before");
    expect(shell).toContain(".wm-sanctuary::after");
    expect(raw).toContain('data-testid="deck-suspense-plane"');
    expect(raw).toContain('data-testid="deck-route-plane"');

    const suspense = raw.slice(
      raw.indexOf('data-testid="deck-suspense-plane"'),
      raw.indexOf("<CommandDeckInner />"),
    );
    const route = raw.slice(
      raw.indexOf('data-testid="deck-route-plane"'),
      raw.indexOf("TICKET T G12"),
    );
    expect(suspense).toContain('background: "transparent"');
    expect(route).toContain('background: "transparent"');
    expect(suspense).not.toContain("linear-gradient");
    expect(route).not.toContain("linear-gradient");
  });

  /**
   * T-SILHOUETTE guard (Founder audit 2026-09-13).
   *
   * The audit's central law: "IF THE NORMAL FOUNDER URL STILL
   * BLUR/SQUINTS INTO THE OLD CARD DASHBOARD, TICKET T FAILS." Every
   * founder-family route lives inside WMExperienceShell, and every
   * such route that paints its own opaque background CANCELS the
   * sanctuary's vignette + grain + WATER-BREATH — the room silently
   * turns back into an app pane.
   *
   * This test walks the full FOUNDER_ROOM_ROUTES registry and asserts
   * that the SHELL header + aside + each route's outer wrapper +
   * top-of-viewport header are visually room, not chrome. A future PR
   * that quietly reintroduces `bg-wm-black`, `bg-wm-dark`, an opaque
   * linear-gradient, or `WM.surface.deep` on any of these surfaces
   * will fail the silhouette test at CI time rather than after the
   * Founder video captures another July shell.
   */
  it("keeps every Asset-10 room transparent so the sanctuary reaches the trader", () => {
    const shell = readFileSync(
      resolve(__dirname, "../components/experience/WMExperienceShell.tsx"),
      "utf8",
    );
    // The shell's header and aside must not paint over the sanctuary.
    // We assert on the DISAPPEARANCE of the offender rather than the
    // presence of the fix, because "background: WM.surface.deep" is the
    // exact grammar that occluded the atmosphere before this cutover.
    // A future refactor is free to write the fix any way it likes, as
    // long as it does not resurrect the opaque plane.
    const shellHeaderStart = shell.indexOf("Quiet chrome:");
    const shellAsideStart = shell.indexOf("<aside");
    const shellHeaderBlock = shell.slice(shellHeaderStart, shellHeaderStart + 900);
    const shellAsideBlock = shell.slice(shellAsideStart, shellAsideStart + 700);
    expect(shellHeaderBlock, "sanctuary header must not paint WM.surface.deep")
      .not.toMatch(/background:\s*WM\.surface\.deep/);
    expect(shellAsideBlock, "sanctuary aside must not paint WM.surface.deep")
      .not.toMatch(/background:\s*WM\.surface\.deep/);

    // Founder rooms whose outer wrappers used to paint over the shell.
    const morning = readFileSync(resolve(__dirname, "../app/morning-prep/page.tsx"), "utf8");
    expect(morning, "/morning-prep painted #050506 over the sanctuary")
      .not.toMatch(/background:\s*"radial-gradient[^"]*#050506"/);
    expect(morning, "/morning-prep header painted a #0b0b0d band")
      .not.toMatch(/background:\s*"linear-gradient\(180deg,\s*#0b0b0d/);

    const nectar = readFileSync(resolve(__dirname, "../app/nectar/page.tsx"), "utf8");
    expect(nectar, "/nectar VaultHeader painted a WM.surface.deep band")
      .not.toMatch(/background:\s*`linear-gradient\(180deg,\s*\$\{WM\.surface\.deep\}/);

    const journal = readFileSync(resolve(__dirname, "../app/journal/page.tsx"), "utf8");
    expect(journal, "/journal outer wrapper wore bg-wm-black over the sanctuary")
      .not.toMatch(/style=\{\{[^}]*overflow:"hidden"[^}]*\}\}\s*\n?\s*className="bg-wm-black"/);

    const paper = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
    expect(paper, "/paper outer wrapper wore bg-wm-black over the sanctuary")
      .not.toMatch(/clsx\(styles\.page,\s*"bg-wm-black"\)/);

    const charts = readFileSync(resolve(__dirname, "../components/chart/ChartsDashboard.tsx"), "utf8");
    // /charts default theme must be transparent; neon is preserved as an
    // alternate visual constitution.
    expect(charts, "/charts default painted #0D0E14 over the sanctuary")
      .toMatch(/theme === "neon" \? "#02060a" : "transparent"/);
    expect(charts, "chart orientation strip painted an opaque gradient band")
      .not.toMatch(/background:\s*"linear-gradient\(180deg,\s*rgba\(11,11,13,0\.9\),\s*#0D0E14\)"/);
    expect(charts, "a detached category strip still fragments MARKET")
      .not.toContain('className="wm-chart-category-strip"');
  });

  it("pins sticky bands with glass, never an opaque slab", () => {
    // T-SILHOUETTE, sticky-band case.
    //
    // A sticky header is the one honest reason to carry a fill: rows
    // scroll UNDER it, so with no fill the text collides with the data.
    // That reason justifies opacity, not an opaque slab — `bg-wm-dark`
    // is a solid plane, and inside a Founder room a solid plane occludes
    // the sanctuary and re-reads as "an app inside the room".
    //
    // The cure is `.wm-sticky-glass` (globals.css): translucent fill +
    // blur, with an @supports fallback so legibility never depends on a
    // progressive-enhancement feature. This test exists so the bands
    // cannot quietly revert to solid the next time someone answers a
    // contrast complaint with the nearest opaque token.
    const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
    expect(css, "the canonical sticky-glass owner must exist")
      .toMatch(/\.wm-sticky-glass\s*\{/);
    expect(css, "sticky glass must be translucent, not a solid fill")
      .toMatch(/\.wm-sticky-glass\s*\{[^}]*background-color:\s*rgba\(11,\s*11,\s*13,\s*0\.8/);
    expect(css, "sticky glass must diffuse what scrolls beneath it")
      .toMatch(/\.wm-sticky-glass\s*\{[^}]*backdrop-filter:\s*blur/);
    expect(css, "legibility must not depend on backdrop-filter support")
      .toMatch(/@supports not \(\(backdrop-filter/);

    // Every pinned band in a Founder room routes through that one owner.
    const paper = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
    const stickyLines = paper
      .split("\n")
      .filter((line) => /className="[^"]*\bsticky\b/.test(line));
    expect(stickyLines.length, "/paper should still have its pinned bands")
      .toBeGreaterThanOrEqual(7);
    for (const line of stickyLines) {
      expect(line, "a /paper sticky band painted an opaque slab over the sanctuary")
        .not.toMatch(/\bbg-wm-dark\b/);
      expect(line, "a /paper sticky band must use the canonical glass owner")
        .toMatch(/\bwm-sticky-glass\b/);
    }

    // /journal's coverage notes are NOT sticky — nothing scrolls beneath
    // them, so they get no fill at all rather than a glass one. Carrying
    // opacity a band does not need is the same fragmentation in miniature.
    const journal = readFileSync(resolve(__dirname, "../app/journal/page.tsx"), "utf8");
    const noteBands = journal
      .split("\n")
      .filter((line) => line.includes('role="note"') && line.includes("border-b"));
    expect(noteBands.length, "/journal should still declare its coverage notes")
      .toBeGreaterThanOrEqual(2);
    for (const line of noteBands) {
      expect(line, "a /journal coverage note carried a fill it does not need")
        .not.toMatch(/\bbg-wm-dark\b/);
    }
  });
});
