import { describe, expect, it } from "vitest";
import { signGrantBody, verifyClassroomGrant } from "./classroomGrant";

const SECRET = "x".repeat(48);
const now = 1_800_000_000;
const grant = (over: Record<string, unknown> = {}) => JSON.stringify({ room: "wow-cls-cls_abcDEF12345", identity: "wow:clm_abcDEF12345", name: "Dave", canPublish: true, exp: now + 60, ...over });

describe("WOW classroom grants", () => {
  it("accepts a fresh grant WOW signed for a classroom room", async () => {
    const b = grant();
    const r = await verifyClassroomGrant(SECRET, b, await signGrantBody(SECRET, b), now);
    expect(r.ok && r.grant.room).toBe("wow-cls-cls_abcDEF12345");
  });
  it("refuses unsigned, forged, expired and long-lived grants", async () => {
    const b = grant();
    expect(await verifyClassroomGrant(SECRET, b, null, now)).toMatchObject({ ok: false, error: "GRANT_UNSIGNED" });
    expect(await verifyClassroomGrant(SECRET, b, await signGrantBody("y".repeat(48), b), now)).toMatchObject({ ok: false, error: "GRANT_SIGNATURE_INVALID" });
    const old = grant({ exp: now - 1 });
    expect(await verifyClassroomGrant(SECRET, old, await signGrantBody(SECRET, old), now)).toMatchObject({ ok: false, error: "GRANT_EXPIRED" });
    const long = grant({ exp: now + 3600 });
    expect(await verifyClassroomGrant(SECRET, long, await signGrantBody(SECRET, long), now)).toMatchObject({ ok: false, error: "GRANT_EXPIRED" });
  });
  it("never mints for WM Lounge or WOW TV stages, or for non-member identities", async () => {
    for (const [over, err] of [[{ room: "wm-nq-morning" }, "NOT_A_CLASSROOM"], [{ room: "wmtv-live-room" }, "NOT_A_CLASSROOM"], [{ identity: "wm:founder" }, "NOT_A_CLASSROOM_MEMBER"]] as const) {
      const b = grant(over);
      expect(await verifyClassroomGrant(SECRET, b, await signGrantBody(SECRET, b), now)).toMatchObject({ ok: false, error: err });
    }
  });
  it("says NOT CONFIGURED when the shared secret is missing or weak", async () => {
    expect(await verifyClassroomGrant(undefined, grant(), "sig", now)).toMatchObject({ ok: false, status: 503 });
    expect(await verifyClassroomGrant("short", grant(), "sig", now)).toMatchObject({ ok: false, status: 503 });
  });
});
