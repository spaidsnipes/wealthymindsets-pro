/**
 * SURFACE ⓘ SENTINEL — Garden 19 §9 / §10, the surfaces the first registry
 * pass left without education (cert §15a; Sheriff batch 3 #2, #13–#15).
 *
 * Pins: every drawing tool id, every View tab, every camera loadout and every
 * Smart Money card has a complete record reachable through `educationFor`;
 * the surfaces open the shared preview (not a private panel); a bar selected
 * by a word has a first-touch line; and no record gives advice or predicts.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ALL_CATEGORY_TABS } from "@/lib/charts/categoryTabsFor";
import { CAMERA_LOADOUTS } from "@/lib/marketData/viewModels/selectChartArrangement";
import {
  CONCEPT_EDUCATION, INSTRUMENT_EDUCATION, INVENTION_EDUCATION, composeFirstTouch, educationFor, educationIdForSelection, educationTruthLines,
  firstTouchFor, firstTouchRepeatsLabel,
} from "@/lib/chart/inventionEducation";
import { selectProfileMenu } from "@/lib/marketData/viewModels/selectProfileMenu";
import {
  BAR_SELECTION_EDUCATION_ID, DRAWING_EDUCATION, LOADOUT_EDUCATION, REPLAY_EDUCATION_ID, SMART_MONEY_CARD_EDUCATION, SMART_MONEY_EDUCATION, smartMoneyCardEducationId, VIEW_EDUCATION,
  drawingEducationId, loadoutEducationId, smartMoneyEducationId, viewEducationId,
} from "@/lib/chart/surfaceEducation";

const ROOT = resolve(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const FIELDS = ["what", "question", "evidence", "appears", "grammar", "full", "partial", "degraded", "firstTouch"] as const;
const BANNED = /support trade decisions|more reliable|actionable|institutional|buy (the )?dips|sell (the )?rallies|powerful|favou?rs (buyers|sellers)|magnet|early (reversal )?warning|\btends? to\b|\boften\b|\blikely\b|will (bounce|reverse|hold|continue|break)|high[- ]probability|wait or reduce|trust the|running out of fuel|draws price back|dealer hedging damp/i;

function complete(id: string) {
  const e = educationFor(id) as unknown as Record<string, string> | null;
  expect(e, id).toBeTruthy();
  for (const f of FIELDS) expect(String(e![f] ?? "").trim().length, `${id}.${f}`).toBeGreaterThan(5);
}

describe("drawing tools (Sheriff #14)", () => {
  const union = read("src/types/chart.ts");
  const m = /export type DrawingTool =([\s\S]*?);/.exec(union);
  const ids = [...m![1].matchAll(/"([a-z0-9-]+)"/g)].map(x => x[1]);
  it("every DrawingTool id has a complete record (incl. Long / Short Position)", () => {
    expect(ids.length).toBeGreaterThan(60);
    for (const id of ids) complete(drawingEducationId(id));
    expect(Object.keys(DRAWING_EDUCATION).sort()).toEqual([...new Set(ids)].sort());
    expect(DRAWING_EDUCATION["long-position"].canon).toMatch(/Risk on Price/);
  });
  it("the panel rows and the rail open the shared preview; the rail names carry the record", () => {
    const panel = read("src/components/chart/DrawingToolsPanel.tsx");
    expect(panel).toMatch(/<InventionInfoButton scope="draw" id=\{drawingEducationId\(tool\.id\)\}/);
    expect(panel).toMatch(/<InventionPreview scope="draw"/);
    const rail = read("src/components/chart/LeftDrawingSidebar.tsx");
    expect(rail).toMatch(/aria-label=\{`\$\{it\.label\} — \$\{DRAWING_EDUCATION\[it\.id\]\?\.what/);
    expect(rail).toMatch(/<InventionInfoButton scope="rail" id=\{drawingEducationId\(activeTool\)\}/);
  });
  it("a drawn tool's verdict names the trader's input, never a market state", () => {
    expect(educationTruthLines({ id: drawingEducationId("long-position") }).verdict).toBe("NEEDS YOUR INPUT");
  });
});

describe("views, loadouts, Replay (Sheriff #2, #15)", () => {
  it("every View tab has a record and the Views sheet opens it", () => {
    for (const tab of ALL_CATEGORY_TABS) complete(viewEducationId(tab));
    expect(Object.keys(VIEW_EDUCATION).sort()).toEqual([...ALL_CATEGORY_TABS].sort());
    const dash = read("src/components/chart/ChartsDashboard.tsx");
    expect(dash).toMatch(/<InventionInfoButton scope="view" id=\{viewEducationId\(tab\)\}/);
    expect(dash).toMatch(/<InventionPreview scope="view"/);
  });
  it("every loadout has a record and its chip opens it", () => {
    for (const l of CAMERA_LOADOUTS) complete(loadoutEducationId(l.id));
    expect(Object.keys(LOADOUT_EDUCATION).sort()).toEqual(CAMERA_LOADOUTS.map(l => l.id).sort());
    expect(educationTruthLines({ id: loadoutEducationId("SCALP") }).verdict).toBe("NEEDS OTHER LAYERS");
    const door = read("src/components/os/SavedLayoutsDoor.tsx");
    expect(door).toMatch(/<InventionInfoButton scope="loadout" id=\{loadoutEducationId\(l\.id\)\}/);
  });
  it("Replay has a record and the Workspace menu item opens it", () => {
    complete(REPLAY_EDUCATION_ID);
    expect(educationFor(REPLAY_EDUCATION_ID)!.grammar).toMatch(/as of the cursor/);
    const tb = read("src/components/chart/ChartToolbar.tsx");
    expect(tb).toMatch(/<InventionInfoButton scope="tb" id=\{REPLAY_EDUCATION_ID\}/);
  });
});

describe("Smart Money cards (cert §15a)", () => {
  const src = read("src/components/smart-money/SmartMoneyPanel.tsx");
  const gen = src.slice(src.indexOf("function generateSignals"), src.indexOf("const SECTIONS"));
  const names = new Set<string>();
  for (const m of gen.matchAll(/\bname:\s*"([^"]+)"/g)) names.add(m[1]);
  for (const m of gen.matchAll(/\bname:\s*bullBias\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g)) { names.add(m[1]); names.add(m[2]); }
  it("every card the panel can generate has a complete record", () => {
    expect(names.size).toBeGreaterThanOrEqual(29);
    for (const n of names) complete(smartMoneyEducationId(n));
    expect(Object.keys(SMART_MONEY_EDUCATION).sort()).toEqual([...names].sort());
  });
  it("tape cards need a sided tape and say so; unmeasured cards never claim a reading", () => {
    expect(SMART_MONEY_EDUCATION["Order Flow Imbalance"].needs).toBe("SIDED_TAPE");
    expect(educationTruthLines({ id: smartMoneyEducationId("CVD (Cumulative Volume Delta)"), symbol: "EURUSD" }).verdict).toBe("UNAVAILABLE HERE");
    expect(SMART_MONEY_EDUCATION["Spoofing Detection"].what).toMatch(/not measured/);
    expect(SMART_MONEY_EDUCATION["Entry Signal"].needs).toBe("YOUR_PLAN");
  });
  it("the panel rows open the shared preview", () => {
    expect(src).toMatch(/<InventionInfoButton scope="sm" id=\{smartMoneyEducationId\(sig\.name\)\}/);
    expect(src).toMatch(/<InventionPreview scope="sm"/);
  });
});

describe("footprint '?' → registry; bar selection first touch (§15b)", () => {
  it("FootprintControls opens the FP_<mode> record, not the old boilerplate", () => {
    const fp = read("src/components/chart/FootprintControls.tsx");
    expect(fp).not.toMatch(/getIndicatorInfo/);
    expect(fp).toMatch(/<InventionInfoButton scope="fp" id=\{eduId\}/);
    expect(fp).toMatch(/<InventionPreview scope="fp" id=\{eduId\}/);
  });
  it("a bar selected by the wisdom line / keel / effort mark resolves to a first-touch line", () => {
    expect(educationIdForSelection({ kind: "BAR" })).toBe(BAR_SELECTION_EDUCATION_ID);
    complete(BAR_SELECTION_EDUCATION_ID);
    expect(firstTouchFor(BAR_SELECTION_EDUCATION_ID)).toMatch(/Selected bar/);
    const dash = read("src/components/chart/ChartsDashboard.tsx");
    expect(dash).toMatch(/\{ kind: "BAR" as const \}/);
    expect(dash).toMatch(/setWordSelectedBar\(bar\.time\)/);
  });
});

describe("no advice or prediction in the surface records", () => {
  it("every surface record passes the banned-phrase scan", () => {
    const all = ([
      ...Object.values(SMART_MONEY_EDUCATION), ...Object.values(SMART_MONEY_CARD_EDUCATION), ...Object.values(DRAWING_EDUCATION), ...Object.values(VIEW_EDUCATION), ...Object.values(LOADOUT_EDUCATION),
      educationFor(REPLAY_EDUCATION_ID), educationFor(BAR_SELECTION_EDUCATION_ID),
    ] as unknown[]) as Record<string, unknown>[];
    const hits: string[] = [];
    for (const rec of all) for (const [f, v] of Object.entries(rec)) {
      if (f === "canon" || typeof v !== "string") continue;
      if (BANNED.test(v)) hits.push(`${String(rec.what).slice(0, 40)}.${f}: ${v.match(BANNED)?.[0]}`);
    }
    expect(hits).toEqual([]);
  });
  it("Expected Envelope reads as historical reach by time of day, not a forecast", () => {
    const e = educationFor("EXPECTED_ENVELOPE")!;
    expect(e.appears).toMatch(/HISTORICAL reach/);
    expect(e.appears).toMatch(/BY TIME OF DAY/);
    expect(e.firstTouch).toMatch(/not a forecast/);
  });
});

describe("the Smart Money top cards each carry a complete ⓘ record (sheriff 2026-10-08)", () => {
  const CARDS = ["Delta Domination", "Tape Pressure", "WM Delta Bubbles", "CLC Rule", "WM Playbook"];
  it("five cards, every field filled, reachable through educationFor", () => {
    expect(Object.keys(SMART_MONEY_CARD_EDUCATION).sort()).toEqual([...CARDS].sort());
    for (const c of CARDS) complete(smartMoneyCardEducationId(c));
  });
  it("the panel wires all five", () => {
    const panel = read("src/components/smart-money/SmartMoneyPanel.tsx");
    for (const c of CARDS) expect(panel, c).toContain(`<CardInfo card="${c}"`);
  });
});

describe("the preview fits its host and names its own action (serving 6350c69, 2026-10-09)", () => {
  const info = read("src/components/chart/InventionInfo.tsx");
  it("the preview is never taller than the glass: capped, scrolling inside itself", () => {
    expect(info).toMatch(/sm:max-h-\[min\(70vh,560px\)\] sm:overflow-y-auto/);
  });
  it("a View opens, a loadout applies, Replay starts — none says 'Add to chart'; a Smart Money card has no button", () => {
    expect(read("src/components/chart/ChartsDashboard.tsx")).toMatch(/action=\{\{ add: "Open this view"/);
    expect(read("src/components/os/SavedLayoutsDoor.tsx")).toMatch(/action=\{\{ add: "Apply this loadout"/);
    expect(read("src/components/chart/ChartToolbar.tsx")).toMatch(/action=\{\{ add: "Start replay"/);
    const sm = read("src/components/smart-money/SmartMoneyPanel.tsx");
    expect(sm.match(/<InventionPreview scope="sm"[\s\S]*?\/>/g)!.every(x => /action=\{null\}/.test(x))).toBe(true);
    expect(info).toMatch(/action === null \? null/);
  });
  it("the Draw sheet's record sits in the flow, not over the tools", () => {
    expect(read("src/components/chart/LeftDrawingSidebar.tsx")).toMatch(/\? \{ flexBasis: "100%", width: "100%" \}/);
  });
  it("Smart Money cards read the panel's own tape state; a volume record on a volume market can draw", () => {
    expect(read("src/components/smart-money/SmartMoneyPanel.tsx")).toMatch(/truth=\{smTruth\(sig\.name\)\}/);
    expect(educationTruthLines({ id: smartMoneyEducationId("VWAP"), symbol: "NQ1!" }).verdict).toBe("CAN DRAW HERE");
    expect(educationTruthLines({ id: smartMoneyEducationId("VWAP"), symbol: "EURUSD" }).verdict).toBe("UNAVAILABLE HERE");
    expect(educationTruthLines({ id: "IND:OBV", symbol: "NQ1!" }).verdict).toBe("CAN DRAW HERE");
  });
  it("the Replay record opens over the room, not inside the 210 px menu; the Draw ⓘ closes the style popover", () => {
    expect(read("src/components/chart/ChartToolbar.tsx")).toMatch(/data-testid="replay-edu-host" style=\{\{ position: "fixed", inset: 0/);
    expect(read("src/components/chart/LeftDrawingSidebar.tsx")).toMatch(/onToggle=\{\(\) => \{ setStyleOpen\(false\); setToolEdu/);
  });
  it("a footprint popover is pulled up so its bottom stays on the glass", () => {
    const fp = read("src/components/chart/FootprintControls.tsx");
    expect(fp).toMatch(/const over = pos\.top \+ h - \(window\.innerHeight - 8\)/);
    expect(fp).toMatch(/top: pos\.top - lift/);
  });
  it("the Workspace drawer's Replay door carries the Replay ⓘ", () => {
    const os = read("src/components/os/WMOperatingSystem.tsx");
    expect(os).toMatch(/item\.id === "bar-replay" \? <ReplayDoorInfo \/>/);
    expect(os).toMatch(/<InventionInfoButton scope="door" id=\{REPLAY_EDUCATION_ID\}/);
  });
});

describe("bar-selection first touch has a carrier at every width; Replay copy carries no receipt words", () => {
  it("the in-Inspect line shows at every width for every selection kind, once per kind", () => {
    const ft = read("src/components/chart/SelectionFirstTouch.tsx");
    const fn = ft.slice(ft.indexOf("export function InspectFirstTouchLine"), ft.indexOf("export function SelectionFirstTouch("));
    // No phone-only class and no per-kind exception left.
    expect(fn).not.toMatch(/max-sm:block|hidden/);
    expect(fn).not.toMatch(/BAR_SELECTION/);
    expect(fn).toMatch(/className="block mt-1/);
    // First touch only: remembered per kind through the card's own key, never under a proof scene.
    expect(fn).toMatch(/readLearned\(id\)/);
    expect(fn).toMatch(/proofSceneHoldsWrites\(\)\) return;/);
    expect(fn).toMatch(/localStorage\.setItem\(learnedKey\(id\), "1"\)/);
    expect(fn).toMatch(/if \(!ctx \|\| !edu \|\| learned\) return null;/);
  });
  it("the Replay record names no internal receipt", () => {
    const r = educationFor(REPLAY_EDUCATION_ID) as unknown as Record<string, string>;
    for (const v of Object.values(r)) expect(v).not.toMatch(/LEAK:|receipts? [A-Z_]+:/);
  });
});

describe("options ⓘ truth line reads the pressure owner's chain scope (§20)", () => {
  const ready = { availability: "READY" as const, availabilityNote: "ready to draw from the bars on screen", stateWords: "" };
  const subset = { kind: "NEAR_MONEY_SUBSET" as const, contracts: 40, reachPct: 3 };
  it("a near-money subset is stated in the owner's words and capped below the top grade", () => {
    for (const id of ["BRICK_WALLS", "DERIVATIVES_PRESSURE"] as const) {
      const t = educationTruthLines({ entry: { ...ready, id }, chainScope: subset });
      expect(t.verdict, id).toBe("PARTIAL · NEAR-PRICE CHAIN ONLY");
      expect(t.lines.join(" "), id).toContain("NEAR-PRICE OPEN INTEREST · 40 CONTRACTS · ±3%");
      expect(t.lines.join(" "), id).toContain("ZERO-GAMMA · WITHHELD");
      expect(t.gradeCap, id).toBe("PARTIAL");
    }
  });
  it("a whole chain can draw with no cap; no chain still names the dependency", () => {
    const whole = educationTruthLines({ entry: { ...ready, id: "BRICK_WALLS" }, chainScope: { kind: "WHOLE" } });
    expect(whole.verdict).toBe("CAN DRAW HERE");
    expect(whole.gradeCap).toBeUndefined();
    expect(educationTruthLines({ entry: { ...ready, id: "BRICK_WALLS" } }).verdict).toBe("NEEDS AN OPTIONS CHAIN");
  });
  it("a non-options tool ignores the scope; the menus and the preview carry it", () => {
    expect(educationTruthLines({ entry: { ...ready, id: "SESSION" }, chainScope: subset }).verdict).toBe("CAN DRAW HERE");
    expect(read("src/components/chart/ProfilesMenu.tsx")).toMatch(/educationTruthLines\(\{ entry, feed, chainScope \}\)/);
    expect(read("src/components/chart/ToolFinder.tsx")).toMatch(/educationTruthLines\(\{ entry: e, feed, chainScope \}\)/);
    expect(read("src/components/chart/ChartsDashboard.tsx").match(/chainScope=\{optionsChainScope\}/g)!.length).toBe(6);
    expect(read("src/components/chart/InventionInfo.tsx")).toMatch(/data-testid="edu-grade-cap"/);
  });
});

describe("the chain scope is known whenever ANY options-reading layer is on, and never computed when all are off", () => {
  const dash = read("src/components/chart/ChartsDashboard.tsx");
  it("one gate (Derivatives Pressure — which carries the zero-gamma front — or Brick Walls) feeds the pressure VM the ⓘ reads", () => {
    expect(dash).toMatch(/const pressureEvidenceOn = derivativesPressureOn \|\| brickWallsOn;/);
    // The VM returns null — no selector call — unless that gate is on.
    expect(dash).toMatch(/if \(!pressureEvidenceOn \|\| !derivativesReceipt \|\| derivativesReceipt\.symbol !== symbol\) return null;/);
    expect(dash).toMatch(/const optionsChainScope = derivativesPressureVM\?\.drawn \? derivativesPressureVM\.chainScope : null;/);
  });
});

describe("a first-touch line never opens by repeating its own label (serving 7f2ca59)", () => {
  it("drops the label when the sentence already begins with it — case, punctuation and plural aside", () => {
    expect(composeFirstTouch("Supply / demand zone", "Supply / demand zone — where price left fast; …").text).toBe("Supply / demand zone — where price left fast; …");
    expect(composeFirstTouch("Brick Walls", "Brick wall — a strike with large open interest").label).toBeNull();
    expect(composeFirstTouch("Candle", "Selected bar — the candle …").text).toBe("Candle · Selected bar — the candle …");
    expect(firstTouchRepeatsLabel("Big Trades", "Big trade — an unusually large print")).toBe(true);
    expect(firstTouchRepeatsLabel("Session Profile", "This session's volume profile")).toBe(false);
  });
  it("walks EVERY record with a first touch: the composed line never repeats its opening words", () => {
    const menu = selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: {} });
    const labels = new Map<string, string>(menu.entries.map(e => [e.id as string, e.label]));
    const fp = read("src/components/chart/FootprintControls.tsx");
    for (const m of fp.matchAll(/\{ id: "([a-z-]+)",\s*label: "([^"]+)"/g)) labels.set(`FP_${m[1]}`, m[2]);
    labels.set("FVG_IMBALANCE", "FVG / Imbalance"); labels.set("F11A", "Supply / demand zone"); labels.set("FP_big-trades", "Big Trades"); labels.set("BAR_SELECTION", "Candle");
    const ids = [...Object.keys(INVENTION_EDUCATION), ...Object.keys(INSTRUMENT_EDUCATION), ...Object.keys(CONCEPT_EDUCATION), "BAR_SELECTION", "REPLAY"];
    const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).map(w => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
    const doubled: string[] = [];
    for (const id of ids) {
      for (const objectId of [null, "ZONE:x:DEMAND"]) {
        const sentence = firstTouchFor(id, objectId);
        if (!sentence) continue;
        // Its menu label where one exists; otherwise the worst case — the sentence's own opening phrase as the label.
        const label = labels.get(id) ?? sentence.split("—")[0].trim();
        const line = composeFirstTouch(label, sentence);
        const l = norm(label), t = norm(line.text);
        if (l.length && l.every((w, i) => t[i] === w) && l.every((w, i) => t[l.length + i] === w)) doubled.push(`${id}: ${line.text.slice(0, 70)}`);
      }
    }
    expect(doubled).toEqual([]);
  });
  it("both carriers and the aria-label print the composed line", () => {
    const ft = read("src/components/chart/SelectionFirstTouch.tsx");
    expect(ft.match(/composeFirstTouch\(/g)!.length).toBeGreaterThanOrEqual(4);
    // The desktop card's heading obeys the same rule (it read the label twice, one line apart).
    expect(ft).toMatch(/composeFirstTouch\(label, firstTouchFor\(id, objectId\) \?\? ""\)\.label \? \(\s*<div className="text-\[12\.5px\] font-bold/);
    expect(ft).not.toMatch(/aria-label=\{`\$\{label\}: /);
  });
});
