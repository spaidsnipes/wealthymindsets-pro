import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  selectPassportStamp,
  abbreviateObjectId,
  formatIssuedAt,
  PASSPORT_STAMP_VERSION,
} from "./selectPassportStamp";
import type { MarketObjectPassportVM } from "../marketData/viewModels/selectMarketObjectPassport";
import { MARKET_OBJECT_PASSPORT_VERSION } from "../marketData/viewModels/selectMarketObjectPassport";

const vmOf = (over: Partial<MarketObjectPassportVM> = {}): MarketObjectPassportVM =>
  ({
    version: MARKET_OBJECT_PASSPORT_VERSION,
    snapshotId: "cms_01J8K3ZQ4T7YB2N9WXR6",
    capturedAt: Date.UTC(2026, 8, 15, 14, 32, 7),
    qualityState: "PARTIAL",
    objects: [],
    resolvedCount: 3,
    totalCount: 8,
    ...over,
  }) as MarketObjectPassportVM;

const fieldNamed = (vm: MarketObjectPassportVM, label: string) => {
  const f = selectPassportStamp(vm).fields.find((x) => x.label === label);
  if (!f) throw new Error(`no stamp field named ${label}`);
  return f;
};

describe("selectPassportStamp", () => {
  it("is versioned so a surface can pin the compiler it renders", () => {
    expect(PASSPORT_STAMP_VERSION).toBe("wm.passport-stamp.v1");
  });

  describe("THE JPEG'S $1.80 — the two mockup fields with no producer", () => {
    // The mockup's stamp promises a 60s TTL and "INTEGRITY Verified • Signed".
    // Nothing in this build expires a snapshot on a timer, and nothing signs
    // or verifies one. "Verified" is the most dangerous word in the mockup
    // because it is the word that would let a trader stop checking.
    it("never prints a TTL or a validity window", () => {
      const labels = selectPassportStamp(vmOf()).fields.map((f) => f.label.toLowerCase());
      expect(labels).not.toContain("valid until");
      expect(labels).not.toContain("ttl");
      const blob = JSON.stringify(selectPassportStamp(vmOf())).toLowerCase();
      expect(blob).not.toContain("ttl");
    });

    it("never claims the passport was verified or signed", () => {
      const blob = JSON.stringify(selectPassportStamp(vmOf())).toLowerCase();
      expect(blob).not.toContain("verified");
      expect(blob).not.toContain("signed");
      expect(blob).not.toContain("integrity");
    });

    it("reports the engine's quality reading under the engine's own label", () => {
      expect(fieldNamed(vmOf({ qualityState: "PARTIAL" }), "State Quality").value).toBe("PARTIAL");
    });
  });

  describe("UNKNOWN has a look", () => {
    it("marks an unsealed snapshot unissued and every market field unresolved", () => {
      const stamp = selectPassportStamp(vmOf({ snapshotId: null, capturedAt: null, totalCount: 0, resolvedCount: 0 }));
      expect(stamp.unissued).toBe(true);
      expect(fieldNamed(vmOf({ snapshotId: null }), "Object ID").unresolved).toBe(true);
      expect(fieldNamed(vmOf({ capturedAt: null }), "Issued").unresolved).toBe(true);
    });

    it("refuses '0 of 0' for a ledger that was never opened", () => {
      const f = fieldNamed(vmOf({ resolvedCount: 0, totalCount: 0 }), "Resolved");
      expect(f.value).toBe("—");
      expect(f.value).not.toContain("0 of 0");
      expect(f.unresolved).toBe(true);
    });

    it("does still report a genuine zero-resolved ledger that WAS opened", () => {
      // 0 of 8 is a real, alarming reading. It must not be hidden with the
      // never-opened case — that is the absent-cell defect all over again.
      //
      // RE-PINNED 2026-09-16. This asserted the bare "0 of 8". Measured live on
      // /command-deck, that bare count sat ~150px above the Evidence Debt
      // cell's "0 of 9 paid". Both are correct — 8 market dimensions here, 9
      // decision-chain nodes there — but a trader reading down the page got two
      // answers to "how much is unresolved" and nothing telling them the two
      // counts cover different sets. Canon Weakness #1.
      //
      // The count is unchanged and must stay unchanged; only the noun was
      // added. This assertion now pins BOTH halves: the arithmetic the trader
      // relies on, and the noun that makes it comparable to its neighbour.
      const f = fieldNamed(vmOf({ resolvedCount: 0, totalCount: 8 }), "Resolved");
      expect(f.value).toBe("0 of 8 dimensions");
      expect(f.unresolved).toBe(false);
    });

    it("names the set it counts, so it cannot be read against the evidence ledger", () => {
      // The guard for the defect itself rather than for one fixture. A bare
      // "N of M" in this band is what made it silently comparable to the
      // Evidence Debt cell's "N of M paid", which counts decision-chain nodes
      // and therefore legitimately reports a different M.
      for (const totalCount of [1, 2, 8, 9, 40]) {
        const f = fieldNamed(vmOf({ resolvedCount: 0, totalCount }), "Resolved");
        expect(f.value, `totalCount=${totalCount}`).toMatch(/^0 of \d+ dimensions?$/);
      }
      // Singular is singular. One dimension is not "1 dimensions".
      expect(fieldNamed(vmOf({ resolvedCount: 0, totalCount: 1 }), "Resolved").value).toBe(
        "0 of 1 dimension",
      );
      // The noun must never appear on the never-opened blank — naming a set
      // that was never opened would imply one was counted.
      expect(fieldNamed(vmOf({ resolvedCount: 0, totalCount: 0 }), "Resolved").value).not.toContain(
        "dimension",
      );
    });

    describe("AN ABSENCE IS NOT AN UNKNOWN, AND NEITHER IS A FINDING", () => {
      // Measured live: the band printed `STATE QUALITY  UNAVAILABLE` in the
      // #ede6d3 it reserves for findings, at the same weight as the protocol
      // version beside it. An absence was wearing the ink of a fact.
      it("marks UNAVAILABLE an absence — a reading whose content is nothing", () => {
        const f = fieldNamed(vmOf({ qualityState: "UNAVAILABLE" }), "State Quality");
        expect(f.absence).toBe(true);
      });

      it("does NOT fold UNAVAILABLE into unresolved", () => {
        // The whole point. UNKNOWN means no state was compiled; UNAVAILABLE is
        // a state the engine compiled and it says there is no coverage and no
        // price. Same mistake as printing FLAT for an unread account (§14.1).
        expect(fieldNamed(vmOf({ qualityState: "UNAVAILABLE" }), "State Quality").unresolved).toBe(
          false,
        );
        // …and the mirror: UNKNOWN is not an absence, it is the lack of one.
        expect(fieldNamed(vmOf({ qualityState: "UNKNOWN" }), "State Quality").absence).toBe(false);
      });

      it("keeps every DEGRADED reading in finding ink", () => {
        // A degraded reading that dims itself is the absent-cell defect in
        // reverse: the trader stops seeing the very state they must act on.
        for (const q of ["LIVE", "DELAYED", "STALE", "PARTIAL", "PROXY", "REPLAY"] as const) {
          const f = fieldNamed(vmOf({ qualityState: q }), "State Quality");
          expect(f.absence, `qualityState=${q}`).toBe(false);
          expect(f.unresolved, `qualityState=${q}`).toBe(false);
        }
      });

      it("no other field ever claims to be an absence", () => {
        // Only STATE QUALITY has a reading that can MEAN nothing. In
        // particular "0 of 8 dimensions" is alarming but real — softening it
        // would hide the number the trader most needs.
        const stamp = selectPassportStamp(
          vmOf({ qualityState: "UNAVAILABLE", resolvedCount: 0, totalCount: 8 }),
        );
        for (const f of stamp.fields) {
          if (f.label === "State Quality") continue;
          expect(f.absence, `${f.label} must not be an absence`).toBe(false);
        }
      });

      it("a field is never both unresolved and an absence", () => {
        // They answer different questions — "is there a reading?" and "is the
        // reading a finding?" — so one field claiming both would be incoherent
        // and would make the rendered mark undefined.
        for (const q of ["UNKNOWN", "UNAVAILABLE", "LIVE", "PARTIAL"] as const) {
          for (const f of selectPassportStamp(vmOf({ qualityState: q })).fields) {
            expect(f.unresolved && f.absence, `${f.label} @ ${q}`).toBe(false);
          }
        }
      });
    });

    it("marks an UNKNOWN quality state unresolved", () => {
      expect(fieldNamed(vmOf({ qualityState: "UNKNOWN" }), "State Quality").unresolved).toBe(true);
    });

    it("never marks Protocol unresolved — it is a fact about the compiler", () => {
      const f = fieldNamed(vmOf({ snapshotId: null, capturedAt: null }), "Protocol");
      expect(f.unresolved).toBe(false);
      expect(f.value).toBe(MARKET_OBJECT_PASSPORT_VERSION);
    });
  });

  describe("A STAMP IS THE SAME MARK EVERYWHERE IT IS READ", () => {
    // toLocaleTimeString reads the host zone and locale, which differ between
    // the server render and the browser render. That exact class of mismatch
    // produced five separate React #418 hydration failures in this codebase.
    it("formats the issue time in UTC, not host-local time", () => {
      expect(formatIssuedAt(Date.UTC(2026, 8, 15, 14, 32, 7))).toBe("2026-09-15 14:32:07 UTC");
    });

    it("is stable under a changed host timezone", () => {
      const ms = Date.UTC(2026, 0, 1, 3, 4, 5);
      const before = formatIssuedAt(ms);
      const saved = process.env.TZ;
      try {
        process.env.TZ = "Pacific/Kiritimati";
        expect(formatIssuedAt(ms)).toBe(before);
      } finally {
        process.env.TZ = saved;
      }
    });

    it("returns UNKNOWN rather than 'Invalid Date' for a nonsense timestamp", () => {
      expect(formatIssuedAt(Number.NaN)).toBe("—");
    });
  });

  describe("the object id stays checkable by eye", () => {
    it("truncates in the MIDDLE so both ends survive", () => {
      const long = "cms_01J8K3ZQ4T7YB2N9WXR6ABCDEFGH";
      const short = abbreviateObjectId(long);
      expect(short).toContain("…");
      expect(long.startsWith(short.split("…")[0])).toBe(true);
      expect(long.endsWith(short.split("…")[1])).toBe(true);
    });

    it("leaves a short id completely alone", () => {
      expect(abbreviateObjectId("cms_short")).toBe("cms_short");
    });
  });

  it("always emits the same five fields in a stable order", () => {
    // The trader's eye learns positions. A field that can vanish moves its
    // neighbours.
    for (const vm of [vmOf(), vmOf({ snapshotId: null, capturedAt: null, totalCount: 0 })]) {
      expect(selectPassportStamp(vm).fields.map((f) => f.label)).toEqual([
        "Object ID",
        "Issued",
        "Protocol",
        "State Quality",
        "Resolved",
      ]);
    }
  });

  it("is pure — same input yields a deeply equal result", () => {
    const vm = vmOf();
    expect(selectPassportStamp(vm)).toEqual(selectPassportStamp(vm));
  });
});

describe("SENTINEL — the band spells no value of its own", () => {
  const root = path.resolve(__dirname, "../../..");
  const view = fs.readFileSync(
    path.join(root, "src/components/command/PassportStamp.tsx"),
    "utf8",
  );
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("self-test: stripComments removes prose but keeps rendered literals", () => {
    expect(stripComments('/* "Verified" */ const a = "Verified";')).toContain('"Verified"');
    expect(stripComments('/* "Verified" */ const a = 1;')).not.toContain("Verified");
  });

  it("renders compiled fields, never a hardcoded integrity claim", () => {
    const code = stripComments(view);
    expect(code).toContain("{f.value}");
    expect(code).toContain("{f.label}");
    for (const forbidden of ["Verified", "Signed", "TTL", "Valid Until"]) {
      expect(code).not.toContain(forbidden);
    }
  });

  it("the band draws THREE states, and keeps absences out of finding ink", () => {
    // The ink answers "is this a finding?"; the face answers "is this a
    // reading at all?". A view that consumed `absence` for neither mark would
    // leave the selector's distinction invisible — a compiled fact with no
    // pixel, which is the LIVING-PIXEL LAW read backwards.
    const code = stripComments(view);
    expect(code).toContain("f.absence");
    // Absence must reach the COLOUR (not a finding)…
    expect(code).toMatch(/color:\s*f\.unresolved\s*\|\|\s*f\.absence\s*\?/);
    // …and must NOT reach the italic, which is reserved for "no reading".
    expect(code).toMatch(/fontStyle:\s*f\.unresolved\s*\?/);
    expect(code).not.toMatch(/fontStyle:[^;]*f\.absence/);
    // No new token was minted for this state.
    expect(code).toContain("#8a8271");
    expect(code).toContain("#ede6d3");
  });

  it("the deck renders the band outside the collapsed drawer", () => {
    const page = fs.readFileSync(path.join(root, "src/app/command-deck/page.tsx"), "utf8");
    expect(page).toContain("selectPassportStamp");
    expect(page).toContain("<PassportStamp");
  });

  // BEING ABOVE A DRAWER IS WORTHLESS WHEN THE DRAWER IS INSIDE ANOTHER DRAWER.
  // The band first shipped at the top of the passport region — which is nested
  // inside the collapsed SECONDARY WORKSPACE <details>, which holds the
  // collapsed EVIDENCE <details>. A live DOM probe found it rendering two
  // closed drawers deep: in the document, invisible to the trader. That is the
  // exact defect the band was built to end, reproduced one level up.
  it("the band renders in the primary scene, not inside the collapsed workspace", () => {
    const page = fs.readFileSync(path.join(root, "src/app/command-deck/page.tsx"), "utf8");
    const band = page.indexOf("<PassportStamp");
    const drawer = page.indexOf("wm-cd-secondary-workspace");
    expect(band).toBeGreaterThan(-1);
    expect(drawer).toBeGreaterThan(-1);
    expect(band).toBeLessThan(drawer);
  });
});
