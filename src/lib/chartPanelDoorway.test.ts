import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A MOUNTED PANEL MUST HAVE A DOOR.
 *
 * ChartsDashboard gates every overlay behind a boolean it owns:
 *
 *   const [tradeOpen, setTradeOpen] = useState(false);
 *   ...
 *   {tradeOpen && <AlpacaTradingPanel onClose={() => setTradeOpen(false)} />}
 *
 * The pattern has a silent failure mode. If the control that called
 * `setTradeOpen(true)` is deleted or re-pointed, nothing breaks: the file
 * compiles, the import is still used, the tests still pass, and the panel
 * simply never renders again. The component is fully built, fully wired to its
 * data, and unreachable — the most expensive kind of dead code, because it does
 * not look dead.
 *
 * That is exactly what happened. Commit b08f818 (2026-09-01, "unify broker
 * wires and truthful Webull readiness") re-pointed the toolbar's `onPnL` prop
 * from `setTradeOpen(true)` to `setBrokerOpen(true)`. The rename to
 * `onConnectBrokers` that followed is honest — the button says connect brokers
 * and it connects brokers. But the order ticket it used to open was left
 * mounted with no remaining caller.
 *
 * This matters more than a normal orphan. BUILD ORDER §14.6 says a degraded
 * dependency may never block the exit. AlpacaTradingPanel *is* the exit — the
 * SELL ticket. An exit with no door is the strongest possible version of a
 * blocked exit, and no amount of work inside the panel can be observed by a
 * trader who cannot open it.
 *
 * This test does not edit the dashboard. It reads it, derives the orphan set
 * mechanically, and pins it. It fails in BOTH directions on purpose:
 *   - a NEW orphan appears  → the set grew, someone is about to ship dead UI;
 *   - a KNOWN orphan is wired or deleted → the set shrank, update this list
 *     and delete the entry from the ledger below.
 */

const DASHBOARD_PATH = "src/components/chart/ChartsDashboard.tsx";
const SOURCE = readFileSync(resolve(process.cwd(), DASHBOARD_PATH), "utf8");

/** Comments quote the defect; they must not satisfy a reachability check. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** `const [fooOpen, setFooOpen] = useState(false)` → { flag, setter }. */
function declaredBooleanPanelFlags(code: string): { flag: string; setter: string }[] {
  const re = /const\s*\[\s*(\w+)\s*,\s*(set\w+)\s*\]\s*=\s*useState(?:<boolean>)?\(\s*false\s*\)/g;
  const out: { flag: string; setter: string }[] = [];
  for (const m of code.matchAll(re)) out.push({ flag: m[1], setter: m[2] });
  return out;
}

/** Does `{flag && <Something` gate a render anywhere? */
function isMounted(code: string, flag: string): boolean {
  return new RegExp(`\\{\\s*${flag}\\s*&&`).test(code);
}

/**
 * Can it be opened?
 *
 * The rule is deliberately inverted: a call is an opener unless it provably is
 * not. `setX(false)` can only ever close. Everything else — `setX(true)`, a
 * functional toggle `setX(o => !o)`, or a value forwarded from a child
 * `onChange={(v) => setX(v)}` — can put the flag into the open state, so the
 * panel has a door somewhere. Guessing the other way around would flag every
 * child-owned control as dead UI and make the ledger below worthless.
 */
function hasOpener(code: string, setter: string): boolean {
  // Passed by reference to a child: `onFoo={setFooOpen}`.
  if (new RegExp(`=\\{\\s*${setter}\\s*\\}`).test(code)) return true;

  const calls = [...code.matchAll(new RegExp(`${setter}\\s*\\(([^)]*)\\)`, "g"))];
  return calls.some((m) => m[1].trim() !== "false");
}

function orphanedPanels(code: string): string[] {
  return declaredBooleanPanelFlags(code)
    .filter(({ flag, setter }) => isMounted(code, flag) && !hasOpener(code, setter))
    .map(({ flag }) => flag)
    .sort();
}

/**
 * NAMED BLOCKER LEDGER — the orphans that exist today.
 *
 * Recorded as the current state rather than skipped, following the §14.13
 * precedent in buildOrderInvariants.test.ts, so the gap stays visible and this
 * test flips the moment it changes.
 *
 * NOT fixed here on purpose: ChartsDashboard.tsx and ChartToolbar.tsx are held
 * by another thread this session. Reaching into a file another writer holds to
 * add a button would be a worse defect than the one being fixed. The repair is
 * one line in each case and belongs to whoever holds the lock.
 */
const KNOWN_ORPHANS = [
  // PnLStatsPanel — session P&L statistics. Imported, mounted, no caller.
  "pnlOpen",
  // AlpacaTradingPanel — the live order ticket, including SELL. Orphaned by
  // b08f818 on 2026-09-01. Repair: give the toolbar a Trade control that calls
  // setTradeOpen(true), or delete the mount and the panel if the live order
  // path is intentionally closed while the broker adapters are uncertified.
  // Either resolution is fine. Leaving it mounted-and-unreachable is not.
  "tradeOpen",
].sort();

/**
 * The detector is the thing being trusted here, so it is proven against
 * synthetic sources before it is pointed at the real file. A scanner that
 * silently matches nothing would report "no orphans" forever and read exactly
 * like a clean bill of health.
 */
describe("the orphan detector itself", () => {
  const closed = `
    const [aOpen, setAOpen] = useState(false);
    {aOpen && <APanel onClose={() => setAOpen(false)} />}
  `;
  const opened = `
    const [aOpen, setAOpen] = useState(false);
    <Bar onA={() => setAOpen(true)} />
    {aOpen && <APanel onClose={() => setAOpen(false)} />}
  `;

  it("reports a mounted panel whose only setter call closes it", () => {
    expect(orphanedPanels(closed)).toEqual(["aOpen"]);
  });

  it("stops reporting it the moment an opener exists", () => {
    expect(orphanedPanels(opened)).toEqual([]);
  });

  it("does not report a flag that is never mounted (plain state, not a panel)", () => {
    expect(orphanedPanels("const [busy, setBusy] = useState(false);")).toEqual([]);
  });

  it("accepts a door owned by a child, by callback or by reference", () => {
    const viaCallback = `
      const [aOpen, setAOpen] = useState(false);
      <Bar onChange={(v) => setAOpen(v)} />
      {aOpen && <APanel />}
    `;
    const viaReference = `
      const [aOpen, setAOpen] = useState(false);
      <Bar onOpen={setAOpen} />
      {aOpen && <APanel />}
    `;
    expect(orphanedPanels(viaCallback)).toEqual([]);
    expect(orphanedPanels(viaReference)).toEqual([]);
  });
});

describe("chart panels — a mounted panel must have a door", () => {
  it("finds the panel flags it is supposed to be checking", () => {
    // If the dashboard is refactored away from `useState(false)` panel flags,
    // every assertion below would pass vacuously. Fail loudly instead.
    const flags = declaredBooleanPanelFlags(CODE);
    expect(flags.length).toBeGreaterThan(4);
    expect(flags.map((f) => f.flag)).toContain("tradeOpen");
  });

  it("BLOCKER: exactly these panels are mounted but cannot be opened", () => {
    expect(orphanedPanels(CODE)).toEqual(KNOWN_ORPHANS);
  });

  it("BLOCKER: the SELL ticket is currently unreachable (§14.6 — the exit needs a door)", () => {
    // Spelled out separately from the set above because this one is not a
    // tidiness issue. AlpacaTradingPanel is where a trader closes a position.
    expect(CODE).toMatch(/\{\s*tradeOpen\s*&&/);
    expect(CODE).toContain("<AlpacaTradingPanel");
    expect(CODE).not.toMatch(/setTradeOpen\s*\(\s*true\s*\)/);
  });

  it("the panels that DO have doors are not falsely reported as orphans", () => {
    // Guards the detector itself. Each of these is opened by a different
    // mechanism, and the first draft of hasOpener() got gridView wrong — it
    // only recognised a literal `setX(true)` and reported a panel whose door is
    // a child callback as dead UI. If any of these shows up as an orphan, the
    // detector is broken and the blocker ledger means nothing.
    const orphans = orphanedPanels(CODE);
    expect(orphans).not.toContain("brokerOpen");      // toolbar onConnectBrokers
    expect(orphans).not.toContain("vpDomOpen");       // functional toggle
    expect(orphans).not.toContain("pineBuilderOpen"); // direct setX(true)
    expect(orphans).not.toContain("gridView");        // child forwards a value
  });
});
