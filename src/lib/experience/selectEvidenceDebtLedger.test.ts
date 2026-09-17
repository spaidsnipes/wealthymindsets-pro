/**
 * A WARN NODE MAY NEVER READ AS PAID.
 */

import { describe, expect, it } from "vitest";

import { selectEvidenceDebtLedger } from "./selectEvidenceDebtLedger";
import type { EvidenceDebt } from "../marketData/viewModels/decisionPermissionCompiler";

function debt(p: Partial<EvidenceDebt>): EvidenceDebt {
  return {
    payable: 0,
    watch: 0,
    resolved: 0,
    missing: 0,
    warn: 0,
    missingLabels: [],
    warnLabels: [],
    ...p,
  };
}

describe("selectEvidenceDebtLedger", () => {
  it("draws nothing without a ledger", () => {
    expect(selectEvidenceDebtLedger(null)).toBeNull();
    expect(selectEvidenceDebtLedger(undefined)).toBeNull();
  });

  it("draws nothing when there is nothing to pay", () => {
    // `payable === 0` means no node carries a gradeable indicator. A full strip
    // under "evidence paid" would say the opposite of that.
    expect(selectEvidenceDebtLedger(debt({ payable: 0, watch: 4 }))).toBeNull();
  });

  it("makes one mark per payable node", () => {
    const l = selectEvidenceDebtLedger(debt({ payable: 8, resolved: 5, warn: 1, missing: 2 }))!;
    expect(l.marks).toHaveLength(8);
    expect(l.payable).toBe(8);
    expect(l.resolved).toBe(5);
    expect(l.unpaid).toBe(3);
  });

  it("counts a WARN node as UNPAID — the 2026-09-16 defect", () => {
    // Evidence present but below confirmation is not evidence paid. The deck
    // once rendered "0 of 9 paid" two lines above "8 evidence nodes unpaid";
    // the ninth node was in the denominator and in no numerator.
    const l = selectEvidenceDebtLedger(debt({ payable: 3, resolved: 0, warn: 3, missing: 0 }))!;
    expect(l.resolved).toBe(0);
    expect(l.unpaid).toBe(3);
    expect(l.marks.every((m) => m.paid === false)).toBe(true);
    expect(l.marks.every((m) => m.standing === "WARN")).toBe(true);
  });

  it("keeps WARN and MISSING as separate populations", () => {
    // An unknown and a contested reading are different debts. A surface that
    // could not tell them apart would report a live warning as mere silence.
    const l = selectEvidenceDebtLedger(debt({ payable: 4, resolved: 1, warn: 1, missing: 2 }))!;
    expect(l.marks.map((m) => m.standing)).toEqual([
      "RESOLVED",
      "WARN",
      "MISSING",
      "MISSING",
    ]);
  });

  it("leads with what is settled", () => {
    const l = selectEvidenceDebtLedger(debt({ payable: 5, resolved: 2, warn: 0, missing: 3 }))!;
    expect(l.marks.slice(0, 2).every((m) => m.paid)).toBe(true);
    expect(l.marks.slice(2).every((m) => !m.paid)).toBe(true);
  });

  it("REFUSES to draw a ledger whose numbers disagree", () => {
    // Refusal 1. Drawing the reconcilable part would hide the gap inside a
    // shape, where no reader can subtract it back out. This is the shape of
    // the original defect, so it must fail loudly rather than render.
    expect(selectEvidenceDebtLedger(debt({ payable: 9, resolved: 0, warn: 0, missing: 8 }))).toBeNull();
    expect(selectEvidenceDebtLedger(debt({ payable: 3, resolved: 2, warn: 2, missing: 0 }))).toBeNull();
  });

  it("refuses a negative count rather than inventing a shape for it", () => {
    expect(selectEvidenceDebtLedger(debt({ payable: 1, resolved: -1, warn: 2, missing: 0 }))).toBeNull();
  });

  it("carries WATCH through without drawing it", () => {
    // Refusal 4 — outside the ledger by design, but an unexplained gap between
    // two counts is how the original defect stayed invisible.
    const l = selectEvidenceDebtLedger(debt({ payable: 8, resolved: 8, watch: 1 }))!;
    expect(l.watch).toBe(1);
    expect(l.marks).toHaveLength(8); // NOT 9
  });

  it("lets a fully paid ledger actually reach full", () => {
    // The WATCH-in-the-denominator defect made `resolved === total`
    // unreachable for any chain holding a watch node — dead code on exactly
    // the chains closest to complete.
    const l = selectEvidenceDebtLedger(debt({ payable: 6, resolved: 6, watch: 3 }))!;
    expect(l.resolved).toBe(l.payable);
    expect(l.unpaid).toBe(0);
    expect(l.marks.every((m) => m.paid)).toBe(true);
  });

  it("carries no percentage and no score", () => {
    // §15 — 62% of an evidence node cannot be produced.
    const l = selectEvidenceDebtLedger(debt({ payable: 8, resolved: 5, warn: 1, missing: 2 }))!;
    expect(Object.keys(l).sort()).toEqual(
      ["marks", "missing", "payable", "resolved", "unpaid", "warn", "watch"],
    );
  });

  it("has marks and counts that always agree", () => {
    const l = selectEvidenceDebtLedger(debt({ payable: 7, resolved: 3, warn: 2, missing: 2 }))!;
    expect(l.marks).toHaveLength(l.payable);
    expect(l.resolved + l.warn + l.missing).toBe(l.payable);
    expect(l.marks.filter((m) => m.paid)).toHaveLength(l.resolved);
    expect(l.marks.filter((m) => m.standing === "WARN")).toHaveLength(l.warn);
    expect(l.marks.filter((m) => m.standing === "MISSING")).toHaveLength(l.missing);
  });
});
