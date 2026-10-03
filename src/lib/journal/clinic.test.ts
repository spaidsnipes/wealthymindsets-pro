import { describe, expect, it } from "vitest";
import { clinicProgress, parseClinic } from "./clinic";

describe("Diagnostic Clinic notes — the trader's words only, known fields only", () => {
  it("keeps known fields, drops unknown, counts progress per body", () => {
    const all = parseClinic(JSON.stringify({ "A|TSLA|x": { regime: "M2 rotation", location: "chased the high", behaviour: "re-entry after a loss", trigger: "missed the first move", hacked: "nope" } }));
    expect(Object.keys(all["A|TSLA|x"]).sort()).toEqual(["behaviour", "location", "regime", "trigger"]);
    expect(clinicProgress(all["A|TSLA|x"])).toEqual({ market: 2, student: 1, chain: 1, total: 17 });
    expect(parseClinic("{bad")).toEqual({});
  });
});
