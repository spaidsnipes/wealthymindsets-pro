/**
 * ONE OS · no room floors itself at the height of the screen.
 *
 * Two halves, deliberately separated — the same shape as osRoomPlane.test.ts:
 *
 *   1. The detector is tested against SYNTHETIC source, including the four
 *      lines that were live defects when this was written. A detector proven
 *      only against the current codebase is proven against a codebase that
 *      already passes.
 *
 *   2. The walk is over `OS_FRAMED_ROUTES`, the registry that OWNS which
 *      routes wear the frame — so promoting a route to `frame: "os"` pulls it
 *      into this gate in the same commit.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { findViewportFloors, VIEWPORT_HEIGHT_UNITS } from "./roomViewportFloor";
import { roomPageFile } from "./osRoomPlane";
import { OS_FRAMED_ROUTES } from "@/lib/routing/wmDestinations";

const REPO = resolve(__dirname, "../../..");

describe("roomViewportFloor · the detector", () => {
  /**
   * VERBATIM, from the four room pages at the moment this file was written.
   * Two spell the claim inline, two spell it as a Tailwind token — which is
   * precisely why a scan for one spelling would have reported the room clean.
   */
  it("catches all four spellings that were live defects", () => {
    const wasLive = [
      '<div data-testid="charts-suspense-plane" style={{ minHeight: "100vh", background: "transparent" }} />',
      '<div data-testid="deck-suspense-plane" style={{ minHeight: "100vh", background: "transparent" }} />',
      '<div className="min-h-screen" />',
      '<div className="min-h-screen" />',
    ];
    for (const line of wasLive) {
      expect(findViewportFloors(line)).toHaveLength(1);
    }
  });

  it("catches the repair as well as the defect — 100% and min-h-full are clean", () => {
    // The positive control for the assertion above: if the detector reported
    // everything, the line above would pass while proving nothing.
    expect(
      findViewportFloors('<div style={{ minHeight: "100%", background: "transparent" }} />'),
    ).toEqual([]);
    expect(findViewportFloors('<div className="min-h-full" />')).toEqual([]);
  });

  it("reads every viewport unit, not just vh", () => {
    // 100dvh is the same claim with a mobile-toolbar refinement. /nectar's
    // comment already names it as a promotion-breaker met and fixed there.
    for (const unit of VIEWPORT_HEIGHT_UNITS) {
      expect(findViewportFloors(`<div style={{ minHeight: "100${unit}" }} />`)).toHaveLength(1);
      expect(findViewportFloors(`<div className="h-[100${unit}]" />`)).toHaveLength(1);
    }
    // Control: a unit that is not a viewport unit is not this defect.
    expect(findViewportFloors('<div style={{ minHeight: "100rem" }} />')).toEqual([]);
    expect(findViewportFloors('<div className="h-[100px]" />')).toEqual([]);
  });

  it("catches a calc() that subtracts a hand-typed masthead height", () => {
    // Subtracting a magic number is a SECOND owner of the masthead's height.
    // It drifts the first time the masthead changes, and it drifts silently.
    expect(
      findViewportFloors('<div className="min-h-[calc(100vh-56px)]" />'),
    ).toHaveLength(1);
    expect(
      findViewportFloors('<div style={{ height: "calc(100dvh - 56px)" }} />'),
    ).toHaveLength(1);
  });

  /**
   * ── THE EXEMPTION THAT KEEPS THIS GATE OBEYED ─────────────────────────────
   *
   * A `fixed` element has left the room's flow. It is positioned against the
   * viewport, so the viewport is the honest thing for it to measure. A gate
   * that called every full-screen modal scrim a violation would teach the next
   * author to widen it, and then it protects nothing at all.
   */
  it("does NOT report a fixed element — it measures the screen on purpose", () => {
    expect(findViewportFloors('<div className="fixed inset-0 h-screen bg-black/60" />')).toEqual([]);
    expect(
      findViewportFloors('<div style={{ position: "fixed", height: "100vh" }} />'),
    ).toEqual([]);
    // Control: drop `fixed` and the identical element is an offence again.
    expect(findViewportFloors('<div className="inset-0 h-screen bg-black/60" />')).toHaveLength(1);
  });

  it("does NOT report a CEILING — max-h cannot create scroll", () => {
    expect(findViewportFloors('<div className="max-h-screen overflow-y-auto" />')).toEqual([]);
    expect(findViewportFloors('<div style={{ maxHeight: "100vh" }} />')).toEqual([]);
    // Control: the same element with a floor instead of a ceiling IS reported.
    expect(findViewportFloors('<div style={{ minHeight: "100vh" }} />')).toHaveLength(1);
  });

  it("does not read comments, in either direction", () => {
    // Every one of the four repairs wrote a comment quoting `100vh` — the
    // value it removed. A scan that reads comments reports the FIX as the
    // defect, and this shift has already lost time to exactly that.
    expect(findViewportFloors('/* was style={{ minHeight: "100vh" }} */')).toEqual([]);
    expect(findViewportFloors("  // `min-h-screen` is `100vh` by another name")).toEqual([]);
    // Control: the same text outside a comment is still an offence.
    expect(findViewportFloors('<div style={{ minHeight: "100vh" }} />')).toHaveLength(1);
  });

  it("fails closed when the claim is not on an element it can read", () => {
    // A bare constant is not an element. No tag text, no offence — the safe
    // direction, and stated so it is a decision rather than an accident.
    expect(findViewportFloors('const FULL = { minHeight: "100vh" };')).toEqual([]);
  });
});

describe("roomViewportFloor · every OS room fills the room it was given", () => {
  it("has rooms to check", () => {
    // Vacuity guard. If the registry ever returns [] every assertion below
    // passes by iterating nothing.
    expect(OS_FRAMED_ROUTES.length).toBeGreaterThanOrEqual(7);
  });

  it("finds no screen-height floor in any room the OS frame holds", () => {
    const report: string[] = [];
    for (const href of OS_FRAMED_ROUTES) {
      const file = roomPageFile(href);
      for (const o of findViewportFloors(readFileSync(resolve(REPO, file), "utf8"))) {
        report.push(`${file}: ${o.found} — ${o.reason}`);
      }
    }
    expect(report).toEqual([]);
  });

  it("would report a room that regressed — the walk is not vacuous", () => {
    // Positive control for the walk itself. It reads a real room file and
    // re-introduces the exact line that was removed from it, so a detector
    // that had quietly stopped matching would be caught here rather than
    // reporting a clean house forever.
    const charts = readFileSync(resolve(REPO, roomPageFile("/charts")), "utf8");
    const regressed = charts.replace(
      'minHeight: "100%"',
      'minHeight: "100vh"',
    );
    expect(regressed).not.toBe(charts);
    expect(findViewportFloors(regressed).length).toBeGreaterThan(0);
  });
});
