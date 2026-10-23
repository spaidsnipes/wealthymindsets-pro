import { describe, expect, it } from "vitest";
import { signGrantBody, verifyClassroomGrant } from "@/lib/livekit/classroomGrant";
import { verifyWowLoungeGrant } from "./wowPostGrant";

const SECRET = "x".repeat(48);
const now = 1_800_000_000;
const UID = "0b9f1c2e-3d4a-4b5c-8d6e-7f8091a2b3c4";
const grant = (over: Record<string, unknown> = {}) => JSON.stringify({ kind: "lounge_op", owner_id: UID, fallback_handle: "WOW-ABCD-1234", fallback_name: "Dave", op: { op: "post", content: "From WOW" }, exp: now + 60, ...over });
const signed = async (b: string) => verifyWowLoungeGrant(SECRET, b, await signGrantBody(SECRET, b), now);

describe("WOW → one Lounge grants", () => {
  it("accepts every Lounge op WOW signs for a Passport member", async () => {
    for (const op of [{ op: "feed" }, { op: "comments", postId: 3 }, { op: "post", content: "x" }, { op: "comment", postId: 3, body: "y" }, { op: "like", postId: 3 }, { op: "unlike", postId: 3 }, { op: "delete", postId: 3 }, { op: "follow", handle: "a" }, { op: "unfollow", handle: "a" }]) {
      const r = await signed(grant({ op }));
      expect(r.ok && r.grant.op.op).toBe(op.op);
    }
  });
  it("still reads the first WOW release's lounge_post grant as a post", async () => {
    const r = await signed(JSON.stringify({ kind: "lounge_post", user_id: UID, handle: "WOW-ABCD-1234", name: "Dave", content: "hi", type: "text", tags: [], exp: now + 60 }));
    expect(r.ok && r.grant).toMatchObject({ owner_id: UID, op: { op: "post", content: "hi" } });
  });
  it("refuses unsigned, forged, expired and long-lived grants", async () => {
    const b = grant();
    expect(await verifyWowLoungeGrant(SECRET, b, null, now)).toMatchObject({ ok: false, error: "GRANT_UNSIGNED" });
    expect(await verifyWowLoungeGrant(SECRET, b, await signGrantBody("y".repeat(48), b), now)).toMatchObject({ ok: false, error: "GRANT_SIGNATURE_INVALID" });
    for (const exp of [now - 1, now + 3600]) expect(await signed(grant({ exp }))).toMatchObject({ ok: false, error: "GRANT_EXPIRED" });
  });
  it("a classroom grant can never become a Lounge op, and a Lounge grant can never become a classroom grant", async () => {
    const cls = JSON.stringify({ room: "wow-cls-cls_abcDEF12345", identity: "wow:clm_abcDEF12345", name: "Dave", canPublish: true, exp: now + 60 });
    expect(await signed(cls)).toMatchObject({ ok: false, error: "NOT_A_LOUNGE_GRANT" });
    const b = grant();
    expect(await verifyClassroomGrant(SECRET, b, await signGrantBody(SECRET, b), now)).toMatchObject({ ok: false });
  });
  it("refuses non-Passport ids, bad handles and unknown ops", async () => {
    expect(await signed(grant({ owner_id: "wm:founder" }))).toMatchObject({ ok: false, error: "NOT_A_PASSPORT" });
    expect(await signed(grant({ fallback_handle: "<script>" }))).toMatchObject({ ok: false, error: "HANDLE_INVALID" });
    expect(await signed(grant({ op: { op: "drop_table" } }))).toMatchObject({ ok: false, error: "Unknown op" });
  });
  it("says NOT CONFIGURED when the shared secret is missing or weak", async () => {
    expect(await verifyWowLoungeGrant(undefined, grant(), "sig", now)).toMatchObject({ ok: false, status: 503 });
    expect(await verifyWowLoungeGrant("short", grant(), "sig", now)).toMatchObject({ ok: false, status: 503 });
  });
});
