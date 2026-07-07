"use client";

/**
 * WM Sound FX — the toggleable "squabble / boxing" sound layer.
 *
 * HONESTY: every sound here is SYNTHESIZED live via the Web Audio API
 * (oscillators + a noise buffer). There are NO recorded or licensed audio
 * files shipped or fetched — nothing to source, nothing to attribute. That
 * keeps the feature 100% ours and copyright-clean while still giving the
 * ring-side "ding" and body-shot "thump" the boxing theme asks for.
 *
 * Design rules:
 *  • OFF by default (opt-in) — we never surprise a user with sound.
 *  • Lazy AudioContext, created only on the first play AFTER a user gesture
 *    (browsers block audio before a gesture; the toggle click IS that gesture).
 *  • Light throttle so a burst of signal flips can't machine-gun the speakers.
 *  • Every path is wrapped so a missing/blocked AudioContext degrades to silence,
 *    never a thrown error.
 */

const KEY = "wm_sfx";
let ctx: AudioContext | null = null;
let lastPlay = 0;

export function isSfxOn(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(KEY) === "on"; } catch { return false; }
}

export function setSfxOn(on: boolean): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* private mode */ }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export type SfxKind = "bell" | "punch" | "coin";

/**
 * Play a synthesized SFX. Respects the on/off toggle (unless `force`) and a
 * ~60ms throttle. Returns true iff a sound was actually scheduled — handy for
 * verification, since audibility itself can't be asserted headlessly.
 */
export function playSfx(kind: SfxKind, opts?: { force?: boolean }): boolean {
  try {
    if (!opts?.force && !isSfxOn()) return false;
    const c = audio();
    if (!c) return false;
    if (performance.now() - lastPlay < 60) return false;
    lastPlay = performance.now();
    const now = c.currentTime;

    if (kind === "punch") {
      // Body shot: a short noise burst through a down-sweeping lowpass, plus a
      // low sine "thump" for weight.
      const dur = 0.14;
      const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const noise = c.createBufferSource(); noise.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = "lowpass";
      lp.frequency.setValueAtTime(1800, now);
      lp.frequency.exponentialRampToValueAtTime(300, now + dur);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.5, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      noise.connect(lp); lp.connect(ng); ng.connect(c.destination);
      noise.start(now); noise.stop(now + dur);

      const osc = c.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.35, now + 0.008);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(og); og.connect(c.destination);
      osc.start(now); osc.stop(now + 0.14);
      return true;
    }

    if (kind === "coin") {
      // Cash-register: two quick rising blips.
      [0, 0.07].forEach((t, i) => {
        const o = c.createOscillator(); o.type = "square";
        o.frequency.value = i === 0 ? 988 : 1319;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.10, now + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.09);
        o.connect(g); g.connect(c.destination);
        o.start(now + t); o.stop(now + t + 0.1);
      });
      return true;
    }

    // "bell" — the ring-side "ding-ding" (a carrier + one partial, struck twice).
    [0, 0.16].forEach((t) => {
      const car = c.createOscillator(); car.type = "sine"; car.frequency.value = 680;
      const par = c.createOscillator(); par.type = "sine"; par.frequency.value = 1360;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.16, now + t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.34);
      const pg = c.createGain(); pg.gain.value = 0.5;
      car.connect(g); par.connect(pg); pg.connect(g); g.connect(c.destination);
      car.start(now + t); car.stop(now + t + 0.36);
      par.start(now + t); par.stop(now + t + 0.36);
    });
    return true;
  } catch {
    return false;
  }
}
