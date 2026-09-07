import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const paperPage = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");

describe("paper recovery surface", () => {
  it("recompiles the scene when integrity alone becomes unsafe", () => {
    const sceneStart = paperPage.indexOf("const sceneInput = useMemo(");
    const sceneEnd = paperPage.indexOf("const sceneCompilation", sceneStart);
    expect(sceneStart).toBeGreaterThan(-1);
    expect(sceneEnd).toBeGreaterThan(sceneStart);
    const scene = paperPage.slice(sceneStart, sceneEnd);
    expect(scene).toContain("hydrated: hydrated && !bookRecoveryRequired");
    expect(scene).toMatch(/\[sessionToken, activeSymbol, hydrated, persistenceState, positions, orders, bookRecoveryRequired\]/);
  });

  it("withholds every subset claim and action while recovery protects stored bytes", () => {
    for (const text of [
      'v:bookRecoveryRequired ? "UNKNOWN" : updatedPositions.length',
      'v:bookRecoveryRequired ? "UNKNOWN" : pendingOrders.length',
      'v:bookRecoveryRequired ? "UNKNOWN" : trades.length',
      '"Orders · UNKNOWN"',
      '"Blotter · UNKNOWN"',
      "Order ledger unknown while paper book recovery is required.",
      "Blotter unknown while paper book recovery is required.",
      "OPTIONS BOOK UNKNOWN",
      "EQUITY HISTORY UNKNOWN",
      "RECOVER ORIGINAL BOOK TO RESTORE",
      'if (bookRecoveryRequired) return;',
    ]) {
      expect(paperPage).toContain(text);
    }
  });

  // -------------------------------------------------------------------------
  // THE EXIT.
  //
  // The barrier above is right and must stay. But as first shipped it withheld
  // every total, disabled every action, disabled Reset — and told the trader to
  // "recover the original book" when nothing in the product could do that. The
  // honest refusal had become a brick whose only real exit was devtools.
  //
  // These tests hold the barrier AND the door open at the same time. Either one
  // alone is a defect: no barrier is a capital lie, no door is a dead end.
  // -------------------------------------------------------------------------

  it("the destructive reset is gated on the EXIT, not on recovery alone", () => {
    // The regression this replaces: `disabled={bookRecoveryRequired}`. Correct
    // about the danger, but with no way to satisfy it the trader was stuck for
    // good. The gate must name the two-part condition.
    expect(paperPage).toContain("disabled={resetBlockedByRecovery}");
    expect(paperPage).toMatch(
      /const resetBlockedByRecovery = bookRecoveryRequired && !bookCopyTaken/,
    );
    expect(paperPage).toContain("if (bookRecoveryRequired && !bookCopyTaken) return;");
  });

  it("the screen provides the action its own words demand", () => {
    // The instruction and the affordance must ship together. A screen that says
    // "download the saved book" with no button is the original defect wearing
    // better prose.
    expect(paperPage).toContain("bookRecoveryExitNote");
    expect(paperPage).toContain("describePaperRecoveryExit");
    expect(paperPage).toContain("onClick={downloadPreservedBook}");
    expect(paperPage).toContain("readPreservedPaperBook()");
  });

  it("the copy is only claimed taken when bytes were actually handed over", () => {
    const start = paperPage.indexOf("const downloadPreservedBook");
    expect(start).toBeGreaterThan(-1);
    const body = paperPage.slice(start, paperPage.indexOf("const resetAccount", start));
    // The null guard must PRECEDE the claim. Reversed, an origin that cannot
    // read storage would unlock the destructive reset on an empty gesture.
    const guard = body.indexOf("if (raw === null) return;");
    const claim = body.indexOf("setBookCopyTaken(true)");
    expect(guard).toBeGreaterThan(-1);
    expect(claim).toBeGreaterThan(guard);
  });

  it("the deliberate discard keeps its own door — savePaperState is not relaxed", () => {
    // §24: two writers on purpose. If the general-purpose writer ever grows a
    // force flag, every bot tick and chart order can destroy an unreadable book
    // while all the barrier's words stay on screen.
    expect(paperPage).toContain("replacePreservedPaperBook(fresh)");
    expect(paperPage).not.toMatch(/savePaperState\([^)]*force/);
    // And the discard is reachable from the reset path only.
    expect(paperPage.match(/replacePreservedPaperBook\(/g)?.length).toBe(1);
  });

  it("the barrier comes down with the book it was protecting", () => {
    // Leaving integrity stale after a successful discard would keep the page
    // bricked over a file that no longer exists.
    const start = paperPage.indexOf("const resetAccount");
    const body = paperPage.slice(start, start + 4000);
    expect(body).toContain("setBookIntegrity(CLEAN_BOOK_INTEGRITY)");
    expect(body).toContain("setBookCopyTaken(false)");
  });

  it("the reset confirmation never quotes counts it just called UNKNOWN", () => {
    const start = paperPage.indexOf("const summary = bookRecoveryRequired");
    expect(start).toBeGreaterThan(-1);
    const recoveryBranch = paperPage.slice(start, paperPage.indexOf(": parts.length > 0", start));
    expect(recoveryBranch).toContain("does not know how many positions or trades");
    expect(recoveryBranch).not.toContain("${positionCount}");
    expect(recoveryBranch).not.toContain("${tradeCount}");
  });

  it("the session-scoped permission is never written into the unreadable store", () => {
    // A persisted `copyTaken` would live in the very bytes we declared
    // unreadable, and a stale `true` unlocks destruction for someone who never
    // saw the file.
    expect(paperPage).not.toMatch(/bookCopyTaken[^\n]*savePaperState/);
    expect(paperPage).not.toMatch(/copyTaken:\s*bookCopyTaken/);
  });
});
