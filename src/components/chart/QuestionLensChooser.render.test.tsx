/**
 * RENDER SMOKE — the Question Lens's ASK chooser, mounted in the rail that
 * carries it (UI-04, 2026-09-26).
 *
 * e5bdf86e moved this chooser into the rail and was reverted (cdaf8590) after
 * serving /charts showed a blank page. Every guard on the chooser until now
 * read SOURCE, so a render throw on this path could not fail CI. This file
 * mounts the real DecisionSpineBand with the real QuestionLensChooser inside
 * it, in every state the room can hand it, so a throw anywhere on that path
 * (a TDZ in a prop, a bad child, a null deref in the lens card) is a red test.
 *
 * It also pins the contract that makes "never two copies" true: the rail
 * draws the chooser exactly once whether or not the lens card is drawn, and
 * the band (phone) presentation never draws it — the room floats it there.
 */

import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionSpineBand, type DecisionSpineBandProps } from "@/components/experience/DecisionSpineBand";
import { QuestionLensChooser, type QuestionLensChooserProps } from "./QuestionLensChooser";
import { QUESTION_CHOICES } from "@/lib/marketData/viewModels/selectQuestionLens";

const lens = {
  version: 1, active: true, kind: "ABSORPTION" as const, ledger: "DEBT" as const, choice: "AUTO" as const,
  refusal: null, question: "Is effort being absorbed at 30684.00–30951.50?", focus: "Absorption of effort (volume basis)",
  bandLow: 1, bandHigh: 2, bandStart: 3,
  debt: [
    { label: "CLEAR DISPLACEMENT", paid: false, evidence: "farthest move away 0.00 vs 2× median range 178.50" },
    { label: "SUSTAINED EFFORT", paid: true, evidence: "effort after 21% vs in zone 77%" },
  ],
  openDebt: 1, posture: "WAIT · LET THE MARKET PAY", nextQuestion: "Is the opposite side's effort being rewarded?",
  control: { aggression: 0.77, displacement: 0.16, effortWord: "EFFORT" as const, verdict: "EFFORT ABSORBED" as const },
};

function chooser(over: Partial<QuestionLensChooserProps> = {}): React.ReactElement {
  return (
    <QuestionLensChooser placement="rail" choice="AUTO" onChoose={() => {}} rawOn={false} onToggleRaw={() => {}} {...over} />
  );
}

function spine(over: Partial<DecisionSpineBandProps> = {}): string {
  const props: DecisionSpineBandProps = {
    decisionId: null,
    decisionIdAbsence: "No decision born yet — permission has not crossed.",
    now: { token: "SESSION ?", detail: "no exchange calendar — the current session is not established", established: false },
    replayEngaged: false,
    market: { symbol: "BTCUSD", timeframe: "5m", quality: null, capturedAt: null, last: null },
    oneStory: null,
    availableR: null,
    decisionWhy: null,
    expression: null,
    presentation: "rail",
    ...over,
  };
  return renderToStaticMarkup(<DecisionSpineBand {...props} />);
}

const copies = (html: string) => html.split('data-testid="question-lens-chooser"').length - 1;

describe("UI-04 · the ASK chooser mounts inside the rail without throwing", () => {
  it("rides the top of the lens card when the card draws — one copy", () => {
    const html = spine({ questionLens: lens, lensChooser: chooser() });
    expect(copies(html)).toBe(1);
    const card = html.indexOf('data-testid="spine-question-lens"');
    const ask = html.indexOf('data-testid="question-lens-chooser"');
    expect(card).toBeGreaterThan(-1);
    expect(ask).toBeGreaterThan(card);
    expect(ask).toBeLessThan(html.indexOf("Active question"));
    expect(html).toContain('data-placement="rail"');
    expect(html).not.toContain("spine-lens-chooser-only");
  });

  it("takes a card of its own when there is no lens reading — the question can still be changed", () => {
    const html = spine({ questionLens: null, lensChooser: chooser() });
    expect(copies(html)).toBe(1);
    expect(html).toContain('data-testid="spine-lens-chooser-only"');
    expect(html).not.toContain('data-testid="spine-question-lens"');
  });

  it("stays reachable under a replay camera, which withholds the reading (one copy)", () => {
    const html = spine({ questionLens: lens, replayEngaged: true, lensChooser: chooser() });
    expect(copies(html)).toBe(1);
    expect(html).toContain('data-testid="spine-lens-chooser-only"');
    expect(html).not.toContain('data-testid="spine-question-lens"');
  });

  it("an idle lens (neither active nor refused) still leaves the chooser", () => {
    const html = spine({ questionLens: { ...lens, active: false, refusal: null }, lensChooser: chooser() });
    expect(copies(html)).toBe(1);
    expect(html).toContain('data-testid="spine-lens-chooser-only"');
  });

  it("the band (phone) presentation never draws it — the room floats it over the pane instead", () => {
    expect(copies(spine({ presentation: "band", questionLens: lens, lensChooser: chooser() }))).toBe(0);
  });

  it("no chooser handed down → nothing extra drawn (lens off)", () => {
    const html = spine({ questionLens: lens });
    expect(copies(html)).toBe(0);
    expect(html).not.toContain("spine-lens-chooser");
  });
});

describe("the chooser itself", () => {
  it("offers every question and Show raw, marking the current choice", () => {
    const html = renderToStaticMarkup(chooser({ choice: "TRAP", rawOn: true }));
    for (const c of QUESTION_CHOICES) expect(html).toContain(`data-question-choice="${c.id}"`);
    expect(html).toMatch(/aria-checked="true" data-question-choice="TRAP"/);
    expect((html.match(/aria-checked="true"/g) ?? []).length).toBe(1);
    expect(html).toContain("Raw · restore");
    expect(html).toContain('aria-pressed="true"');
  });

  it("floats inside the pane at every height and renders on phones", () => {
    const html = renderToStaticMarkup(chooser({ placement: "floating" }));
    expect(html).toContain('data-placement="floating"');
    expect(html).toMatch(/class="absolute /);
    expect(html).toContain("top:min(532px, calc(100% - 96px))");
    expect(html).not.toMatch(/\bhidden\b/);
  });

  it("in the rail it is plain flow content — no absolute box over anything", () => {
    const html = renderToStaticMarkup(chooser());
    expect(html).not.toContain("absolute");
    expect(html).not.toContain("top:");
  });

  it("routes clicks to the room's one set of handlers", () => {
    const onChoose = vi.fn();
    const onToggleRaw = vi.fn();
    const el = QuestionLensChooser({ placement: "rail", choice: "AUTO", onChoose, rawOn: false, onToggleRaw });
    const kids = React.Children.toArray((el.props as { children: React.ReactNode }).children).flat() as React.ReactElement<{ onClick?: () => void; "data-question-choice"?: string; "data-testid"?: string }>[];
    const buttons = kids.flatMap(k => (Array.isArray(k) ? k : [k])).filter(k => typeof k.props?.onClick === "function");
    buttons.find(b => b.props["data-question-choice"] === "HOLD")!.props.onClick!();
    buttons.find(b => b.props["data-testid"] === "show-raw")!.props.onClick!();
    expect(onChoose).toHaveBeenCalledWith("HOLD");
    expect(onToggleRaw).toHaveBeenCalledTimes(1);
  });
});
