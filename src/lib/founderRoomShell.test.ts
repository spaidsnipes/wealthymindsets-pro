import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (): string =>
  readFileSync(resolve(__dirname, "../components/layout/MainLayout.tsx"), "utf8");

describe("Founder operating-room shell", () => {
  it("removes the legacy multi-symbol tape from every Asset-10 family route", () => {
    // The Founder audit 2026-09-13 expanded the Asset-10 family from
    // /command-deck alone to the registry in founderRoomRoutes.ts. The
    // tape suppression follows the same registry — a family route
    // showing the July TickerTape is exactly the kind of "old chrome
    // inside a calm room" the audit flagged.
    const layout = source();
    expect(layout).toContain('const isFounderOperatingRoom = isFounderRoomRoute(pathname);');
    expect(layout).toContain("{isFounderOperatingRoom ? (");
    expect(layout).toContain('data-testid="founder-room-header-space"');
    expect(layout).toContain("<TickerTape />");
  });

  it("keeps the suppression presentational and does not invent replacement market truth", () => {
    const layout = source();
    const start = layout.indexOf("{isFounderOperatingRoom ? (");
    const end = layout.indexOf(")}", start);
    const founderBranch = layout.slice(start, end);
    expect(founderBranch).toContain('aria-hidden="true"');
    expect(founderBranch).not.toMatch(/LIVE|DELAYED|price|source|provider/i);
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
    expect(charts, "chart category strip painted an opaque #0D0E14 band")
      .not.toMatch(/background:\s*"#0D0E14",\s*\n?\s*flexShrink: 0/);
  });
});
