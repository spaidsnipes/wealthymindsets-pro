import { describe, expect, it } from "vitest";
import { paintQuestionMark, QUESTION_MARK_SHAPE } from "./questionLensMark";

const rec = () => {
  const calls: string[] = [];
  const ctx = new Proxy({ strokeStyle: "", fillStyle: "", lineWidth: 1 } as Record<string, unknown>, {
    get(t, k: string) { if (k in t) return t[k]; return (...a: unknown[]) => { calls.push(k); void a; }; },
    set(t, k: string, v) { t[k] = v; return true; },
  });
  return { ctx: ctx as never, calls };
};

describe("Question Lens identity marks (ASK-5)", () => {
  it("seven kinds, seven distinct shapes", () => {
    const shapes = Object.values(QUESTION_MARK_SHAPE);
    expect(shapes).toHaveLength(7);
    expect(new Set(shapes).size).toBe(7);
  });
  it("each kind paints, in one ink; an unknown kind paints nothing", () => {
    for (const k of Object.keys(QUESTION_MARK_SHAPE)) {
      const { ctx, calls } = rec();
      expect(paintQuestionMark(ctx, k, 10, 10, "rgba(237,230,211,0.95)")).toBe(true);
      expect(calls.some(c => c === "stroke" || c === "fillRect")).toBe(true);
    }
    const { ctx, calls } = rec();
    expect(paintQuestionMark(ctx, "AUTO", 10, 10, "x")).toBe(false);
    expect(calls).toEqual([]);
  });
});
