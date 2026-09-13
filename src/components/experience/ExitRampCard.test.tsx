import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExitRampCard } from "./ExitRampCard";
import type { ExitRamp } from "@/lib/experience/composeExitRamp";

const waitingRamp: ExitRamp = {
  version: "wm.exit-ramp.v1",
  state: "WAITING",
  done: [],
  saved: [],
  open: ["Await new evidence."],
  next: null,
  return: null,
  recap: "WAITING — 1 open",
  safeToLeave: false,
  headline: "Waiting on new evidence before the next action.",
};

describe("ExitRampCard presentation", () => {
  it("embeds the complete receipt without creating another card shell", () => {
    const html = renderToStaticMarkup(<ExitRampCard ramp={waitingRamp} presentation="embedded" />);
    expect(html).toContain('data-presentation="embedded"');
    expect(html).toContain("Await new evidence.");
    expect(html).toContain("border:none");
    expect(html).toContain("background:transparent");
  });

  it("keeps the bordered card presentation as the reusable default", () => {
    const html = renderToStaticMarkup(<ExitRampCard ramp={waitingRamp} />);
    expect(html).toContain('data-presentation="card"');
    expect(html).toContain("background:#0b0b0d");
  });
});
