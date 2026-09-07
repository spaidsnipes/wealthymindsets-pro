/**
 * capitalReach tests.
 *
 * The valuable assertions here are the ones about what CANNOT happen. A verdict
 * type with a reassuring member is only worth having if that member is
 * unreachable without evidence, so most of this file is spent proving there is
 * no path to ALL_DEVICES that does not name an authority.
 */
import { describe, it, expect } from "vitest";
import {
  CAPITAL_REACH_VERSION,
  selectCapitalReach,
  type CapitalStoreFacts,
} from "./capitalReach";

const BROWSER: CapitalStoreFacts = {
  medium: "BROWSER_LOCAL",
  crossTabInvalidation: true,
  serverAuthority: null,
};

describe("selectCapitalReach — browser-local stores", () => {
  it("reports THIS_BROWSER_ONLY and blocks cross-device", () => {
    const v = selectCapitalReach(BROWSER);
    expect(v.reach).toBe("THIS_BROWSER_ONLY");
    expect(v.crossDeviceBlocked).toBe(true);
    expect(v.version).toBe(CAPITAL_REACH_VERSION);
  });

  it("carries the canon status word H16 requires", () => {
    // H16: "status is CROSS-DEVICE BLOCKED, not simulated parity". The screen
    // must be able to be read against the canon sentence without translation.
    expect(selectCapitalReach(BROWSER).deviceNote).toContain("CROSS-DEVICE: BLOCKED");
  });

  it("names the devices the trader actually holds, not an abstraction", () => {
    // A note saying "persistence is device-scoped" is technically true and
    // operationally useless. The trader is holding a phone, and the sentence
    // has to be about the phone.
    const note = selectCapitalReach(BROWSER).deviceNote;
    expect(note).toMatch(/phone/i);
    expect(note).toMatch(/tablet/i);
  });

  it("cannot be rescued into ALL_DEVICES by ANY other fact", () => {
    // The load-bearing assertion. If a future edit lets some other field
    // upgrade a localStorage store, this fails. `serverAuthority` is included
    // in the sweep on purpose: a browser-local store that also names a server
    // is a half-migrated store, and half-migrated is not shared.
    for (const crossTabInvalidation of [true, false]) {
      for (const serverAuthority of [null, "", "  ", "wm.positions", "supabase.public.positions"]) {
        const v = selectCapitalReach({
          medium: "BROWSER_LOCAL",
          crossTabInvalidation,
          serverAuthority,
        });
        expect(v.reach).toBe("THIS_BROWSER_ONLY");
        expect(v.crossDeviceBlocked).toBe(true);
      }
    }
  });

  it("does not let cross-tab invalidation widen or soften the verdict", () => {
    // Cross-tab is one browser profile on one machine. The two verdicts must be
    // character-identical, so no wording can imply the second tab is a device.
    const withTabs = selectCapitalReach({ ...BROWSER, crossTabInvalidation: true });
    const without = selectCapitalReach({ ...BROWSER, crossTabInvalidation: false });
    expect(withTabs).toEqual(without);
  });
});

describe("selectCapitalReach — shared stores must produce evidence", () => {
  it("returns UNKNOWN when SERVER_SHARED names no authority", () => {
    const v = selectCapitalReach({
      medium: "SERVER_SHARED",
      crossTabInvalidation: true,
      serverAuthority: null,
    });
    expect(v.reach).toBe("UNKNOWN");
    expect(v.crossDeviceBlocked).toBe(true);
    expect(v.deviceNote).toContain("CROSS-DEVICE: UNKNOWN");
  });

  it("treats a blank or whitespace authority as no authority", () => {
    // `serverAuthority: ""` is what a half-wired env var produces. It must not
    // read as a name.
    for (const serverAuthority of ["", " ", "\t", "\n  "]) {
      const v = selectCapitalReach({
        medium: "SERVER_SHARED",
        crossTabInvalidation: false,
        serverAuthority,
      });
      expect(v.reach).toBe("UNKNOWN");
    }
  });

  it("distinguishes UNKNOWN from THIS_BROWSER_ONLY rather than collapsing them", () => {
    // §14.1 in miniature: an owned limitation and an unproven claim are
    // different findings and must not share a sentence.
    const unknown = selectCapitalReach({
      medium: "SERVER_SHARED", crossTabInvalidation: false, serverAuthority: null,
    });
    const browser = selectCapitalReach(BROWSER);
    expect(unknown.deviceNote).not.toBe(browser.deviceNote);
    expect(unknown.shellClause).not.toBe(browser.shellClause);
  });

  it("grants ALL_DEVICES only with a named authority, and names it on screen", () => {
    const v = selectCapitalReach({
      medium: "SERVER_SHARED",
      crossTabInvalidation: false,
      serverAuthority: "supabase.public.wm_positions",
    });
    expect(v.reach).toBe("ALL_DEVICES");
    expect(v.crossDeviceBlocked).toBe(false);
    // The name is the evidence. Printing the verdict without it would be the
    // same unfalsifiable claim in a longer sentence.
    expect(v.deviceNote).toContain("supabase.public.wm_positions");
  });

  it("stays silent in the shell when reach is ALL_DEVICES", () => {
    const v = selectCapitalReach({
      medium: "SERVER_SHARED", crossTabInvalidation: false, serverAuthority: "wm.positions",
    });
    // A shell that narrates the happy path trains the trader to ignore it, and
    // the clause is only worth reading because it is rare.
    expect(v.shellClause).toBeNull();
  });
});

describe("selectCapitalReach — invariants across every input", () => {
  const ALL: CapitalStoreFacts[] = [];
  for (const medium of ["BROWSER_LOCAL", "SERVER_SHARED"] as const) {
    for (const crossTabInvalidation of [true, false]) {
      for (const serverAuthority of [null, "", "   ", "wm.positions"]) {
        ALL.push({ medium, crossTabInvalidation, serverAuthority });
      }
    }
  }

  it("covers every combination of the fact space", () => {
    expect(ALL).toHaveLength(16);
  });

  it("keeps crossDeviceBlocked exactly equal to `reach !== ALL_DEVICES`", () => {
    // Two fields that can disagree eventually will, and the UI reads both.
    for (const facts of ALL) {
      const v = selectCapitalReach(facts);
      expect(v.crossDeviceBlocked).toBe(v.reach !== "ALL_DEVICES");
    }
  });

  it("always says something on the owning surface — §9 '…and a word'", () => {
    for (const facts of ALL) {
      expect(selectCapitalReach(facts).deviceNote.trim().length).toBeGreaterThan(20);
    }
  });

  it("gives every blocked verdict a shell clause, and only those", () => {
    for (const facts of ALL) {
      const v = selectCapitalReach(facts);
      if (v.crossDeviceBlocked) {
        expect(v.shellClause).not.toBeNull();
        expect(v.shellClause!.trim().length).toBeGreaterThan(0);
      } else {
        expect(v.shellClause).toBeNull();
      }
    }
  });

  it("uses no alarm vocabulary — nothing here has failed", () => {
    // §9: a failure may reduce capability, it may not increase certainty — and
    // the converse discipline applies too. This is a designed boundary working
    // as built. WARNING/DANGER/ERROR would make a permanent condition shout,
    // and a permanent shout is noise by the second day.
    for (const facts of ALL) {
      const v = selectCapitalReach(facts);
      const text = `${v.deviceNote} ${v.shellClause ?? ""}`;
      expect(text).not.toMatch(/\b(WARNING|DANGER|ALERT|ERROR|CRITICAL|FATAL)\b/i);
    }
  });

  it("never promises a future date or a coming feature", () => {
    // FORBIDDEN ON FOUNDER UI. "Cross-device support coming soon" would be a
    // schedule this module cannot keep.
    for (const facts of ALL) {
      const v = selectCapitalReach(facts);
      const text = `${v.deviceNote} ${v.shellClause ?? ""}`;
      expect(text).not.toMatch(/coming soon|eventually|needs wiring|in a future/i);
    }
  });

  it("is pure — same facts in, same verdict out", () => {
    for (const facts of ALL) {
      expect(selectCapitalReach(facts)).toEqual(selectCapitalReach({ ...facts }));
    }
  });
});
