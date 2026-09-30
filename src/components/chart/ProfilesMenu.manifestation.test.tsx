import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfilesMenu } from "./ProfilesMenu";
import type { ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";

function render(detail?: string) {
  return renderToStaticMarkup(<ProfilesMenu barsPresent printsPresent observedAggressorFlow
    only={["ABSORPTION"]} active={{ ABSORPTION: true }} onToggle={() => {}}
    stateDetail={detail ? { ABSORPTION: detail } as Partial<Record<ProfileId, string>> : undefined} />);
}

describe("activation is not proof of manifestation", () => {
  it("a no-event receipt remains available without claiming it is drawing, including the accessible name", () => {
    const html = render("NO CURRENT EVENT");
    expect(html).toContain("ACTIVE · NO CURRENT EVENT");
    expect(html).toContain("All 1 available");
    expect(html).not.toContain("drawing");
    expect(html).not.toContain("DRAWING");
  });
  it("receipts override generic feed readiness in the capability summary", () => {
    for (const [detail, summary] of [
      ["UNAVAILABLE ON THIS FEED", "1 unavailable on this feed"],
      ["NOT ENTITLED", "1 not entitled"],
      ["BROKEN / NOT WIRED", "1 broken / not wired"],
    ]) {
      const html = render(detail);
      expect(html).toContain(summary);
      expect(html).toContain("0 available");
      expect(html).not.toContain("DRAWING");
    }
  });
  it("a missing receipt claims availability, not a visible object", () => {
    const html = render();
    expect(html).toContain("ACTIVE · AVAILABLE");
    expect(html).not.toContain("DRAWING");
  });
  it("a measured on-camera receipt can report drawing", () => {
    expect(render("ON CAMERA · 2 ZONES")).toContain("DRAWING · ON CAMERA · 2 ZONES");
  });
});
