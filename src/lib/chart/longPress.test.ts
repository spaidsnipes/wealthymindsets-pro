import { describe, expect, it } from "vitest";
import { createLongPress, LONG_PRESS_DELAY_MS } from "./longPress";

const harness = () => {
  const timers: { fn: () => void; at: number; id: number }[] = [];
  let now = 0, id = 0;
  const fired: [number, number][] = [];
  const lp = createLongPress({
    onFire: (x, y) => fired.push([x, y]),
    setTimer: (fn, ms) => { const t = { fn, at: now + ms, id: ++id }; timers.push(t); return t.id; },
    clearTimer: t => { const i = timers.findIndex(x => x.id === t); if (i >= 0) timers.splice(i, 1); },
  });
  const advance = (ms: number) => { now += ms; for (const t of [...timers]) if (t.at <= now) { timers.splice(timers.indexOf(t), 1); t.fn(); } };
  return { lp, fired, advance };
};
const P = (pointerId: number, pointerType: string, clientX: number, clientY: number) => ({ pointerId, pointerType, clientX, clientY });

describe("long-press opens the menu on a touch screen — no contextmenu event needed", () => {
  it("a still touch fires once at the press point after the delay, and the following click is swallowed once", () => {
    const { lp, fired, advance } = harness();
    lp.down(P(1, "touch", 120, 300));
    advance(LONG_PRESS_DELAY_MS - 1);
    expect(fired).toEqual([]);
    advance(1);
    expect(fired).toEqual([[120, 300]]);
    lp.up(P(1, "touch", 120, 300));
    expect(lp.consumeClick()).toBe(true);
    expect(lp.consumeClick()).toBe(false);
  });
  it("never fights a pan, a pinch, an early lift or a mouse", () => {
    const h1 = harness(); h1.lp.down(P(1, "touch", 100, 100)); h1.lp.move(P(1, "touch", 110, 100)); h1.advance(600); expect(h1.fired).toEqual([]);
    const h2 = harness(); h2.lp.down(P(1, "touch", 100, 100)); h2.lp.down(P(2, "touch", 200, 100)); h2.advance(600); expect(h2.fired).toEqual([]);
    const h3 = harness(); h3.lp.down(P(1, "touch", 100, 100)); h3.lp.up(P(1, "touch", 100, 100)); h3.advance(600); expect(h3.fired).toEqual([]); expect(h3.lp.consumeClick()).toBe(false);
    const h4 = harness(); h4.lp.down(P(1, "mouse", 100, 100)); h4.advance(600); expect(h4.fired).toEqual([]);
    const h5 = harness(); h5.lp.down(P(1, "pen", 100, 100)); h5.lp.move(P(1, "pen", 104, 103)); h5.advance(600); expect(h5.fired).toEqual([[100, 100]]); // within slop
  });
});
