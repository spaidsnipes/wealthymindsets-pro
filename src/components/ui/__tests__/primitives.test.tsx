/**
 * Focused unit tests for the WM Pro UI primitives shipped with item 6.1
 * of docs/operations/UI_TRANSFORMATION_LEDGER_2026-08-12.md.
 *
 * These tests enforce the TRUTH contracts each primitive is required to
 * satisfy — specifically, that UNKNOWN inputs never fabricate a value or
 * render a placeholder that reads as "resolved." Cannot execute under
 * STOP_REQUIRED (no deps installed), but the specs are ready to run the
 * moment disk clears above the 2 GiB start floor.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Panel from "../Panel";
import HeroNumber from "../HeroNumber";
import Ring from "../Ring";
import Ribbon from "../Ribbon";
import Pill from "../Pill";

describe("Panel", () => {
  it("renders children without a label", () => {
    render(<Panel>hello</Panel>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("exposes region role and aria-labelledby when label provided", () => {
    render(<Panel label="Nectar">hello</Panel>);
    const region = screen.getByRole("region", { name: /nectar/i });
    expect(region).toBeInTheDocument();
  });

  it("does not add region role when no label supplied", () => {
    render(<Panel>hello</Panel>);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("renders sublabel when provided", () => {
    render(<Panel label="Mirror" sublabel="Process score">hi</Panel>);
    expect(screen.getByText(/process score/i)).toBeInTheDocument();
  });
});

describe("HeroNumber", () => {
  it("renders finite number", () => {
    render(<HeroNumber value={92} grade="EXCELLENT" />);
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("EXCELLENT")).toBeInTheDocument();
  });

  it("renders ? for UNKNOWN and NEVER falls back to 0", () => {
    render(<HeroNumber value="UNKNOWN" reason="Insufficient evidence" />);
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
    // aria-label surfaces the reason for screen readers
    expect(screen.getByLabelText(/Insufficient evidence/i)).toBeInTheDocument();
  });

  it("adopts meter semantics when max is provided", () => {
    render(<HeroNumber value={62} max={100} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "62");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("omits meter semantics for UNKNOWN", () => {
    render(<HeroNumber value="UNKNOWN" max={100} />);
    expect(screen.queryByRole("meter")).toBeNull();
  });
});

describe("Ring", () => {
  it("renders arc for RESOLVED value", () => {
    render(<Ring value={80} max={100} resolution="RESOLVED" ariaLabel="test ring" />);
    const meter = screen.getByRole("meter", { name: /test ring/i });
    expect(meter).toHaveAttribute("aria-valuenow", "80");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("renders ? glyph for UNKNOWN with reason surfaced", () => {
    render(<Ring value={null} max={100} resolution="UNKNOWN" reason="No evidence" />);
    // No meter role when unresolved — img instead
    expect(screen.queryByRole("meter")).toBeNull();
    expect(screen.getByRole("img", { name: /unknown, No evidence/i })).toBeInTheDocument();
  });

  it("renders dimmed dashed track for PARTIAL", () => {
    render(<Ring value={40} max={100} resolution="PARTIAL" reason="Two dimensions unresolved" />);
    expect(screen.getByRole("img", { name: /partial/i })).toBeInTheDocument();
  });

  it("clamps overflow value", () => {
    render(<Ring value={9999} max={100} resolution="RESOLVED" ariaLabel="clamp" />);
    // meter valuenow should be clamped to max
    const meter = screen.getByRole("meter", { name: /clamp/i });
    expect(meter).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("Ribbon", () => {
  const chapters = [
    { id: "a", name: "Balance", glyph: "◈", resolution: "RESOLVED" as const },
    { id: "b", name: "Sweep", glyph: "⟢", resolution: "RESOLVED" as const },
    { id: "c", name: "Absorption", glyph: "✧", resolution: "PARTIAL" as const },
    { id: "d", name: "Reclaim", glyph: "✦", resolution: "UNKNOWN" as const, reason: "Not enough data" },
  ];

  it("renders all chapters", () => {
    render(<Ribbon chapters={chapters} activeIndex={1} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });

  it("marks the active chapter with aria-current=step", () => {
    render(<Ribbon chapters={chapters} activeIndex={1} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[1]).toHaveAttribute("aria-current", "step");
    expect(tabs[0]).not.toHaveAttribute("aria-current");
  });

  it("renders the UNKNOWN fallback when activeIndex is null and NEVER guesses a chapter", () => {
    render(<Ribbon chapters={chapters} activeIndex={null} />);
    expect(screen.getByText(/market state cannot be resolved yet/i)).toBeInTheDocument();
    // No tab should have aria-current
    const tabs = screen.getAllByRole("tab");
    tabs.forEach(tab => expect(tab).not.toHaveAttribute("aria-current"));
  });

  it("renders narrative only when supplied", () => {
    const { rerender } = render(<Ribbon chapters={chapters} activeIndex={1} />);
    expect(screen.queryByText(/structure shift/i)).toBeNull();
    rerender(<Ribbon chapters={chapters} activeIndex={1} narrative="Structure shift → Bear trap" />);
    expect(screen.getByText(/structure shift/i)).toBeInTheDocument();
  });

  it("chapter aria-label surfaces resolution and reason", () => {
    render(<Ribbon chapters={chapters} activeIndex={1} />);
    // Chapter D is UNKNOWN with a reason
    expect(screen.getByRole("tab", { name: /reclaim.*unknown.*not enough data/i })).toBeInTheDocument();
  });
});

describe("Pill", () => {
  it("renders neutral by default", () => {
    render(<Pill>Ready</Pill>);
    expect(screen.getByRole("status")).toHaveTextContent(/ready/i);
  });

  it.each([
    ["aligned", "◇"],
    ["confirmed", "◇"],
    ["warning", "◐"],
    ["danger", "!"],
    ["unknown", "?"],
  ] as const)("renders %s state with default glyph %s", (state, glyph) => {
    render(<Pill state={state as any}>Label</Pill>);
    expect(screen.getByRole("status")).toHaveTextContent(new RegExp(`${glyph.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*label`, "i"));
  });

  it("honors ariaLabel override for icon-only usage", () => {
    render(<Pill state="warning" ariaLabel="Data is stale" glyph={null}>{""}</Pill>);
    expect(screen.getByRole("status", { name: /data is stale/i })).toBeInTheDocument();
  });
});
