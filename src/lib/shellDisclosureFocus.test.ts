import { describe, expect, it } from "vitest";
import { isHiddenByClosedDetails } from "../components/layout/useShellModalFocus";

// Minimal ancestry model. Geometry deliberately does not participate: browsers
// may report non-empty client rects for closed-disclosure content.
type TestNode = {
  tagName: string;
  parentElement: TestNode | null;
  children: TestNode[];
  hasAttribute: (name: string) => boolean;
  contains: (target: unknown) => boolean;
};
function node(tagName: string, open = false): TestNode {
  const value: TestNode = {
    tagName,
    parentElement: null,
    children: [],
    hasAttribute: (name: string) => name === "open" && open,
    contains(target: unknown): boolean {
      return target === value || value.children.some(child => child.contains(target));
    },
  };
  return value;
}
function append(parent: TestNode, child: TestNode) {
  parent.children.push(child);
  child.parentElement = parent;
  return child;
}
const hidden = (element: TestNode) => isHiddenByClosedDetails(element as unknown as HTMLElement);

describe("modal disclosure focus visibility", () => {
  it("keeps the closed disclosure's first summary and its children reachable", () => {
    const details = node("DETAILS");
    const summary = append(details, node("SUMMARY"));
    const button = append(summary, node("BUTTON"));
    expect(hidden(summary)).toBe(false);
    expect(hidden(button)).toBe(false);
    expect(hidden(append(details, node("BUTTON")))).toBe(true);
    expect(hidden(append(details, node("SUMMARY")))).toBe(true);
  });

  it("does not let an inner summary escape a collapsed outer passport", () => {
    const outer = node("DETAILS");
    append(outer, node("SUMMARY"));
    const inner = append(outer, node("DETAILS"));
    const summary = append(inner, node("SUMMARY"));
    expect(hidden(summary)).toBe(true);
  });

  it("permits expanded contents while respecting any remaining closed ancestor", () => {
    const outer = node("DETAILS", true);
    append(outer, node("SUMMARY"));
    const inner = append(outer, node("DETAILS"));
    const summary = append(inner, node("SUMMARY"));
    expect(hidden(summary)).toBe(false);
    expect(hidden(append(inner, node("BUTTON")))).toBe(true);
    expect(hidden(append(outer, node("BUTTON")))).toBe(false);
    expect(hidden(node("BUTTON"))).toBe(false);
  });
});
