import { describe, expect, it } from "vitest";
import { signGrantBody } from "@/lib/livekit/classroomGrant";
import { verifyClassroomGrant } from "@/lib/livekit/classroomGrant";
import { verifyWowPostGrant } from "./wowPostGrant";

const SECRET = "x".repeat(48);
const now = 1_800_000_000;
const UID = "0b9f1c2e-3d4a-4b5c-8d6e-7f8091a2b3c4";
const post = (over: Record<string, unknown> = {}) => JSON.stringify({ kind: "lounge_post", user_id: UID, handle: "noosleep", name: "Dave", content: "From WOW", type: "text", tags: ["wow"], exp: now + 60, ...over });

describe("WOW Lounge post grants", () => {
  it("accepts a fresh post WOW signed for a Passport member", async () => {
    const b = post();
    const r = await verifyWowPostGrant(SECRET, b, await signGrantBody(SECRET, b), now);
    expect(r.ok && r.grant).toMatchObject({ user_id: UID, handle: "noosleep", content: "From WOW" });
  });
  it("refuses unsigned, forged, expired and long-lived posts", async () => {
    const b = post();
    expect(await verifyWowPostGrant(SECRET, b, null, now)).toMatchObject({ ok: false, error: "POST_UNSIGNED" });
    expect(await verifyWowPostGrant(SECRET, b, await signGrantBody("y".repeat(48), b), now)).toMatchObject({ ok: false, error: "POST_SIGNATURE_INVALID" });
    for (const exp of [now - 1, now + 3600]) {
      const x = post({ exp });
      expect(await verifyWowPostGrant(SECRET, x, await signGrantBody(SECRET, x), now)).toMatchObject({ ok: false, error: "POST_EXPIRED" });
    }
  });
  it("a classroom grant can never become a post, and a post can never become a classroom grant", async () => {
    const cls = JSON.stringify({ room: "wow-cls-cls_abcDEF12345", identity: "wow:clm_abcDEF12345", name: "Dave", canPublish: true, exp: now + 60 });
    expect(await verifyWowPostGrant(SECRET, cls, await signGrantBody(SECRET, cls), now)).toMatchObject({ ok: false, error: "NOT_A_LOUNGE_POST" });
    const b = post();
    expect(await verifyClassroomGrant(SECRET, b, await signGrantBody(SECRET, b), now)).toMatchObject({ ok: false });
  });
  it("refuses non-Passport ids, bad handles and empty or huge posts", async () => {
    for (const [over, err] of [[{ user_id: "wm:founder" }, "NOT_A_PASSPORT"], [{ handle: "<script>" }, "HANDLE_INVALID"], [{ content: "  " }, "Post must be 1–5000 characters."], [{ content: "a".repeat(5001) }, "Post must be 1–5000 characters."]] as const) {
      const b = post(over);
      expect(await verifyWowPostGrant(SECRET, b, await signGrantBody(SECRET, b), now)).toMatchObject({ ok: false, error: err });
    }
  });
  it("says NOT CONFIGURED when the shared secret is missing or weak", async () => {
    expect(await verifyWowPostGrant(undefined, post(), "sig", now)).toMatchObject({ ok: false, status: 503 });
    expect(await verifyWowPostGrant("short", post(), "sig", now)).toMatchObject({ ok: false, status: 503 });
  });
});
