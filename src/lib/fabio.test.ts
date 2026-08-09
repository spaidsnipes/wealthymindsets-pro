import { describe, expect, it } from "vitest";

import { FABIO_INSIGHTS } from "./fabio";

describe("Fabio order-flow truth language", () => {
  it("does not turn observation into participant identity or certainty", () => {
    const copy = FABIO_INSIGHTS.map(({ title, body, action }) => `${title} ${body} ${action}`).join(" ");
    expect(copy).not.toContain("a large player is filling passively");
    expect(copy).not.toContain("conviction, not noise");
    expect(copy).not.toContain("Fade the edges");
    expect(copy).toContain("not proof of who is trading");
    expect(copy).toContain("not a reversal guarantee");
    expect(copy).toContain("not automatic magnets or reversal signals");
  });
});
