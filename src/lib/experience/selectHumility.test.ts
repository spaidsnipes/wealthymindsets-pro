import { describe, it, expect } from "vitest";

import {
  HUMILITY_FLOOR,
  selectHumility,
  type HumilityEnvironment,
  type HumilityInput,
} from "./selectHumility";
import {
  SIGNAL_GROUPS,
  type SignalGroup,
  type SignalProvenance,
} from "./deckSceneSignals";

const ALL_OBSERVED = Object.fromEntries(
  SIGNAL_GROUPS.map(g => [g, "OBSERVED"]),
) as Record<SignalGroup, SignalProvenance>;

const NONE_OBSERVED = Object.fromEntries(
  SIGNAL_GROUPS.map(g => [g, "UNOBSERVED"]),
) as Record<SignalGroup, SignalProvenance>;

function input(over: Partial<HumilityInput> = {}): HumilityInput {
  return {
    provenance: ALL_OBSERVED,
    environment: "LIVE",
    decisionEpisodeIdentified: true,
    ...over,
  };
}

/** Every reachable input, for the invariants that must hold everywhere. */
function* everyInput(): Generator<HumilityInput> {
  const envs: HumilityEnvironment[] = ["PAPER", "LIVE", "BACKTEST"];
  // 2^5 provenance combinations × 3 environments × 2 episode states = 192.
  for (let mask = 0; mask < 1 << SIGNAL_GROUPS.length; mask++) {
    const provenance = Object.fromEntries(
      SIGNAL_GROUPS.map((g, i) => [g, mask & (1 << i) ? "OBSERVED" : "UNOBSERVED"]),
    ) as Record<SignalGroup, SignalProvenance>;
    for (const environment of envs) {
      for (const decisionEpisodeIdentified of [true, false]) {
        yield { provenance, environment, decisionEpisodeIdentified };
      }
    }
  }
}

describe("selectHumility — the panel that is never allowed to be empty", () => {
  it("covers the full input space (positive control)", () => {
    let n = 0;
    for (const _ of everyInput()) n++;
    expect(n).toBe(192);
  });

  it("LAW: never returns an empty list, for any input", () => {
    // The load-bearing assertion in this file. An empty "what we do not know"
    // panel does not read as "nothing is missing" — it reads as a positive
    // assurance of completeness, which is worse than the panel not existing.
    for (const i of everyInput()) {
      expect(
        selectHumility(i).length,
        `empty for ${i.environment} / episode=${i.decisionEpisodeIdentified}`,
      ).toBeGreaterThan(0);
    }
  });

  it("LAW: every item names a consequence, not just a gap", () => {
    // A humility panel that lists nouns ("Position: unobserved") duplicates the
    // provenance chips and helps nobody. Each line has to finish the sentence
    // the trader actually cares about, so each detail is required to be a real
    // sentence rather than a label.
    for (const i of everyInput()) {
      for (const item of selectHumility(i)) {
        expect(item.detail.length, `${item.id} detail too short`).toBeGreaterThan(40);
        expect(item.detail.trim().endsWith("."), `${item.id} detail is not a sentence`).toBe(true);
        expect(item.title.length, `${item.id} title empty`).toBeGreaterThan(0);
      }
    }
  });

  it("LAW: no item promises that the trader's next action will resolve it", () => {
    // Same rule CAPITAL_UNREAD_DETAIL follows. "Not read YET" implies something
    // on this screen causes a read. For the STRUCTURAL items nothing does, and
    // a promise with no owner behind it is the §H19 failure.
    for (const i of everyInput()) {
      for (const item of selectHumility(i)) {
        const text = `${item.title} ${item.detail}`;
        expect(/\byet\b/i.test(text), `${item.id} says "yet"`).toBe(false);
        expect(/\bwill be\b|\bcoming soon\b|\bonce you\b/i.test(text), `${item.id} promises`).toBe(false);
      }
    }
  });

  it("LAW: item ids are unique and stable within a render", () => {
    for (const i of everyInput()) {
      const ids = selectHumility(i).map(x => x.id);
      expect(new Set(ids).size, `duplicate id in ${JSON.stringify(ids)}`).toBe(ids.length);
    }
  });

  it("puts structural limits above observational gaps", () => {
    // A structural limit bounds how much the rest of the screen can ever be
    // worth. Sorting it under a list that shrinks as sources connect would let
    // the most permanent caveat drift off the bottom of a maturing product.
    const items = selectHumility(input({
      provenance: NONE_OBSERVED,
      environment: "PAPER",
      decisionEpisodeIdentified: false,
    }));
    const firstUnobserved = items.findIndex(x => x.kind === "UNOBSERVED");
    const lastStructural = items.map(x => x.kind).lastIndexOf("STRUCTURAL");
    expect(lastStructural).toBeLessThan(firstUnobserved);
  });

  it("names the environment firewall on every non-live surface", () => {
    for (const environment of ["PAPER", "BACKTEST"] as const) {
      const ids = selectHumility(input({ environment })).map(x => x.id);
      expect(ids, `${environment} did not disclose the firewall`).toContain("ENVIRONMENT_FIREWALL");
    }
    // LIVE is the one environment where the disclosure would be a lie.
    expect(selectHumility(input({ environment: "LIVE" })).map(x => x.id))
      .not.toContain("ENVIRONMENT_FIREWALL");
  });

  it("discloses a missing decision episode as STRUCTURAL, not as a pending read", () => {
    // This is /paper's actual state: no DECISION_ID, so "did capital move on
    // THIS decision" is unaskable rather than unanswered. Tagging it UNOBSERVED
    // would imply a source exists that simply has not replied.
    const item = selectHumility(input({ decisionEpisodeIdentified: false }))
      .find(x => x.id === "NO_DECISION_EPISODE");
    expect(item).toBeDefined();
    expect(item!.kind).toBe("STRUCTURAL");
  });

  it("falls to the floor rather than to silence when everything is observed", () => {
    const items = selectHumility(input());
    expect(items).toEqual([HUMILITY_FLOOR]);
  });

  it("refuses to call an unobserved position flat", () => {
    // The §14.1 wording check. The POSITION line is the one a trader is most
    // likely to skim, so it has to carry the same disclaimer the position
    // owners carry.
    const item = selectHumility(input({ provenance: NONE_OBSERVED }))
      .find(x => x.id === "UNOBSERVED_POSITION");
    expect(item!.detail).toMatch(/not a confirmation that you are flat/i);
  });

  it("reports unobserved groups in the canonical order, whatever the caller passes", () => {
    // Built from a reversed record to prove the order comes from SIGNAL_GROUPS
    // and not from the caller's key insertion order.
    const reversed = Object.fromEntries(
      [...SIGNAL_GROUPS].reverse().map(g => [g, "UNOBSERVED"]),
    ) as Record<SignalGroup, SignalProvenance>;
    const ids = selectHumility(input({ provenance: reversed }))
      .filter(x => x.kind === "UNOBSERVED")
      .map(x => x.id);
    expect(ids).toEqual(SIGNAL_GROUPS.map(g => `UNOBSERVED_${g}`));
  });
});
