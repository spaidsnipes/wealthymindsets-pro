import { describe, expect, it } from "vitest";
import { createWordRegistry, installWordGate, isTruthLine, wordBox, wordGateModeFor, type HeldWord } from "./wordRegistry";

const fakeCtx = () => {
  const painted: string[] = [];
  const ctx = {
    font: "700 10px sans",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    globalAlpha: 1,
    measureText: (t: string) => ({ width: t.length * 6 }) as TextMetrics,
    getTransform: () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }) as DOMMatrix,
    fillText(t: string) { painted.push(t); },
    strokeText(t: string) { painted.push(`halo:${t}`); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, painted };
};

describe("word registry — one owner for every word on the glass", () => {
  it("a free rect paints and is registered; a word over it is held; a word on the newest column is held", () => {
    const r = createWordRegistry();
    r.setColumn({ x: 200, y: 0, w: 30, h: 300 });
    expect(r.claim("TAPE REGIME · TREND", { x: 10, y: 90, w: 120, h: 10 }).verdict).toBe("PAINT");
    expect(r.claim("FUSED · DERIVED", { x: 12, y: 92, w: 100, h: 10 })).toEqual({ verdict: "HELD_WORD", against: "TAPE REGIME · TREND" });
    expect(r.claim("SUPPORT · BROKEN", { x: 150, y: 40, w: 90, h: 10 }).verdict).toBe("HELD_COLUMN");
    expect(r.words).toBe(1);
    expect(r.held.map(h => h.verdict)).toEqual(["HELD_WORD", "HELD_COLUMN"]);
  });
  it("a halo then its fill is one word; a neighbour that only brushes it (≤ 25%) paints", () => {
    const r = createWordRegistry();
    r.claim("WAIT", { x: 50, y: 50, w: 40, h: 10 });
    expect(r.claim("WAIT", { x: 51, y: 50, w: 40, h: 10 }).verdict).toBe("PAINT");
    expect(r.claim("NEXT", { x: 82, y: 50, w: 40, h: 10 }).verdict).toBe("PAINT"); // 8 of 40 wide
    expect(r.claim("OVER", { x: 60, y: 50, w: 40, h: 10 }).verdict).toBe("HELD_WORD");
    expect(r.rects()).toHaveLength(2);
  });
  it("no column this frame: nothing is held for it", () => {
    const r = createWordRegistry();
    expect(r.claim("LIVING VAH", { x: 200, y: 10, w: 60, h: 10 }).verdict).toBe("PAINT");
  });
});

describe("word gate — the context's own fillText asks the registry", () => {
  it("boxes text in CSS pixels through the transform, and passes glyphs, faint ink and rotation", () => {
    const { ctx } = fakeCtx();
    expect(wordBox(ctx, "ABCDEFGHIJ", 100, 50, 2)).toEqual({ x: 100, y: 42, w: 60, h: 10 });
    ctx.textAlign = "right";
    expect(wordBox(ctx, "ABCDEFGHIJ", 100, 50, 2)?.x).toBe(40);
    expect(wordBox(ctx, "×5", 0, 0, 2)).toBeNull();
    ctx.globalAlpha = 0.1;
    expect(wordBox(ctx, "ABCDEFGHIJ", 0, 0, 2)).toBeNull();
  });
  it("OBSERVE paints everything and reports; ENFORCE withholds and hands the word to onHeld", () => {
    const { ctx, painted } = fakeCtx();
    const gate = installWordGate(ctx);
    expect(installWordGate(ctx)).toBe(gate); // idempotent
    const held: HeldWord[] = [];
    gate.beginFrame({ mode: "OBSERVE", dpr: 2, onHeld: w => held.push(w) });
    ctx.fillText("FIRST WORD", 10, 50);
    ctx.fillText("SECOND WORD", 12, 51);
    expect(painted).toEqual(["FIRST WORD", "SECOND WORD"]);
    expect(gate.receipt()).toBe("OBSERVE|WORDS:1|HELD:1|COLUMN:0");
    expect(held).toHaveLength(1);

    painted.length = 0; held.length = 0;
    gate.beginFrame({ mode: "ENFORCE", dpr: 2, column: { x: 300, y: 0, w: 30, h: 400 }, onHeld: w => held.push(w) });
    ctx.fillText("FIRST WORD", 10, 50);
    ctx.fillText("SECOND WORD", 12, 51);
    ctx.fillText("ON THE COLUMN", 280, 100);
    ctx.fillText("×5", 12, 51);
    gate.sovereign(() => ctx.fillText("31,250.00", 290, 100));
    expect(painted).toEqual(["FIRST WORD", "×5", "31,250.00"]);
    expect(held.map(h => h.verdict)).toEqual(["HELD_WORD", "HELD_COLUMN"]);
    expect(gate.receipt()).toBe("ENFORCE|WORDS:1|HELD:2|COLUMN:1");
    expect(gate.heldSample()).toBe("WORD:SECOND WORD|COL:ON THE COLUMN");
    expect(gate.rects()).toHaveLength(1);
  });
  it("a halo asks the same registry: painted with its word, withheld with its word, counted once", () => {
    const { ctx, painted } = fakeCtx();
    const gate = installWordGate(ctx);
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    ctx.strokeText("FIRST WORD", 10, 50); ctx.fillText("FIRST WORD", 10, 50);
    ctx.strokeText("SECOND WORD", 12, 51); ctx.fillText("SECOND WORD", 12, 51);
    expect(painted).toEqual(["halo:FIRST WORD", "FIRST WORD"]);
    expect(gate.receipt()).toBe("ENFORCE|WORDS:1|HELD:1|COLUMN:0");
  });
  it("a new frame starts with an empty registry", () => {
    const { ctx, painted } = fakeCtx();
    const gate = installWordGate(ctx);
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    ctx.fillText("SAME PLACE A", 10, 50);
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    ctx.fillText("SAME PLACE B", 10, 50);
    expect(painted).toEqual(["SAME PLACE A", "SAME PLACE B"]);
  });
  it("enforcement is by address until the verdicts are read on serving", () => {
    expect(wordGateModeFor("?symbol=NQ1!&gate=enforce")).toBe("ENFORCE");
    expect(wordGateModeFor("?symbol=NQ1!")).toBe("OBSERVE");
    expect(wordGateModeFor("")).toBe("OBSERVE");
  });
});

describe("chips and cards ask for their box before the backing; on-top words are sovereign", () => {
  it("a painted panel's rows paint without asking again; a held panel takes its rows with it", () => {
    const r = createWordRegistry();
    r.setColumn({ x: 300, y: 0, w: 30, h: 400 });
    expect(r.claimPanel("FOUNDATION VIEW", { x: 10, y: 10, w: 200, h: 100 }).verdict).toBe("PAINT");
    expect(r.claim("1 MARKET STRUCTURE BIAS", { x: 16, y: 20, w: 120, h: 9 }).verdict).toBe("PAINT");
    expect(r.claim("2 EFFORT", { x: 16, y: 21, w: 50, h: 9 }).verdict).toBe("PAINT"); // rows of one panel never fight
    expect(r.claimPanel("CALL OI 31200", { x: 250, y: 50, w: 80, h: 13 }).verdict).toBe("HELD_COLUMN");
    expect(r.claim("CALL OI 31200", { x: 253, y: 52, w: 74, h: 9 }).verdict).toBe("HELD_COLUMN");
    expect(r.held).toHaveLength(1); // the box and its word are ONE held thing
    // A later word across the painted panel is held against it.
    expect(r.claim("SIDE BAND · VOLUME BASIS", { x: 150, y: 30, w: 140, h: 9 }).verdict).toBe("HELD_WORD");
  });
  it("a chip's box then its own text is one word, even when the text sits a few pixels inside the box", () => {
    const r = createWordRegistry();
    expect(r.claimPanel("LEG POC 31209.00", { x: 100, y: 100, w: 96, h: 14 }).verdict).toBe("PAINT");
    expect(r.claim("LEG POC 31209.00", { x: 104, y: 103, w: 88, h: 9 }).verdict).toBe("PAINT");
    expect(r.words).toBe(1);
  });
  it("a sovereign panel is never judged — over words, over the column — and names its reason", () => {
    const r = createWordRegistry();
    r.setColumn({ x: 300, y: 0, w: 30, h: 400 });
    r.claim("LIVING VAH 31211.00", { x: 200, y: 100, w: 90, h: 10 });
    r.sovereignPanel({ x: 190, y: 90, w: 160, h: 60 }, "CROSSHAIR");
    expect(r.claim("Value candle · CoG 31204.68", { x: 196, y: 98, w: 140, h: 10 }).verdict).toBe("PAINT");
    expect(r.sovereignReasons).toEqual(["CROSSHAIR"]);
    expect(r.held).toHaveLength(0);
  });
  it("through the gate: ENFORCE says draw nothing for a held chip; OBSERVE always says draw", () => {
    const { ctx, painted } = fakeCtx();
    const gate = installWordGate(ctx);
    gate.beginFrame({ mode: "ENFORCE", dpr: 2, column: { x: 300, y: 0, w: 30, h: 400 } });
    expect(gate.panel("PUT OI 31200 · 296", { x: 280, y: 40, w: 80, h: 13 })).toBe(false);
    ctx.fillText("PUT OI 31200 · 296", 283, 50);
    expect(painted).toEqual([]);
    gate.sovereignPanel({ x: 270, y: 80, w: 120, h: 30 }, "INSPECT");
    ctx.fillText("Selected bar words", 276, 95);
    expect(painted).toEqual(["Selected bar words"]);
    expect(gate.receipt()).toBe("ENFORCE|WORDS:0|HELD:1|COLUMN:1|SOVEREIGN:INSPECT");
    gate.beginFrame({ mode: "OBSERVE", dpr: 2, column: { x: 300, y: 0, w: 30, h: 400 } });
    expect(gate.panel("PUT OI 31200 · 296", { x: 280, y: 40, w: 80, h: 13 })).toBe(true);
  });
});

describe("priority — truth first, then the answer, then everything else", () => {
  it("names truth lines in one place", () => {
    for (const s of ["5 SENSES SILENT — TOOLS › ACTIVE", "ZERO-GAMMA · WITHHELD — ONLY THE ~141 CONTRACTS NEAREST PRICE ARE HEARD", "CONTRADICTION · not enough finished bars",
      "LIVING PROFILE · UNAVAILABLE ON THIS FEED", "VALUE CANDLE · tape required", "PRINT TAPE FROM 07:50 AM CDT — earlier bars: bar totals only", "EXPECTED ENVELOPE · needs 3 completed sessions",
      "196 BARS BEHIND", "PROOF SCENE — sample market state, not live", "CANDLE-ESTIMATED · NODES WITHHELD"]) expect(isTruthLine(s)).toBe(true);
    for (const s of ["LIVING VAH 31211.00", "SWING ABOVE · 31194.50", "CALL OI 31200 · 515", "2 MARKET EVENTS", "WAIT", "DECREASING EFFORT", "TAPE REGIME · TREND · magnets dim"]) expect(isTruthLine(s)).toBe(false);
  });
  it("a truth line is never held: not by a word under it, not by the column, not inside a held panel", () => {
    const r = createWordRegistry();
    r.setColumn({ x: 300, y: 0, w: 30, h: 400 });
    r.claim("TAPE REGIME · TREND", { x: 10, y: 90, w: 140, h: 10 });
    expect(r.claim("5 SENSES SILENT — TOOLS › ACTIVE", { x: 12, y: 91, w: 180, h: 10 }).verdict).toBe("PAINT");
    expect(r.claim("ZERO-GAMMA · WITHHELD", { x: 290, y: 200, w: 120, h: 10 }).verdict).toBe("PAINT");
    r.claimPanel("CALL OI 31200", { x: 280, y: 40, w: 80, h: 30 });
    expect(r.claim("NO TAPE", { x: 284, y: 44, w: 50, h: 10 }).verdict).toBe("PAINT");
    expect(r.held.filter(h => isTruthLine(h.text))).toHaveLength(0);
    expect(r.truthWords).toBe(3);
  });
  it("the next frame, a lower word yields to the band truth held — before truth even asks; the answer yields to truth, not to decoration", () => {
    const f1 = createWordRegistry();
    f1.claim("TAPE REGIME · TREND", { x: 10, y: 90, w: 140, h: 10 });
    f1.claim("5 SENSES SILENT — TOOLS › ACTIVE", { x: 12, y: 91, w: 180, h: 10 });
    f1.claim("Is effort being absorbed?", { x: 10, y: 120, w: 150, h: 10 }, "PRIMARY");
    const f2 = createWordRegistry(f1.reservations());
    expect(f2.claim("TAPE REGIME · TREND", { x: 10, y: 90, w: 140, h: 10 })).toEqual({ verdict: "HELD_PRIORITY", against: "5 SENSES SILENT — TOOLS › ACTIVE" });
    expect(f2.claim("LIVING VAH 31211.00", { x: 20, y: 121, w: 90, h: 10 }).verdict).toBe("HELD_PRIORITY"); // under the answer's band
    expect(f2.claim("Is effort being absorbed?", { x: 10, y: 120, w: 150, h: 10 }, "PRIMARY").verdict).toBe("PAINT");
    expect(f2.claim("5 SENSES SILENT — TOOLS › ACTIVE", { x: 12, y: 91, w: 180, h: 10 }).verdict).toBe("PAINT");
    // A PRIMARY word over a decoration word already on the glass still paints; over truth it yields.
    const f3 = createWordRegistry(f2.reservations());
    f3.claim("DECORATION NAME", { x: 400, y: 50, w: 100, h: 10 });
    expect(f3.claim("ACTIVE QUESTION", { x: 410, y: 51, w: 90, h: 10 }, "PRIMARY").verdict).toBe("PAINT");
    expect(f3.claim("EVIDENCE DEBT", { x: 14, y: 92, w: 80, h: 10 }, "PRIMARY").verdict).toBe("HELD_PRIORITY");
  });
  it("through the gate: reservations carry frame to frame, the lens scope is PRIMARY, and the truth receipt reads TRUTH_HELD:0", () => {
    const { ctx, painted } = fakeCtx();
    const gate = installWordGate(ctx);
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    ctx.fillText("TAPE REGIME · TREND", 10, 100);
    ctx.fillText("5 SENSES SILENT — TOOLS", 12, 101);
    expect(painted).toEqual(["TAPE REGIME · TREND", "5 SENSES SILENT — TOOLS"]); // frame 1: truth paints over (one frame of lag)
    painted.length = 0;
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    ctx.fillText("TAPE REGIME · TREND", 10, 100);
    gate.setTier("PRIMARY"); ctx.fillText("ACTIVE QUESTION WORDS", 300, 100); gate.setTier("OTHER");
    ctx.fillText("5 SENSES SILENT — TOOLS", 12, 101);
    expect(painted).toEqual(["ACTIVE QUESTION WORDS", "5 SENSES SILENT — TOOLS"]);
    expect(gate.truthReceipt()).toBe("TRUTH:1|TRUTH_HELD:0|DECLARED:0|YIELDED_TO_HIGHER:1");
    // The frame after truth leaves, nothing is reserved for it.
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    painted.length = 0;
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    ctx.fillText("TAPE REGIME · TREND", 10, 100);
    expect(painted).toEqual(["TAPE REGIME · TREND"]);
  });
});

describe("price sovereignty — the column rule alone, enforced on narrow glass while the rest observes", () => {
  it("a word or a two-character mark within the padded column is withheld and handed on; everything else still paints (OBSERVE)", () => {
    const { ctx, painted } = fakeCtx();
    const gate = installWordGate(ctx);
    const held: HeldWord[] = [];
    gate.beginFrame({ mode: "OBSERVE", dpr: 2, column: { x: 300, y: 0, w: 30, h: 400 }, onHeld: w => held.push(w) });
    gate.setColumnRule({ enforce: true, padLeft: 20 });
    ctx.fillText("SPENT · DIDN'T MOVE", 250, 100);   // reaches the padded column
    ctx.fillText("LH", 305, 60);                       // a two-character mark on it
    ctx.fillText("HL", 120, 60);                       // the same mark, clear of it
    ctx.fillText("FIRST WORD", 10, 50);
    ctx.fillText("SECOND WORD", 12, 51);               // word-on-word: observed only
    ctx.fillText("ZERO-GAMMA · WITHHELD", 280, 200);   // truth: never held
    gate.sovereignPanel({ x: 280, y: 290, w: 120, h: 30 }, "INSPECT");
    ctx.fillText("Selected bar words", 286, 310);      // sovereign: never held
    expect(painted).toEqual(["HL", "FIRST WORD", "SECOND WORD", "ZERO-GAMMA · WITHHELD", "Selected bar words"]);
    expect(gate.columnHeld()).toBe(2);
    expect(held.map(h => h.text)).toEqual(["SPENT · DIDN'T MOVE", "SECOND WORD"]);
    expect(gate.truthReceipt()).toContain("TRUTH_HELD:0");
  });
  it("a chip that asks for its box on the column draws nothing; the rule is off again the next frame", () => {
    const { ctx, painted } = fakeCtx();
    const gate = installWordGate(ctx);
    gate.beginFrame({ mode: "OBSERVE", dpr: 2, column: { x: 300, y: 0, w: 30, h: 400 } });
    gate.setColumnRule({ enforce: true });
    expect(gate.panel("CALL OI 31200", { x: 290, y: 40, w: 80, h: 13 })).toBe(false);
    gate.beginFrame({ mode: "OBSERVE", dpr: 2, column: { x: 300, y: 0, w: 30, h: 400 } });
    expect(gate.panel("CALL OI 31200", { x: 290, y: 40, w: 80, h: 13 })).toBe(true);
    ctx.fillText("ON THE COLUMN", 290, 100);
    expect(painted).toEqual(["ON THE COLUMN"]);
    expect(gate.columnHeld()).toBe(0);
  });
});

describe("truth is DECLARED by its owner, not guessed from wording (enforce audit, serving b94f28c, 2026-10-09)", () => {
  it("the wordings the audit found held are truth by the second net too", () => {
    for (const s of [
      "LIQUIDITY LIFECYCLE · ACTIVE · NO POOL IN VIEW — 6 POOLS OFF CAMERA · SCROLL BACK OR ZOOM OUT",
      "FOUNDER ANATOMY · ACTIVE · NO CURRENT ABSORPTION / EXHAUSTION EVENT",
      "RISK ON PRICE · no position drawn — Draw › Long / Short Position to bracket its risk",
      "analogue envelope n=10 · prior sessions, same bar from the open",
      "WEEKLY PIVOTS · NO PRIOR WEEK YET",
    ]) expect(isTruthLine(s), s).toBe(true);
    for (const s of ["LIVING VAH 31211.00", "SPENT · DIDN'T MOVE", "STRUCTURE · FROM SWING LOW 31040.25 · 28 BARS", "NOW 31096.25"]) expect(isTruthLine(s), s).toBe(false);
  });
  it("a declared line is never held — over a word, on the column, in OBSERVE or ENFORCE — whatever it says; the declaration lasts one frame", () => {
    const { ctx, painted } = fakeCtx();
    const gate = installWordGate(ctx);
    const held: HeldWord[] = [];
    gate.beginFrame({ mode: "ENFORCE", dpr: 2, column: { x: 300, y: 0, w: 30, h: 400 }, onHeld: w => held.push(w) });
    gate.setColumnRule({ enforce: true, padLeft: 20 });
    ctx.fillText("SOME NAME HERE", 10, 50);
    const line = "A SENSE SAYS WHY IT HAS NOTHING";       // no keyword at all
    expect(isTruthLine(line)).toBe(false);
    gate.declareTruth(line);
    expect(gate.isTruth(line)).toBe(true);
    ctx.fillText(line, 12, 51);                             // over a word
    ctx.fillText(line, 290, 200);                           // on the column
    expect(painted).toEqual(["SOME NAME HERE", line, line]);
    expect(held).toHaveLength(0);
    expect(gate.truthReceipt()).toBe("TRUTH:2|TRUTH_HELD:0|DECLARED:1|YIELDED_TO_HIGHER:0");
    // Next frame, undeclared: it is a plain word again and can be held.
    painted.length = 0;
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    gate.beginFrame({ mode: "ENFORCE", dpr: 2 });
    ctx.fillText("SOME NAME HERE", 10, 50);
    ctx.fillText(line, 12, 51);
    expect(painted).toEqual(["SOME NAME HERE"]);
  });
  it("a declared chip box is never refused", () => {
    const { ctx } = fakeCtx();
    const gate = installWordGate(ctx);
    gate.beginFrame({ mode: "ENFORCE", dpr: 2, column: { x: 300, y: 0, w: 30, h: 400 } });
    gate.declareTruth("PROVENANCE CAPTION");
    expect(gate.panel("PROVENANCE CAPTION", { x: 290, y: 40, w: 120, h: 13 })).toBe(true);
  });
});
