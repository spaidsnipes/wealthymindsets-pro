/**
 * SemanticZoom — behavior tests for the Phase-2 progressive-disclosure
 * primitive. Uses React test renderer (no DOM) to stay in the pure-lib
 * test harness convention this repo uses.
 *
 * canon §Phase 2 Experience Shell — the 4-level rule + silence-is-a-feature
 * for absent levels are locked here so future consumers can't drift.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SemanticZoom } from "./SemanticZoom";

describe("SemanticZoom — canon §Phase 2 Experience Shell", () => {
  it("renders null when no levels are supplied (canon §Silence Is A Feature)", () => {
    const html = renderToStaticMarkup(<SemanticZoom levels={{}} />);
    expect(html).toBe("");
  });

  it("renders the default level's content when only one level is supplied", () => {
    const html = renderToStaticMarkup(
      <SemanticZoom levels={{ 1: <span>ONE-GLANCE</span> }} />,
    );
    expect(html).toContain("ONE-GLANCE");
  });

  it("does NOT render the level pill row when only one level is supplied (§quiet UI)", () => {
    const html = renderToStaticMarkup(
      <SemanticZoom levels={{ 1: <span>ONE-GLANCE</span> }} />,
    );
    expect(html).not.toContain('role="tablist"');
  });

  it("renders the level pill row when more than one level is supplied", () => {
    const html = renderToStaticMarkup(
      <SemanticZoom levels={{
        1: <span>ONE</span>,
        3: <span>THREE</span>,
      }} />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain("L1");
    expect(html).toContain("L3");
    // The absent levels L2 + L4 are not rendered as pills
    expect(html).not.toContain(">L2<");
    expect(html).not.toContain(">L4<");
  });

  it("defaults to L1 when supplied, or first available when not", () => {
    // L1 supplied → default is L1 content visible
    const html1 = renderToStaticMarkup(
      <SemanticZoom levels={{ 1: <span>ONE</span>, 3: <span>THREE</span> }} />,
    );
    expect(html1).toContain("ONE");

    // L1 NOT supplied → falls to first available (L2)
    const html2 = renderToStaticMarkup(
      <SemanticZoom levels={{ 2: <span>TWO</span>, 4: <span>FOUR</span> }} />,
    );
    expect(html2).toContain("TWO");
    expect(html2).not.toContain("FOUR");
  });

  it("respects an explicit defaultLevel when provided AND available", () => {
    const html = renderToStaticMarkup(
      <SemanticZoom levels={{
        1: <span>ONE</span>,
        3: <span>THREE</span>,
      }} defaultLevel={3} />,
    );
    expect(html).toContain("THREE");
    expect(html).not.toContain("ONE");
  });

  it("aria-label defaults to 'Semantic zoom' but can be overridden", () => {
    const html = renderToStaticMarkup(
      <SemanticZoom levels={{ 1: <span>X</span> }} />,
    );
    expect(html).toContain('aria-label="Semantic zoom"');

    const custom = renderToStaticMarkup(
      <SemanticZoom levels={{ 1: <span>X</span> }} ariaLabel="TSLA fidelity zoom" />,
    );
    expect(custom).toContain('aria-label="TSLA fidelity zoom"');
  });

  it("empty-string level content still counts as supplied (0/'' are legitimate)", () => {
    const html = renderToStaticMarkup(
      <SemanticZoom levels={{
        1: <span>ONE</span>,
        2: "",
      }} />,
    );
    expect(html).toContain('role="tablist"'); // both levels present → row shown
    expect(html).toContain(">L1<");
    expect(html).toContain(">L2<");
  });

  it("null-valued level is treated as unsupplied (silent)", () => {
    const html = renderToStaticMarkup(
      <SemanticZoom levels={{
        1: <span>ONE</span>,
        2: null,
      }} />,
    );
    // Only L1 supplied — no pill row
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain("ONE");
  });
});
