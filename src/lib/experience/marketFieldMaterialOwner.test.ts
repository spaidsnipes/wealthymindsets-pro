/**
 * SCENE_FRAGMENTATION guard — ONE OWNER for the market field's material.
 *
 * ── REMAPPED FROM A SPELLING TO THE LAW, 2026-09-19 ───────────────────────
 * Every gate below used to name the literal `"#0B0E1A"`. That hex was the
 * COLD NAVY the chart shipped on before the OS existed, and pinning it made
 * this suite an obstacle to the very Canon it was written to serve: the room
 * stands on warm obsidian `#07080a` and the canvas sitting on a different
 * material was a seam across the widest surface in the product.
 *
 * The LAW never involved a particular colour. The law is: the market field
 * has exactly ONE owner, and no element restates that owner's value as a bare
 * literal. So the gates now scan for the NAMED CONSTANT — which is strictly
 * stronger, because `background: "<any hex>"` on a field-sized element is now
 * catchable rather than only the one hex somebody thought to blacklist.
 *
 * `chartsRoomChrome.test.ts` cured five files that painted their own opaque
 * slab around MARKET. Its FRAME list is:
 *
 *   ChartToolbar · LeftDrawingSidebar · StockInfoPanel · ChartsDashboard ·
 *   TimeframeSelector
 *
 * `MainChart.tsx` is not on it — and MainChart owns the market field itself.
 * So the largest surface in the product kept the defect after its five
 * neighbours were fixed.
 *
 * ── THE DEFECT THIS PINS ──────────────────────────────────────────────
 * MainChart's wrapper paints the canonical material:
 *
 *   background: chartSettings?.background ?? "#0B0E1A"
 *
 * The 28px OHLCV strip directly inside it used to paint:
 *
 *   background: "#0B0E1A"
 *
 * A hardcoded restatement of the same value. This is the VACUOUS AGREEMENT
 * shape: a duplicate owner that agrees with the true owner in the DEFAULT
 * case, and that agreement is precisely what let it survive review. It
 * diverges the instant the trader changes the chart background in Appearance,
 * at which point MARKET's own price truth renders as a foreign slab floating
 * inside the market field.
 *
 * MEASURED LIVE on production before the fix — /charts?symbol=TSLA with
 * `wm_chartSettings.background` set to `#241014`:
 *
 *   strip        -> rgb(11, 14, 26)
 *   market field -> rgb(36, 16, 20)   divergent: true
 *
 * ── WHY A SOURCE-LEVEL GATE ───────────────────────────────────────────
 * `tsc --noEmit` is structurally blind to every line of this: `background:
 * "#0B0E1A"` is a perfectly well-typed `React.CSSProperties`. Mounting tests
 * are blind too — the defect is a COLOUR, and it renders happily at the
 * default setting, which is the only setting a fixture would use. Only an
 * assertion on the source can hold it.
 *
 * ── THE TRAP THIS SUITE ENCODES ───────────────────────────────────────
 * The comment in MainChart.tsx explaining the fix NAMES `#0B0E1A` several
 * times. A naive `not.toMatch` would fail on the very prose documenting the
 * cure. Every negative assertion below runs on comment-stripped source.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const READ = (rel: string) => readFileSync(resolve(__dirname, "../..", rel), "utf8");

/** Strip block and line comments so prose about a hex cannot fail a gate. */
const CODE = (rel: string) =>
  READ(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const MAIN_CHART = "components/chart/MainChart.tsx";

/**
 * The room's material, imported rather than spelled, so this suite can never
 * again become the thing that pins a colour the Canon has moved past.
 */
const FIELD = "MARKET_FIELD_DEFAULT";

/**
 * THE WHOLE LANGUAGE, NOT JUST THE FIELD — 2026-09-19.
 *
 * The field's material was the first constant to move out of MainChart and
 * into `lib/chart/marketFieldMaterial.ts`. The chart's LANGUAGE — the brass
 * candle pair, the grid, the crosshair — followed, for the same reason and
 * into the same module. Every one of them is subject to the identical law:
 * imported, never restated, and only ever used as the fallback arm of a
 * `chartSettings` read so the trader's own choice always wins.
 *
 * So the gate is written over the LIST rather than over one name. A constant
 * added to the module and used in MainChart without being added here is not
 * silently exempt — `THE IMPORT IS THE LIST` below reads the import block
 * itself and fails if the two disagree.
 */
const LANGUAGE = [
  FIELD,
  "CANDLE_UP_DEFAULT",
  "CANDLE_DOWN_DEFAULT",
  "GRID_COLOR_DEFAULT",
  "CROSSHAIR_COLOR_DEFAULT",
] as const;

/**
 * VOLUME — the same module, a DIFFERENT use shape, named rather than tolerated.
 *
 * The five constants above are all fallback arms of a `chartSettings` read:
 * the trader can change each one in Appearance and their choice wins. Volume
 * has no Appearance control, so it cannot take that shape. Its two constants
 * are instead the non-neon arm of the WM Neon theme ternary:
 *
 *   chartSettings?.neon ? "rgba(0,255,163,0.70)" : VOLUME_UP_DEFAULT
 *
 * That IS still a chartSettings-derived use — the room's material by default,
 * the trader's chosen costume when they opt into Neon — but it will never
 * match a `??` guard. Listing it separately keeps the gate above strict rather
 * than loosening that regex until it admits both shapes and consequently
 * stops distinguishing them. An unnamed exception is exactly how the original
 * duplicate owner survived review in the first place.
 */
const THEME_LANGUAGE = ["VOLUME_UP_DEFAULT", "VOLUME_DOWN_DEFAULT"] as const;

/**
 * The `import { … } from "@/lib/chart/marketFieldMaterial"` block, verbatim.
 *
 * `[^}]*` and NOT `[\s\S]*?`. MainChart opens with ~200 import statements; a
 * lazy any-character body anchors at the FIRST `import {` in the file and runs
 * all the way down to this module's `from`, so the "block" swallows a hundred
 * unrelated identifiers. Caught live by the IMPORT IS THE LIST gate below,
 * which reported eighteen names for a five-name import. Excluding the closing
 * brace pins the match to one statement.
 */
const IMPORT_BLOCK = (src: string) =>
  src.match(/import\s*\{([^}]*)\}\s*from\s*"@\/lib\/chart\/marketFieldMaterial";/);

describe("the market field has ONE material owner", () => {
  it("VACUITY GUARD: the scan actually read MainChart", () => {
    // Every negative assertion below is of the form "this pattern does NOT
    // appear". A typo'd path, a moved file, or a comment-stripper that ate the
    // whole buffer would make ALL of them pass while policing nothing — the
    // exact failure `lib/ops/sentinelsProveTheyScanned.test.ts` exists to
    // catch, and the same VACUOUS AGREEMENT shape this suite polices, turned
    // on the suite itself. Prove the read found material FIRST and loudly.
    const src = CODE(MAIN_CHART);
    expect(
      src.length,
      "MainChart.tsx read back nearly empty — this Sentinel's scan has drifted " +
        "and every gate below is passing vacuously",
    ).toBeGreaterThan(100_000);
    // And prove the stripper left the STYLE layer intact, not just bytes.
    expect(
      (src.match(/background:/g) ?? []).length,
      "no `background:` declarations survived the comment strip — the gates " +
        "below are looking at the wrong text",
    ).toBeGreaterThan(20);
  });

  it("THE DEFECT: no element restates the FIELD fill as a bare literal", () => {
    // The shape being outlawed is an inline style prop assigning the market
    // field's own value DIRECTLY:   background: "#0B0E1A"
    // as opposed to the canonical read, which is legal and required:
    //                               background: chartSettings?.background ?? "#0B0E1A"
    // The regex only matches the former, because the latter has an
    // identifier — not a quote — immediately after the colon.
    //
    // DELIBERATELY BOUNDED TO THE FIELD VALUE. MainChart also contains many
    // opaque interior surfaces — context menus, tool popovers, settings
    // panels — painted `#0E1322` / `#141824` / `#2A3350`. Those are NOT the
    // room boundary and they are REQUIRED to stay opaque: they float over
    // live candles and glass there would be an accessibility regression, the
    // same "popover exception" that `chartsRoomChrome.test.ts` protects as
    // trap 2. Widening this sweep to every hex would make the gate a demand
    // to break that law. Only the field's own material has one owner.
    const src = CODE(MAIN_CHART);
    // STILL BOUNDED TO THE FIELD'S OWN VALUES, for the reason spelled out
    // immediately above. An earlier pass of this remap widened the sweep to
    // every six-digit hex and turned red on TWELVE legitimate opaque popover
    // surfaces — i.e. the gate became a demand to break the law the comment
    // above protects. Both the current material and the legacy navy are named
    // here, so neither spelling can return as a second owner.
    const bare = src.match(/background:\s*"(#07080a|#0B0E1A)"/gi) ?? [];
    expect(
      bare,
      "a second owner is painting the market field's material; it will " +
        "diverge from chartSettings.background the moment the trader " +
        "changes it in Appearance",
    ).toEqual([]);
  });

  it("THE DEFECT: the OHLCV strip carries no fill of its own", () => {
    // Targeted at the exact element, so a future refactor that reintroduces
    // the slab under a different literal still turns this red.
    const src = CODE(MAIN_CHART);
    const strip = src.match(/\{\s*height:\s*28,\s*flexShrink:\s*0,\s*background:\s*([^}]*)\}/);
    expect(strip, "the 28px OHLCV strip style object is missing").not.toBeNull();
    expect(strip![1].trim().replace(/,$/, "")).toBe('"transparent"');
  });

  it("the canonical owner still paints the field — we removed a duplicate, not the fill", () => {
    // OVER-CORRECTION GUARD. Deleting the strip's fill is only correct
    // because the wrapper has one. If a later change strips the wrapper too,
    // the market field loses its material entirely and the defect becomes a
    // worse defect. Pin the real owner.
    expect(CODE(MAIN_CHART)).toMatch(
      new RegExp(
        `background:\\s*chartSettings\\?\\.background\\s*\\?\\?\\s*${FIELD}\\s*,\\s*touchAction`,
      ),
    );
  });

  it("the strip keeps its structural delimiter — a fill was removed, not the structure", () => {
    // OVER-CORRECTION GUARD. Canon calls for brass structural hairlines, not
    // for the removal of all structure. Transparency is the cure; erasing the
    // boundary between controls and candles is not.
    expect(CODE(MAIN_CHART)).toMatch(
      /height:\s*28,\s*flexShrink:\s*0,\s*background:\s*"transparent"[\s\S]{0,160}?border-b border-wm-border\/50/,
    );
  });

  it("renderer fills still read the canonical setting, never a naked constant", () => {
    // The chart engine and the overlay canvases need a concrete colour STRING
    // (lightweight-charts and 2D canvas cannot consume `transparent` for a
    // backing fill). Those call sites are legitimate — but each must DERIVE
    // the value from chartSettings rather than hardcode it.
    //
    // There is exactly one lawful non-fill use left: the active-chip label,
    // `color: active ? "#0B0E1A" : …`, which paints FOREGROUND text knocked
    // out of a gold pill. That is a contrast pairing with the pill, not a
    // claim about the room's material, so it does not take the field's owner.
    // It is named here rather than tolerated silently — an unnamed exception
    // is how the original duplicate survived in the first place.
    // REMAPPED, NOT WEAKENED, 2026-09-19. This gate used to spell the import
    // as the single line `import { MARKET_FIELD_DEFAULT }`. When the chart's
    // language joined the field in the same module the import became a braced
    // multi-line list and that regex silently found nothing — the gate would
    // have gone red on correct code. The cure is to stop pinning the FORMAT of
    // the import and instead read the import BLOCK, which is what the law was
    // ever about. Reverting the import to satisfy the old spelling would have
    // been restoring old code to make CI green.
    const src = CODE(MAIN_CHART);
    const block = IMPORT_BLOCK(src);
    expect(block, "MainChart must import the chart language, not restate it").not.toBeNull();

    for (const name of LANGUAGE) {
      const inImport = (block![0].match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length;
      expect(inImport, `${name} must appear exactly once in the import block`).toBe(1);

      const hits = src.match(new RegExp(`\\b${name}\\b`, "g")) ?? [];
      // The fallback arm of a chartSettings read. Bounded to 24 characters so
      // the match cannot run lazily across newlines and swallow a neighbouring
      // option object, which would double-count an already-guarded use.
      const guarded =
        src.match(new RegExp(`chartSettings[\\s\\S]{0,24}?\\?\\?\\s*${name}`, "g")) ?? [];
      expect(
        hits.length,
        `every ${name} use must be a fallback on a chartSettings read ` +
          `(found ${hits.length} uses, ${guarded.length} guarded, 1 import)`,
      ).toBe(guarded.length + inImport);
    }
  });

  it("volume is brass too — each theme constant is the non-neon arm, imported", () => {
    // Volume used to paint teal/red directly beneath a brass price series,
    // which moved the rainbow one pane down rather than removing it. The cure
    // has the same ONE OWNER requirement as the rest of the language.
    const src = CODE(MAIN_CHART);
    const block = IMPORT_BLOCK(src);
    expect(block).not.toBeNull();

    for (const name of THEME_LANGUAGE) {
      expect(
        (block![0].match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length,
        `${name} must appear exactly once in the import block`,
      ).toBe(1);

      const hits = src.match(new RegExp(`\\b${name}\\b`, "g")) ?? [];
      // The FALSE arm of a `chartSettings?.neon ? … : …` ternary. Pinned to
      // the neon read specifically, so moving volume onto some unrelated
      // ternary does not silently satisfy this.
      const themed =
        src.match(new RegExp(`chartSettings\\?\\.neon\\s*\\?[^;]{0,60}?:\\s*${name}`, "g")) ?? [];
      // ONE further lawful use: the SERIES-LEVEL `color`, which is not a bar
      // colour at all — it is what Lightweight-Charts draws the price line and
      // the axis tag from. See THE LAST RED THREAD below for why that had to
      // be set explicitly. It is counted, not exempted.
      const furniture =
        src.match(new RegExp(`color:\\s*${name},`, "g")) ?? [];
      expect(
        hits.length,
        `every ${name} use must be the default arm of the neon theme ternary, ` +
          `or the volume series' own furniture colour ` +
          `(found ${hits.length} uses, ${themed.length} themed, ` +
          `${furniture.length} furniture, 1 import)`,
      ).toBe(themed.length + furniture.length + 1);
    }

    // OVER-CORRECTION GUARD. The point was to remove the casino from the
    // ROOM'S DEFAULT, not to delete a theme the trader deliberately opted
    // into. Neon keeps its own vocabulary.
    expect(src, "the WM Neon volume theme was removed rather than bypassed").toMatch(
      /chartSettings\?\.neon\s*\?\s*"rgba\(0,255,163/,
    );
  });

  it("THE VALUE IS OWNED TOO — no language colour appears as a bare hex", () => {
    // FOUND BY AN ORKIN REVIVE-ATTEMPT, 2026-09-19, and the gate above did NOT
    // catch it. That gate counts identifier USES and requires each to be a
    // chartSettings fallback. Replacing
    //
    //   wickUpColor: chartSettings?.wickUp ?? CANDLE_UP_DEFAULT
    // with
    //   wickUpColor: "#c4a574"
    //
    // drops the identifier count AND the guarded count by one, so the equality
    // still holds and the suite stayed green on a genuinely reintroduced
    // defect — the exact VACUOUS AGREEMENT shape this file exists to police,
    // turned on the file itself. Counting uses of a NAME cannot see a defect
    // that removes the name. Only the VALUE can.
    //
    // SCOPED TO THE FOUR LANGUAGE VALUES, deliberately. A sweep over every hex
    // would turn red on a dozen legitimate opaque popover surfaces (the trap-2
    // popover exception the gate above documents), and on the legacy
    // `#00C076`/`#FF4D67` still lawfully used by the cumulative-delta
    // INDICATOR series, the Fibonacci palette and the drawing tools — none of
    // which are the price series and none of which this slice moved. Those are
    // recorded, not forgotten. But the room's four new values have exactly one
    // owner each, measured: zero bare occurrences in MainChart today.
    const src = CODE(MAIN_CHART);
    for (const hex of ["#c4a574", "#6e5a3c", "#211d14", "#8a8271"]) {
      const bare = src.match(new RegExp(hex, "gi")) ?? [];
      expect(
        bare,
        `${hex} is restated as a literal; it has a named owner in ` +
          `lib/chart/marketFieldMaterial.ts and will diverge from the ` +
          `trader's Appearance choice the moment they change it`,
      ).toEqual([]);
    }
  });

  it("THE READ IS OWNED TOO — every settings read falls back to the owner", () => {
    // THE THIRD FACE OF THE SAME DEFECT, and the two gates above were blind to
    // it in OPPOSITE directions. One counts USES of the constant; one scans for
    // the constant's VALUE. Neither can see a read that mentions NEITHER:
    //
    //   upColor: chartSettings?.candleUp ?? "#00E5CC"
    //
    // MEASURED IN THE SOURCE, 2026-09-19: twelve such lines survived the brass
    // conversion, six of them in the `else` branch that draws STANDARD CANDLES
    // — the default chart type on the default route. They rendered brass on
    // production anyway, which is exactly why nobody caught them: the v3
    // migration had already written explicit brass into the trader's storage,
    // so the left side of every `??` was defined and the stale right side never
    // evaluated. VACUOUS AGREEMENT again — a duplicate owner that agrees
    // because the true owner happens to be answering. It would have surfaced
    // the first time a trader cleared their storage, or hit "Reset" in
    // Appearance, and the room would have handed them teal and violet candles.
    //
    // So the law is stated in the reading direction: if MainChart asks the
    // settings object for a language key, the answer when it is absent is the
    // room's, not a literal left over from a previous build.
    const OWNER: ReadonlyArray<readonly [keys: string[], owner: string]> = [
      [["background"], FIELD],
      [["candleUp", "borderUp", "wickUp"], "CANDLE_UP_DEFAULT"],
      [["candleDown", "borderDown", "wickDown"], "CANDLE_DOWN_DEFAULT"],
      [["gridColor"], "GRID_COLOR_DEFAULT"],
      [["crosshairColor"], "CROSSHAIR_COLOR_DEFAULT"],
    ];
    const src = CODE(MAIN_CHART);
    for (const [keys, owner] of OWNER) {
      for (const key of keys) {
        // Capture whatever sits on the right of the `??` for this key.
        const reads = [
          ...src.matchAll(new RegExp(`chartSettings\\?\\.${key}\\s*\\?\\?\\s*([^,;\\n)}]+)`, "g")),
        ].map((m) => m[1].trim());
        expect(
          reads.length,
          `no chartSettings?.${key} read found — if the key was renamed, ` +
            `rename it here too; this gate must not go quiet`,
        ).toBeGreaterThan(0);
        for (const tail of reads) {
          // A CHAIN IS LAWFUL; AN UNOWNED TERMINUS IS NOT. MainChart writes
          //
          //   borderUpColor: chartSettings?.borderUp ?? chartSettings?.candleUp
          //                  ?? CANDLE_UP_DEFAULT
          //
          // deliberately: a trader who picks a candle colour and never opens
          // the separate border swatch should get borders that match their
          // candles, not the room's. That is the settings object deferring to
          // itself, which is still ONE owner. What must never happen is the
          // chain ENDING anywhere but the room. So: every link before the last
          // must be another settings read, and the last must be the owner.
          const links = tail.split("??").map((s) => s.trim());
          for (const link of links.slice(0, -1)) {
            expect(
              link,
              `chartSettings?.${key} defers to ${link}, which is neither ` +
                `another settings read nor the owner`,
            ).toMatch(/^chartSettings\?\.\w+$/);
          }
          expect(
            links[links.length - 1],
            `the chartSettings?.${key} chain ends at ${links[links.length - 1]}, ` +
              `not ${owner}. A trader who clears storage or resets Appearance ` +
              `gets that value on the widest surface in the product.`,
          ).toBe(owner);
        }
      }
    }
  });

  it("THE LAST RED THREAD — volume's own furniture is brass, not the casino", () => {
    // Per-point `color` paints the BARS. The series' price line and axis tag
    // come from the SERIES-LEVEL `color`, which this call never set — so after
    // the bars turned brass a full-width dashed rule and a price tag kept
    // drawing in the old red. MEASURED LIVE by reading the canvas back on the
    // serving build: `143,46,63` at 758 px in the volume band, which is
    // `#FF4D67` composited on the field at ~0.55 alpha.
    //
    // This is the one defect class a source gate catches that LOOKING cannot
    // reliably catch: it is furniture nobody wrote, supplied by a library
    // default, and it is invisible in the diff because there is no line to see.
    const src = CODE(MAIN_CHART);
    // `priceFormat: { type: "volume" }` nests one level of braces inside the
    // options object, so a flat `[^}]*` stops at the wrong brace and reports
    // "the call moved" on a call that never moved. Match one nesting level.
    const call = src.match(
      /addSeries\(\s*LW\.HistogramSeries\s*,\s*(\{(?:[^{}]|\{[^{}]*\})*\})/,
    );
    expect(call, "the volume histogram call moved — re-point this gate").not.toBeNull();
    expect(call![0], "the volume series has no brass series-level colour, so its " +
      "price line and axis tag fall back to the library default")
      .toMatch(/color:\s*VOLUME_UP_DEFAULT/);
    expect(call![0], "volume draws a second full-width rule restating its own bars")
      .toMatch(/priceLineVisible:\s*false/);
  });

  it("THE IMPORT IS THE LIST — a constant cannot be added and quietly exempted", () => {
    // VACUITY GUARD for the gate above. That loop iterates `LANGUAGE`, so a
    // sixth constant imported into MainChart and hardcoded somewhere would be
    // policed by nothing at all — the list would simply not know about it.
    // This pins the two together: the import block and LANGUAGE must name the
    // same set, so adding a constant forces adding a gate.
    const block = IMPORT_BLOCK(CODE(MAIN_CHART));
    expect(block).not.toBeNull();
    const named = (block![1].match(/\b[A-Z][A-Z0-9_]+\b/g) ?? []).sort();
    expect(
      named,
      "MainChart imports a chart-language constant this suite does not police",
    ).toEqual([...LANGUAGE, ...THEME_LANGUAGE].sort());
  });

  it("does not regress the five files chartsRoomChrome.test.ts already cured", () => {
    // The sibling gate owns those. This asserts only that the two suites
    // describe ONE law rather than two, so a future reader extending either
    // one finds the other.
    const sibling = READ("lib/experience/chartsRoomChrome.test.ts");
    expect(sibling).toContain("wm-room-chrome");
    expect(CODE(MAIN_CHART)).not.toContain("wm-room-chrome");
  });
});
