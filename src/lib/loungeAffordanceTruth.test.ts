import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lounge = fs.readFileSync(
  path.join(process.cwd(), "src/app/lounge/page.tsx"),
  "utf8",
);

/**
 * Lounge tag affordance Sentinel — LIVING-PIXEL LAW ("no design theater").
 *
 * Post tags rendered as <span> with `cursor-pointer` and `hover:scale-105`:
 * a hand cursor and a grow-on-hover animation, with no handler and no
 * tag-filter state anywhere on the page. The chips looked like filters and
 * were decorative labels. A trader clicking one learns the product is broken.
 *
 * Wiring a filter would have been inventing a feature; the honest fix is to
 * stop dressing a label as a control. If tag filtering is built later, the
 * affordance returns WITH the behaviour that justifies it.
 */
describe("lounge tag affordance truth", () => {
  it("tags no longer advertise a click that cannot happen", () => {
    expect(lounge).not.toContain('rounded-full cursor-pointer transition-all hover:scale-105');
  });

  it("the tag chip is still rendered as a label", () => {
    expect(lounge).toContain('<span key={t} className="text-[10px] px-2 py-0.5 rounded-full"');
  });

  it("no tag-filter state was invented to justify the cursor", () => {
    expect(lounge).not.toMatch(/setActiveTag|tagFilter/);
  });
});
