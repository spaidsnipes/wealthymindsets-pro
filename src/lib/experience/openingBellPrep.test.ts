import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  selectPrepEvidence,
  PREP_VERDICT_WITHHELD,
  type PrepEvidenceInput,
} from "./openingBellPrep";
import { DEFAULT_PREPARATION_TEMPLATE } from "@/lib/traderMemory/viewModels/selectOpeningBell";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/**
 * Source with comments removed.
 *
 * A fix that explains itself has to NAME the thing it removed, and a Sentinel
 * that greps the raw file then fails on that explanation is testing the wrong
 * surface. This codebase has learned that four times now; the cure is cheap.
 */
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const PRESENT = (done: number, total: number): PrepEvidenceInput => ({
  readState: "PRESENT",
  checklistDone: done,
  checklistTotal: total,
});

describe("openingBellPrep — what the deck may say about your morning", () => {
  it("OBSERVED: reports the real count, as a count and not a verdict", () => {
    const e = selectPrepEvidence(PRESENT(7, 11));
    expect(e.kind).toBe("OBSERVED");
    expect(e.done).toBe(7);
    expect(e.total).toBe(11);
    expect(e.sentence).toBe("You checked 7 of 11 items on your own prep list this morning.");
  });

  it("H1: an UNREADABLE store yields null counts, never 0", () => {
    const e = selectPrepEvidence({ readState: "UNAVAILABLE", checklistDone: 0, checklistTotal: 0 });
    expect(e.kind).toBe("UNREADABLE");
    expect(e.done).toBeNull();
    expect(e.total).toBeNull();
    // The whole defect in one assertion: unreadable must not read as failure.
    expect(e.sentence).not.toMatch(/incomplete|not ready|rushing|failure/i);
    expect(e.sentence).toContain("could not be read");
  });

  it("H1: a missing input is UNREADABLE, not an empty checklist", () => {
    for (const bad of [null, undefined]) {
      const e = selectPrepEvidence(bad);
      expect(e.kind).toBe("UNREADABLE");
      expect(e.done).toBeNull();
    }
  });

  it("ABSENT is a finding and is said plainly — no accusation", () => {
    const e = selectPrepEvidence({ readState: "ABSENT", checklistDone: 0, checklistTotal: 0 });
    expect(e.kind).toBe("NO_PREP_TODAY");
    expect(e.done).toBeNull();
    expect(e.sentence).toBe("No morning prep was logged in WM today.");
    expect(e.sentence).not.toMatch(/incomplete|failure|rushing/i);
  });

  it("ABSENT and UNREADABLE are never collapsed into the same sentence", () => {
    const absent = selectPrepEvidence({ readState: "ABSENT", checklistDone: 0, checklistTotal: 0 });
    const unread = selectPrepEvidence({ readState: "UNAVAILABLE", checklistDone: 0, checklistTotal: 0 });
    expect(absent.kind).not.toBe(unread.kind);
    expect(absent.sentence).not.toBe(unread.sentence);
  });

  it("an entry with no checklist is a different shape of prep, not a zero score", () => {
    const e = selectPrepEvidence(PRESENT(0, 0));
    expect(e.kind).toBe("OBSERVED");
    expect(e.sentence).toBe("Morning prep was logged today with no checklist items on it.");
    expect(e.sentence).not.toContain("0 of 0");
  });

  it("singular/plural reads like English", () => {
    expect(selectPrepEvidence(PRESENT(1, 1)).sentence).toContain("1 of 1 item on");
    expect(selectPrepEvidence(PRESENT(0, 2)).sentence).toContain("0 of 2 items on");
  });

  it("nonsense counts cannot manufacture a number bigger than the list", () => {
    const e = selectPrepEvidence(PRESENT(99, 5));
    expect(e.done).toBe(5);
    expect(e.total).toBe(5);
    const neg = selectPrepEvidence(PRESENT(-4, 3));
    expect(neg.done).toBe(0);
  });

  it("NO SCORE: nothing in the output is a readiness grade", () => {
    for (const e of [selectPrepEvidence(PRESENT(7, 11)), selectPrepEvidence(null)]) {
      expect(e).not.toHaveProperty("verdict");
      expect(e).not.toHaveProperty("score");
      expect(e).not.toHaveProperty("percent");
      expect(e.sentence).not.toMatch(/\bREADY\b|\bNOT READY\b/);
    }
  });

  it("the withheld-verdict sentence explains itself, and blames the model not the trader", () => {
    expect(PREP_VERDICT_WITHHELD).toContain("Morning Prep");
    expect(PREP_VERDICT_WITHHELD).toContain("cannot tell");
    expect(PREP_VERDICT_WITHHELD).not.toMatch(/incomplete|failure|rushing/i);
  });

  // ---- DEFECT Sentinels: the refusal must not outlive the reason for it ----

  it("THE DEFECT: the deck template and /morning-prep still share NO vocabulary", () => {
    // This is the entire justification for withholding a verdict. If someone
    // ever unifies the two lists, the count CAN be mapped onto named items and
    // a real verdict becomes earnable — at which point this test fails and the
    // refusal gets re-examined instead of being inherited forever.
    const prepPage = read("src/app/morning-prep/page.tsx");
    const starter = /const STARTER_CHECKLIST = \[([\s\S]*?)\];/.exec(prepPage)?.[1] ?? "";
    expect(starter.length).toBeGreaterThan(0);
    // Tested as a TOKEN, not a substring. The id `catalysts` does occur inside
    // the free-text "News / catalysts reviewed" — and that near-miss is exactly
    // the hazard: the two lists share English words while sharing no vocabulary
    // a machine can join on. A substring match would read that collision as an
    // alignment and quietly license the mapping this module refuses to invent.
    for (const t of DEFAULT_PREPARATION_TEMPLATE) {
      expect(starter).not.toContain(`"${t.id}"`);
      expect(starter).not.toContain(`'${t.id}'`);
    }
    // And the trader can still edit that list, so even a manual alignment
    // would not survive contact with a user.
    expect(prepPage).toContain("Add a checklist item");
  });

  it("THE DEFECT: morning-prep checklist items still carry no template id", () => {
    const storage = read("src/lib/traderMemory/morningPrepStorage.ts");
    const shape = /export interface MorningPrepChecklistItem \{([\s\S]*?)\}/.exec(storage)?.[1] ?? "";
    expect(shape).toContain("text");
    // No `category`, no `templateId` — nothing that could tie a tick to a row.
    expect(shape).not.toContain("category");
    expect(shape).not.toContain("templateId");
  });

  it("THE SURFACE: /command-deck no longer fabricates completed: false", () => {
    const deck = codeOnly(read("src/app/command-deck/page.tsx"));
    // The exact fabrication that produced a behavioural accusation from nothing.
    expect(deck).not.toMatch(/completed:\s*false/);
    expect(deck).toContain("selectPrepEvidence");
    expect(deck).toContain("OpeningBellEvidence");
  });

  it("THE SECOND SURFACE: /morning-prep fabricates neither a NOT DONE nor a DONE", () => {
    const page = codeOnly(read("src/app/morning-prep/page.tsx"));
    // Six items hardcoded incomplete — the accusation, same as the deck had.
    expect(page).not.toMatch(/completed:\s*false/);
    // And the worse half: two items marked DONE, stamped with a completion time
    // of `nowMs`, because the trader had ANY entry ever. A false DONE is a
    // record of something the trader never did, wearing a timestamp.
    expect(page).not.toMatch(/completedAt:/);
    expect(page).not.toContain("hasTodayEntry");
    expect(page).toContain("selectPrepEvidence");
    expect(page).toContain("OpeningBellEvidence");
  });

  /**
   * FOUND BY STANDING IN THE ROOM, not by reading the diff.
   *
   * /command-deck rendered the Opening Bell as:
   *
   *     {chainVm && phase === "PREPARATION" && <OpeningBellSlot ... />}
   *
   * `chainVm` is null whenever canonical market state has not resolved. So on
   * a morning where the deck reads MARKET STATE UNKNOWN — observed live on
   * production — the whole panel was absent, and the trader was told nothing
   * about THEIR OWN PREP because the MARKET was unreadable.
   *
   * The prep evidence is compiled from the trader's journal via useTodayPrep.
   * It never consults the tape. And an unresolved market is exactly when the
   * PREPARATION phase matters most, so the panel disappeared precisely when it
   * was most useful. That is H1 in structural form: an unobserved market
   * silenced an unrelated, observable fact about the person.
   */
  it("prep evidence is not gated behind market-state resolution", () => {
    const deck = codeOnly(read("src/app/command-deck/page.tsx"));
    expect(deck).toContain("OpeningBellSlot");
    expect(deck).not.toMatch(/chainVm && phase === "PREPARATION"/);
    expect(deck).not.toMatch(/phase === "PREPARATION" && chainVm/);
  });

  it("ONE VOICE: both rooms read the same adapter, so they cannot disagree", () => {
    for (const rel of ["src/app/command-deck/page.tsx", "src/app/morning-prep/page.tsx"]) {
      expect(codeOnly(read(rel))).toContain("useTodayPrep");
    }
  });

  it("THE WORDING IS NOT FORKABLE: only the shared component renders the refusal", () => {
    const shared = read("src/components/opening-bell/OpeningBellEvidence.tsx");
    expect(shared).toContain("PREP_VERDICT_WITHHELD");
    // If a surface ever inlines the constant again it has forked the wording,
    // and the fix can then rot on one screen while looking healthy on the other.
    for (const rel of ["src/app/command-deck/page.tsx", "src/app/morning-prep/page.tsx"]) {
      expect(codeOnly(read(rel))).not.toContain("PREP_VERDICT_WITHHELD");
    }
  });
});
