/**
 * SENTINEL — no word on the chart glass bypasses the word registry.
 *
 * Serving all-on at 390 and 834 (92895d6, 2026-10-09) failed the pairwise
 * collision audit although every taught painter was clean: the rule lived in
 * the painters, so the next painter was free to break it. The rule now lives
 * in the context's own fillText (src/lib/chart/wordRegistry.ts). This file
 * pins that MainChart cannot route around it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const REG = readFileSync(path.join(process.cwd(), "src/lib/chart/wordRegistry.ts"), "utf8");

describe("every word claims its rect before it paints", () => {
  it("every 2D context MainChart paints words on is gated, and its frame is begun, before any text call", () => {
    const gates = [...CHART.matchAll(/installWordGate\(ctx\)/g)].map(m => m.index ?? -1);
    const contexts = [...CHART.matchAll(/const ctx = canvas\.getContext\("2d"\);/g)].map(m => m.index ?? -1);
    expect(contexts.length).toBe(2);
    expect(gates.length).toBe(contexts.length);
    contexts.forEach((at, i) => {
      const firstText = CHART.indexOf("ctx.fillText(", at);
      expect(gates[i]).toBeGreaterThan(at);
      expect(gates[i]).toBeLessThan(firstText);
      expect(CHART.indexOf("beginFrame(", gates[i])).toBeLessThan(firstText);
    });
  });
  it("every text call goes through the gated context — no raw prototype call, no other context's fillText, no strokeText words", () => {
    const calls = [...CHART.matchAll(/([A-Za-z_.]+)\.fillText\(/g)].map(m => m[1]);
    expect(calls.length).toBeGreaterThan(150);
    expect(calls.filter(c => c !== "ctx")).toEqual([]);
    expect(CHART).not.toMatch(/prototype\.fillText|fillText\.(call|apply|bind)\(/);
    // Halos ask the same registry (the gate wraps strokeText too) — and only on the gated context.
    expect([...CHART.matchAll(/([A-Za-z_.]+)\.strokeText\(/g)].map(m => m[1]).filter(c => c !== "ctx")).toEqual([]);
    expect(REG).toContain("ctx.strokeText = gated(rawStroke);");
  });
  it("the allow-list is explicit: only wordGate.sovereign may paint unjudged, and MainChart does not use it for market words", () => {
    // Axis and price-scale text belong to the charting library's own canvases;
    // the overlay has no sovereign call today. Adding one is a reviewed act.
    expect([...CHART.matchAll(/wordGate\.sovereign\(/g)].length).toBe(0);
    expect(REG).toContain("if (!live || sovereignDepth > 0) return paint();");
  });
  it("the newest candles' column is a registry blocker at every width, from the first word of the frame", () => {
    expect(CHART).toContain("wordGate.beginFrame({ mode: wordGateMode, dpr, column: wordGateColumnRef.current, onHeld: w => { wordGateHeld.push(w); } });");
    expect(CHART).toContain("wordGateColumnRef.current = newestColumnKeepOut();\n      wordGate.setColumn(wordGateColumnRef.current);");
    // No width condition anywhere near the column hand-off.
    const i = CHART.indexOf("wordGate.setColumn(wordGateColumnRef.current);");
    expect(CHART.slice(i - 300, i + 60)).not.toMatch(/W\s*[<>]=?\s*\d/);
  });
  it("a withheld word is listed, never dropped; the note anchors read the same registry; the verdicts are a receipt", () => {
    expect(CHART).toContain('displacedNotes.push({ layer: "WORDS", text: hw.text.trim(), x: hw.rect.x + hw.rect.w / 2, y: hw.rect.y + hw.rect.h / 2 });');
    expect(CHART).toContain("const wordRectsNow = wordGate.rects().map(q => ({ x: q.x, y: q.y, w: q.w, h: q.h }));");
    expect(CHART).toContain("floatingChips.splice(chipsBeforeWords, wordRectsNow.length);");
    expect(CHART).toContain("canvas.dataset.wordGate = wordGate.receipt();");
  });
  it("THE FLIP: the registry enforces by default; OBSERVE is the address's way back and still changes nothing on the glass", () => {
    expect(REG).toContain('if (verdict === "PAINT" || mode === "OBSERVE") return paint();');
    expect(REG).toContain('export const WORD_GATE_DEFAULT_MODE: WordGateMode = "ENFORCE";');
    expect(REG).toContain('return g === "observe" ? "OBSERVE" : g === "enforce" ? "ENFORCE" : WORD_GATE_DEFAULT_MODE;');
    // The trader's own drawings stay in OBSERVE permanently, whatever the default.
    expect(CHART).toContain('paneWordGate.beginFrame({ mode: "OBSERVE", dpr });');
    // The chart reads its mode from the one function — no second default in the room.
    expect(CHART).toContain("const wordGateMode = wordGateModeFor(window.location.search);");
  });
});

describe("chips ask for their box; on-top words are named; the teaching card never lies on candles under 1024", () => {
  it("one helper for every chip backing, and it is the registry's panel claim", () => {
    expect(CHART).toContain("const chipBox = (label: string, box: { x: number; y: number; w: number; h: number }): boolean => wordGate.panel(label, box);");
    expect([...CHART.matchAll(/if \(!?chipBox\(/g)].length).toBeGreaterThanOrEqual(12);
    expect(REG).toContain("return verdict === \"PAINT\" || mode === \"OBSERVE\";");
  });
  it("every sovereign mark carries one of five reasons, on the line it is made", () => {
    const marks = [...CHART.matchAll(/onTop\([^\n]*?, "(CROSSHAIR|SELECTION|INSPECT|OPAQUE_CARD|ANSWER)"\);/g)].map(m => m[1]);
    expect(marks.length).toBeGreaterThanOrEqual(6);
    expect([...CHART.matchAll(/\bonTop\(/g)].length).toBe(marks.length);
    expect(CHART).toContain('reason: "CROSSHAIR" | "SELECTION" | "INSPECT" | "OPAQUE_CARD" | "ANSWER") => wordGate.sovereignPanel(box, reason);');
  });
  it("the trader's own drawings are never withheld", () => {
    expect(CHART).toContain('paneWordGate.beginFrame({ mode: "OBSERVE", dpr });');
  });
  it("the teaching card docks around the registry's words, and with no candle-free dock it is withheld with a receipt (desktop yield stays canon)", () => {
    const a = CHART.indexOf("floatingChips.push(...cardWordReserve);");
    const dock = CHART.indexOf("bounds, candles: candleRects, blockers: floatingChips,", a);
    const rel = CHART.indexOf("floatingChips.splice(chipsBeforeCard, cardWordReserve.length);", a);
    expect(a).toBeGreaterThan(0); expect(dock).toBeGreaterThan(a); expect(rel).toBeGreaterThan(dock);
    expect(CHART).toContain("const cardNoClearDock = !cardOnNewest && yielded && (W < 1024 || cardWordsBeneath > 0);");
    expect(CHART).toContain('ds.scaffoldingDock = cardWordsBeneath > 0 ? `WITHHELD_WORDS_BENEATH:${cardWordsBeneath}` : "WITHHELD_NO_CLEAR_DOCK";');
    expect(CHART).toContain("ctx.fillStyle = panel(yielded ? 0.3 : 0.97);"); // canon untouched
  });
  it("a note chip still on a word after stepping becomes the wordless pip", () => {
    expect(CHART).toContain("pipForm = true; crowdedToPip++;");
    expect(CHART).toContain('return { a, r, seed, crowded: sp.mode === "BLOCKED", single: pipForm };');
  });
});

describe("truth lines have one home; level chips and the WAIT plate ask first; selected words are on top (2026-10-09)", () => {
  it("a truth line handed to the note composer goes to the silence stack instead — one wrapper for every painter", () => {
    expect(CHART).toContain("if (wordGate.isTruth(n.text)) { if (!truthForSilence.includes(n.text)) truthForSilence.push(n.text); }");
    const i = CHART.indexOf("for (const words of truthForSilence) {");
    expect(i).toBeGreaterThan(0);
    expect(CHART.slice(i, i + 500)).toContain("const yT = takeSilenceRow();");
    // …and it is painted BEFORE the folded-silence summary counts its rows.
    expect(i).toBeLessThan(CHART.indexOf("// The folded silences, as one line (see takeSilenceRow)."));
  });
  it("a level chip and the WAIT plate ask for their box before any leader, pin or backing", () => {
    expect(CHART).toContain("if (!chipBox(text, r)) return;");
    expect(CHART).toContain("|| !chipBox(tagT.word, spotT.rect)) {");
  });
  it("the selected zone's callout and the inspected bar's prices are on-top boxes", () => {
    expect(CHART).toContain('onTop(spotZ.rect, "SELECTION");');
    expect(CHART).toContain('onTop(spotRect, "INSPECT");');
  });
  it("the tape-coverage line steps up past what is on its row, else the silence stack", () => {
    expect(CHART).toContain("const tapeRow = [0, 1, 2, 3].map(k => H - 50 - k * 16).find(");
    expect(CHART).toContain('canvas.dataset.tapeCoverageWords = "SILENCE_STACK";');
  });
});

describe("truth is declared by the silence stack's one function (enforce audit, serving b94f28c, 2026-10-09)", () => {
  it("fitSilence declares the full and the fitted line; the envelope's provenance caption is declared; the receipt counts truth in the note list", () => {
    const i = CHART.indexOf("const fitSilence = (t: string): string => {");
    expect(i).toBeGreaterThan(0);
    const body = CHART.slice(i, i + 1200);
    expect(body).toContain("wordGate.declareTruth(t);");
    expect(body).toContain("wordGate.declareTruth(fitted);");
    expect(CHART).toContain("wordGate.declareTruth(capT);");
    expect(CHART).toContain("canvas.dataset.truthInNoteList = String(displacedNotes.filter(n => wordGate.isTruth(n.text)).length);");
    expect(REG).toContain("const isTruth = (text: string): boolean => declared.has(text) || isTruthLine(text);");
  });
  it("every line that takes a silence row is said through fitSilence (so it is declared)", () => {
    const takes = [...CHART.matchAll(/= takeSilenceRow\(\);/g)].length;
    const said = [...CHART.matchAll(/fitSilence\(/g)].length;
    expect(takes).toBeGreaterThan(5);
    expect(said).toBeGreaterThanOrEqual(takes);
  });
  it("a selected bar's true high / low keep their spot as an on-top box when no slot is clear — never the note list", () => {
    expect(CHART).toContain('const spotRect = spot.mode === "BLOCKED" ? pref : spot.rect;');
    expect(CHART).not.toContain('displacedNotes.push({ layer: "TRUTH"');
  });
});

describe("the asked question keeps its words; a truth line never paints on another's home (enforce audit, serving c9303a7, 2026-10-09)", () => {
  it("every Question Lens box is an on-top ANSWER box — refusal strip, phone strip, top strip, evidence-debt card, control card", () => {
    expect([...CHART.matchAll(/onTop\([^\n]*?, "ANSWER"\);/g)].length).toBe(5);
  });
  it("on a phone the folded-silence line sits UNDER the compact question strip while a question is asked", () => {
    expect(CHART).toContain("lensNarrowBottom = by + 34;");
    expect(CHART).toContain("const y = narrowGlass ? (lensNarrowBottom > 0 ? lensNarrowBottom + 10 : HEADER_FLOOR_Y + 10) : silenceRowY;");
  });
  it("the envelope's provenance caption with no clear slot is said in the silence stack, never over another line", () => {
    const i = CHART.indexOf('if (spotCap.mode === "BLOCKED") {');
    expect(i).toBeGreaterThan(0);
    expect(CHART.slice(i, i + 500)).toContain("ctx.fillText(fitSilence(capShown), silenceX, yC);");
    expect(CHART).toContain("wordGate.declareTruth(capShown);");
  });
  it("a chip's box is judged like its word, with no row pass-through", () => {
    expect(REG).toContain("claimPanel(label, rect, tier, rows = false) {");
    expect(REG).toContain("if (rows) {");
  });
});

describe("trade from the chart: draggable DRAFT lines and Trade at <price> (Founder P0 2026-10-09)", () => {
  const ROOM = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
  const LINES = readFileSync(path.join(process.cwd(), "src/lib/execution/chartOrderLines.ts"), "utf8");
  it("a drag only ever reaches the ticket DRAFT through the chartOrderLines owner — no send, no broker call, no fetch", () => {
    const i = CHART.indexOf("const beginDraftDrag = useCallback(");
    const j = CHART.indexOf("useEffect(() => {\n    if (!brokerLineNote) return;", i);
    expect(i).toBeGreaterThan(0); expect(j).toBeGreaterThan(i);
    const block = CHART.slice(i, j);
    expect(block).toContain('deliverChartDraftPrice(symbol, cur.role, cur.pending, "DRAG")');
    expect(block).not.toMatch(/fetch\(|\/api\/|placeOrder|submitOrder|sendOrder|localStorage/);
    expect(block).toContain("if (!chartOrderLineDraggable(l)) return;");
    expect(LINES).toContain('return l.status === "STAGED" && (l.role === "ENTRY" || l.role === "STOP" || l.role === "TARGET");');
  });
  it("the handle is a 44px touch target that snaps to tick, moves by keyboard, and a broker line says it cannot be moved", () => {
    expect(CHART).toContain('data-testid={can ? "draft-line-handle" : "broker-line-tag"}');
    expect(CHART).toContain("height: 44, minWidth: 44,");
    expect(CHART).toContain("return snapToTick(symbol, Number(raw));");
    expect(CHART).toContain('if (e.key === "ArrowUp") { e.preventDefault(); nudgeDraftLine(l, e.shiftKey ? 10 : 1); }');
    expect(CHART).toContain("onClick={can ? undefined : () => setBrokerLineNote(BROKER_LINE_NOT_MOVABLE)}");
    expect(CHART).toContain(": orderLineWords(l).text;");
    expect(CHART).toContain("draftHandleWords(l, shown, dpH)");
  });
  it("Trade at <price>: the menu item exists only with the prop; the room opens the ticket and hands the price to the draft as an ENTRY from the MENU", () => {
    expect(CHART).toContain("...(onTradeAtPrice ? [{");
    expect(CHART).toContain("action: () => onTradeAtPrice(snapToTick(symbol, ctxMenu.price)),");
    expect(ROOM).toContain('onTradeAtPrice={price => { setTradeOpen(true); deliverChartDraftPrice(symbol, "ENTRY", price, "MENU"); }}');
    expect([...ROOM.matchAll(/onTradeAtPrice=/g)].length).toBe(1); // the main chart mount only
  });
});

describe("the chart menu on iPhone / iPad, handles clear of the phone ticket sheet, volume indicators that cannot read (2026-10-10)", () => {
  const CSS = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  it("a touch long-press opens the SAME menu without any contextmenu event, and is not also a candle tap", () => {
    expect(CHART).toContain("onFire: (x, y) => { if (longPressHostRef.current) openCtxMenuAtRef.current(x, y, longPressHostRef.current, true); },");
    // Built ONCE: a ticking market re-renders faster than the press delay.
    expect(CHART).toMatch(/const longPress = React\.useMemo\(\(\) => createLongPress\(\{[\s\S]{0,200}?\}\), \[\]\);/);
    expect(CHART).toContain("openCtxMenuAt(e.clientX, e.clientY, e.currentTarget as HTMLElement, false);");
    expect(CHART).toContain("onPointerDown={e => { longPressHostRef.current = e.currentTarget; longPress.down(e); handleCursorSelectDown(e); }}");
    expect(CHART).toContain("if (fired) { suppressClickRef.current = true; cursorDownRef.current = null; return; }");
    expect(CHART).toContain("onPointerCancel={() => longPress.cancel()}");
  });
  it("the menu stays inside the pane, its items are 44px on touch, and on touch it closes on the backdrop only", () => {
    expect(CHART).toContain("const my = Math.max(4, Math.min(cy, rect.height - footer - menuH));");
    expect(CHART).toContain("onMouseLeave={ctxMenu.coarse ? undefined : () => setCtxMenu(null)}");
    expect(CHART).toContain('className="wm-ctx-item"');
    expect(CSS).toContain(".wm-ctx-item { min-height: 44px;");
  });
  it("a staged-line handle never sits under the phone ticket sheet", () => {
    expect(CHART).toContain("const underSheet = ticketSheetTop != null && Number(yLine) > ticketSheetTop - 22;");
    // Markers at the sheet's edge stack upward (one per line); one that would rise above the floor waits.
    expect(CHART).toContain("if (underSheet && (markerY == null || markerY < SHEET_MARKER_MIN_TOP)) return null;");
    expect(CHART).toContain("? (underSheet ? `${l.role} ↓ ${shown.toFixed(dpH)}` : draftHandleWords(l, shown, dpH))");
  });
  it("volume indicators are partitioned before any series is added; a withheld one adds none and is said once", () => {
    const gate = CHART.indexOf("const volGate = partitionVolumeIndicators(activeInds ?? [], symbol, bars);");
    expect(gate).toBeGreaterThan(0);
    const firstAdd = CHART.indexOf("chart.addSeries(LW.LineSeries", gate - 4000);
    expect(firstAdd).toBeGreaterThan(gate);
    expect(CHART).toContain("const inds   = new Set<string>([...(activeInds ?? new Set<string>())].filter(n => !volGate.withheld.includes(n)));");
    expect(CHART).toContain("canvas.dataset.volumeIndicatorsWithheld = vg.receipt;");
    expect(CHART).toContain("ctx.fillText(fitSilence(vg.silence.words), silenceX, yV);");
  });
});
