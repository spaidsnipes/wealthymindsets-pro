import { describe, expect, it } from "vitest";
import { runOp, type LoungeActor } from "./loungeStore";

function fakeRest() {
  const calls: { path: string; body: Record<string, unknown> | null }[] = [];
  const rest = async <T,>(path: string, init: RequestInit = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path, body });
    return [{ id: 1, ...body }] as unknown as T;
  };
  return { calls, rest };
}
const base: LoungeActor = { ownerId: "0b9f1c2e-3d4a-4b5c-8d6e-7f8091a2b3c4", handle: "anyone", name: "A", avatar: "" };

describe("one Lounge: Crown W is derived on the server", () => {
  it("a core-team account (verified email) posts with the crown and check", async () => {
    const { calls, rest } = fakeRest();
    await runOp(rest, { ...base, email: "DHILL5711@gmail.com" }, { op: "post", content: "hi" });
    expect(calls[0].body).toMatchObject({ user_ceo: true, user_verified: true });
  });
  it("anyone else — even naming a core handle or sending badge fields — gets none", async () => {
    const { calls, rest } = fakeRest();
    await runOp(rest, { ...base, handle: "@petey", email: "x@example.com" }, { op: "post", content: "hi", user_ceo: true, user_verified: true } as never);
    expect(calls[0].body).toMatchObject({ user_ceo: false, user_verified: false, user_handle: "@petey" });
  });
});
