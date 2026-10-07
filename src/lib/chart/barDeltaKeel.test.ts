import { describe, expect, it } from "vitest";
import { groupKeelGlyphs, keelLength, patchKeelGeometry, patchKeels, readKeels, sameKeelInput, type Keel, type KeelGeometry, type KeelGlyph, type KeelInput } from "./barDeltaKeel";

const row = (time: number, body: number, buy: number, sell: number, atr = 4): KeelInput =>
  ({ time, open: 100, close: 100 + body, atr, buy, sell, basis: "SIDES" });

describe("bar delta keel", () => {
  it("draws no keel without sided volume or on a balanced bar (silence is data)", () => {
    expect(readKeels([row(1, 2, 0, 0), row(2, 2, 50, 50)])).toEqual([]);
  });

  it("marks a strong keel that did not move its way as FAILED", () => {
    const [k] = readKeels([row(1, -2, 80, 20)]); // buyers won, bar closed down
    expect(k.ratio).toBeCloseTo(0.6);
    expect(k.failed).toBe(true);
    const [s] = readKeels([row(1, 0.1, 80, 20)]); // buyers won, bar barely moved
    expect(s.failed).toBe(true);
    const [ok] = readKeels([row(1, 3, 80, 20)]);
    expect(ok.failed).toBe(false);
  });

  it("tells increasing vs fading aggression through the sequence", () => {
    const ks = readKeels([row(1, 1, 60, 40), row(2, 2, 80, 20), row(3, 1, 55, 45), row(4, -1, 20, 80)]);
    expect(ks[0].change).toBeNull();
    expect(ks[1].change!).toBeGreaterThan(0);
    expect(ks[2].change!).toBeLessThan(0);
    expect(ks[3].change).toBeNull(); // sign flipped
  });

  it("length is proportional to the ratio and capped at the body width", () => {
    expect(keelLength(0.3, 10)).toBeCloseTo(5);
    expect(keelLength(-0.9, 10)).toBe(10);
    expect(keelLength(0.01, 10)).toBe(1);
  });
});

describe("incremental keels: patching the moved bars equals a full rebuild", () => {
  // Deterministic pseudo-random rows (no Math.random — reproducible).
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const mkRows = (n: number): KeelInput[] => Array.from({ length: n }, (_, i) => {
    const r = rnd();
    const basis = r < 0.5 ? "TAPE" as const : "SIDES" as const;
    const zero = r > 0.9; // no evidence → silence row
    return { time: 1000 + i * 300, open: 100, close: 100 + (rnd() - 0.5) * 6, atr: i < 3 ? NaN : 4, buy: zero ? 0 : Math.round(rnd() * 100), sell: zero ? 0 : Math.round(rnd() * 100), basis };
  });
  const strip = (ks: readonly Keel[]) => ks.map(k => ({ ...k }));

  it("no change returns the same array (the geometry replays)", () => {
    const rows = mkRows(80);
    const ks = readKeels(rows);
    expect(patchKeels(rows, ks, rows.map(r => ({ ...r })))).toBe(ks);
  });

  it("random tail / middle / length edits equal readKeels, unchanged keels keep their object", () => {
    for (let trial = 0; trial < 300; trial++) {
      const rows = mkRows(40 + Math.floor(rnd() * 60));
      const ks = readKeels(rows);
      const next = rows.map(r => ({ ...r }));
      const edits = 1 + Math.floor(rnd() * 3);
      for (let e = 0; e < edits; e++) {
        const tail = rnd() < 0.7;
        const i = tail ? next.length - 1 - Math.floor(rnd() * 3) : Math.floor(rnd() * next.length);
        const kind = rnd();
        if (kind < 0.4) next[i] = { ...next[i], buy: next[i].buy + Math.round(rnd() * 40) };
        else if (kind < 0.6) next[i] = { ...next[i], buy: 0, sell: 0 };
        else if (kind < 0.8) next[i] = { ...next[i], sell: next[i].buy }; // balanced
        else next[i] = { ...next[i], close: next[i].close + 3 };
      }
      if (rnd() < 0.15) next.push({ time: next[next.length - 1].time + 300, open: 100, close: 101, atr: 4, buy: 70, sell: 30, basis: "SIDES" });
      if (rnd() < 0.1) next.pop();
      const patched = patchKeels(rows, ks, next);
      const full = readKeels(next);
      expect(strip(patched)).toEqual(strip(full));
      // Keels before the first edited row are the previous objects.
      let d = 0; while (d < Math.min(rows.length, next.length) && sameKeelInput(rows[d], next[d])) d++;
      const firstT = d < next.length ? next[d].time : Infinity;
      patched.filter(k => k.time < firstT).forEach((k, j) => expect(k).toBe(ks[j]));
    }
  });

  it("a moved tail bar re-reads only from that bar (the 'change' chain stays exact)", () => {
    const rows = [row(1, 1, 60, 40), row(2, 2, 80, 20), row(3, 1, 70, 30)];
    const ks = readKeels(rows);
    const next = rows.slice(0, 2).concat({ ...rows[2], buy: 90, sell: 10 });
    const p = patchKeels(rows, ks, next);
    expect(p[0]).toBe(ks[0]);
    expect(p[1]).toBe(ks[1]);
    expect(p[2]).not.toBe(ks[2]);
    expect(p[2].change).toBeCloseTo(0.8 - 0.6);
    expect(strip(p)).toEqual(strip(readKeels(next)));
  });
});

describe("incremental keel geometry: patching equals the full walk", () => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const glyph = (k: number, v: number): KeelGlyph | null => {
    if (v < 0.1) return null;
    const hollow = v > 0.8;
    const x = k * 7, y = Math.round(v * 300), L = 1 + Math.round(v * 5);
    return { group: `${v > 0.5 ? "B" : "S"}${Math.min(3, Math.floor(k / 10))}`, hollow, failed: hollow || v > 0.75, rect: hollow ? [x + 0.5, y + 0.5, L - 1, 2] : [x, y, L, 2], halo: [x - 1, y - 1, L + 2, 4] };
  };
  const snap = (g: KeelGeometry) => ({ halo: [...g.halo], groups: [...g.groups].map(([k, v]) => [k, [...v.solid], [...v.hollow]]), drawn: g.drawn, failed: g.failed });

  it("in-place and regrouping patches both equal groupKeelGlyphs over all glyphs", () => {
    for (let trial = 0; trial < 300; trial++) {
      const n = 20 + Math.floor(rnd() * 60);
      const vals = Array.from({ length: n }, () => rnd());
      const geo = groupKeelGlyphs(vals.map((v, k) => glyph(k, v)));
      const next = vals.slice();
      const changed: number[] = [];
      const m = 1 + Math.floor(rnd() * 3);
      for (let e = 0; e < m; e++) {
        const k = n - 1 - Math.floor(rnd() * 4);
        // Small nudge keeps the class (in place); a big one may change group / presence (regroup).
        next[k] = rnd() < 0.6 ? Math.min(0.999, Math.max(0, vals[k] + (rnd() - 0.5) * 0.02)) : rnd();
        if (!changed.includes(k)) changed.push(k);
      }
      const patched = patchKeelGeometry(geo, changed, k => glyph(k, next[k]));
      expect(snap(patched)).toEqual(snap(groupKeelGlyphs(next.map((v, k) => glyph(k, v)))));
      expect(patched.glyphs).toEqual(next.map((v, k) => glyph(k, v)));
    }
  });

  it("an unchanged class is overwritten in place (no new arrays)", () => {
    const geo = groupKeelGlyphs([glyph(0, 0.3), glyph(1, 0.6), glyph(2, 0.62)]);
    const halo = geo.halo;
    const out = patchKeelGeometry(geo, [2], k => glyph(k, 0.65));
    expect(out).toBe(geo);
    expect(out.halo).toBe(halo);
    expect(snap(out)).toEqual(snap(groupKeelGlyphs([glyph(0, 0.3), glyph(1, 0.6), glyph(2, 0.65)])));
  });
});
