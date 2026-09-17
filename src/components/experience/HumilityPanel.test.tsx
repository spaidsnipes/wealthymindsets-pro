/**
 * THE PANEL MAY NEVER LOOK LIKE IT KNOWS MORE THAN IT DOES.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HumilityPanel } from "./HumilityPanel";
import type { HumilityItem } from "@/lib/experience/selectHumility";

function item(id: string, kind: HumilityItem["kind"]): HumilityItem {
  return { id, kind, title: `Title ${id}`, detail: `Detail ${id}` };
}

const MIXED: HumilityItem[] = [
  item("obs1", "UNOBSERVED"),
  item("str1", "STRUCTURAL"),
  item("obs2", "UNOBSERVED"),
  item("str2", "STRUCTURAL"),
];

describe("HumilityPanel — the gaps get a shape", () => {
  it("renders nothing when handed nothing", () => {
    // A reassuring heading over an empty list is the failure mode.
    expect(renderToStaticMarkup(<HumilityPanel items={[]} />)).toBe("");
  });

  it("draws one mark per gap", () => {
    const html = renderToStaticMarkup(<HumilityPanel items={MIXED} />);
    expect(html.match(/data-testid="humility-mark"/g) ?? []).toHaveLength(4);
    expect(html).toContain('data-total="4"');
    expect(html).toContain('data-structural="2"');
  });

  it("separates permanent limits from gaps that can close", () => {
    const html = renderToStaticMarkup(<HumilityPanel items={MIXED} />);
    expect(html.match(/data-permanent="true"/g) ?? []).toHaveLength(2);
    expect(html.match(/data-permanent="false"/g) ?? []).toHaveLength(2);
  });

  it("distinguishes the two by FILL, not by hue — §9 greyscale rule", () => {
    const html = renderToStaticMarkup(<HumilityPanel items={MIXED} />);
    // A colour-blind reader and a greyscale screen must both see the split, so
    // the solid mark and the hollow mark differ in fill and outline only. Both
    // use the same ink; neither carries a second colour.
    const permanent = html.split('data-permanent="true"')[1].split(">")[0];
    const closable = html.split('data-permanent="false"')[1].split(">")[0];
    expect(permanent).toContain("background:#8a8271");
    expect(closable).toContain("background:transparent");
    expect(closable).toContain("inset 0 0 0 1px #8a8271");
  });

  it("keeps every mark the same width, so the denominator cannot shrink", () => {
    const html = renderToStaticMarkup(<HumilityPanel items={MIXED} />);
    // The gaps in hand are the gaps in hand. A strip where closable gaps were
    // drawn narrower would make the build look nearer to complete than it is.
    expect(html.match(/flex:1 1 0/g) ?? []).toHaveLength(4);
  });

  it("still draws the strip in the quiet compact form", () => {
    // §18 — quiet is a VOLUME, not an omission.
    const html = renderToStaticMarkup(<HumilityPanel items={MIXED} compact />);
    expect(html.match(/data-testid="humility-mark"/g) ?? []).toHaveLength(4);
  });

  it("keeps the spoken census beside the drawn one", () => {
    const html = renderToStaticMarkup(<HumilityPanel items={MIXED} />);
    // §9 — "Verified truth is a sentence." The strip ranks; it never replaces
    // the words, and the two are compiled from the same three numbers.
    expect(html).toContain("What we do not know");
    expect(html).toContain("2 structural");
  });

  it("hides the strip from screen readers, which get the list itself", () => {
    const html = renderToStaticMarkup(<HumilityPanel items={MIXED} />);
    // The marks carry no information the titles below do not already state,
    // and four unlabelled shapes announced in sequence would be noise.
    expect(html).toMatch(/data-testid="humility-strip"[^>]*aria-hidden="true"/);
  });
});
