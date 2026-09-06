/**
 * §9 COLOR + MOTION LAW — green is not a promise, and a pulse is not decoration.
 *
 * ── The two sentences this file enforces ─────────────────────────────────────
 *
 *   "GOLD is identity metal only. Amber is pending or estimated, and carries a
 *    word. Red is unprotected or rejected, and carries a word. NO GREEN SHIELD.
 *    No green LIVE pip."
 *
 *   "WAIT and CLOSED do not pulse."
 *
 * ── Why these two travel together ────────────────────────────────────────────
 *
 * Separately each is a style note. Combined they describe one specific lie that
 * trading interfaces tell constantly, and that WM Pro was telling in six places:
 * a small GREEN dot that PULSES.
 *
 * That pair is the universal grammar for "a live feed is arriving here, and
 * things are fine". It is read pre-attentively — before any label, in
 * peripheral vision, in the half-second a trader glances at a screen to decide
 * whether to worry. Which is exactly why it must never appear unless both
 * halves are true, and why colour must never be the only thing saying it.
 *
 * The six sites found on the sweep that produced this file, and what each was
 * actually claiming:
 *
 *   /paper header            — green pulse beside the words "PAPER SIMULATION".
 *                              Nothing on that route is live and no order
 *                              reaches a broker. Pixel and word in direct
 *                              contradiction.
 *   WMSessionVP header       — green pulse conditioned on NOTHING. It reported
 *                              no event and proved no feed. Deleted; there was
 *                              no true statement to preserve.
 *   PnLStatsPanel            — green/red pulse beside a total labelled "from
 *                              journal". A settled historical figure animated
 *                              as though it were ticking.
 *   Upside Only promo        — green pulse on an EXTERNAL partner advert.
 *   ChartToolbar search      — honest MOTION (gated on `liveSearching`) wearing
 *                              the wrong COLOUR. An unreturned search is a
 *                              PENDING state, which §9 assigns to amber.
 *   MainChart LIVE pip       — the hardest case, and the one §9 names. The
 *                              motion is earned: it is gated on `status.live`,
 *                              a certified quote. The COLOUR was still wrong,
 *                              because a certified quote proves the DATA is
 *                              current and proves nothing at all about whether
 *                              the trade is safe. Green said the second thing.
 *
 * ── What this test does and does not claim ───────────────────────────────────
 *
 * It bans the PAIR, not either half. Green survives where it is carrying
 * direction rather than reassurance — a positive P&L figure, an up-arrow — and
 * motion survives where it reports a real event with a real gate. Banning
 * either alone would be a style rule; banning the combination is a truth rule,
 * because the combination is what makes the false claim legible at a glance.
 *
 * It is a source scan, so it sees literal class strings only. A green pulse
 * assembled at runtime from variables would pass. That is a real limit and is
 * named here rather than papered over: this converts the easy, thoughtless
 * reintroduction into a build failure, which is what it is for. It does not
 * pretend to be unbypassable — a sentinel that overstates its own authority is
 * the thing it exists to catch.
 *
 * Two more limits, stated rather than skipped:
 *
 *   - The green-plus-pulse ban is REPO-WIDE. The stricter law below — that
 *     every surviving pulse must be gated on a real event — is enforced only
 *     on the files this sweep actually audited. Extending it repo-wide is real
 *     remaining work, not an oversight, and it needs a judgement call this
 *     file does not make: loading skeletons pulse unconditionally and are
 *     RIGHT to, because "the content is not here yet" is itself the event.
 *   - It says nothing about green used for DIRECTION. A green up-arrow on a
 *     positive P&L is reporting a fact, and the fourth test below exists to
 *     make sure a future cleanup does not read this file as a licence to
 *     delete green from the product entirely.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const SRC = resolve(__dirname, "..", "..");

/** Every green in the product's vocabulary, token and literal. */
const GREEN =
  /(?:wm-green|emerald|#00D4AA|#00A888|#00C853|#00E060|#00A844|#22c55e|#16a34a|#0e9f6e|#21F3A3)/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC);

describe("§9 COLOR + MOTION LAW — no green pulsing pip anywhere in WM Pro", () => {
  it("finds source files to scan at all (positive control)", () => {
    // A walker that silently returns nothing would make every assertion below
    // vacuously true — the exact failure this whole shift keeps closing.
    expect(FILES.length).toBeGreaterThan(200);
    expect(FILES.some((f) => f.endsWith("app/paper/page.tsx"))).toBe(true);
    expect(FILES.some((f) => f.endsWith("components/chart/MainChart.tsx"))).toBe(true);
  });

  it("no className combines a green token with animate-pulse", () => {
    const violations: string[] = [];
    for (const file of FILES) {
      const source = readFileSync(file, "utf8");
      const lines = source.split("\n");
      lines.forEach((line, i) => {
        // Class strings only: `className="…"`, template literals, and the
        // ternary branches inside them are all covered by scanning any quoted
        // run that contains `animate-pulse`.
        for (const m of line.matchAll(/(["'`])([^"'`]*animate-pulse[^"'`]*)\1/g)) {
          if (GREEN.test(m[2])) {
            violations.push(`${relative(SRC, file)}:${i + 1} — ${m[2].trim()}`);
          }
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it("keeps the green vocabulary itself intact — this is not a ban on green", () => {
    /**
     * Positive control in the other direction. If a future cleanup simply
     * deleted green from the codebase, the assertion above would pass while the
     * product lost its ability to show direction at all. Green carrying
     * DIRECTION (a P&L sign, an up-arrow) is legitimate and must survive; only
     * green carrying REASSURANCE-plus-motion is forbidden.
     */
    const stillGreen = FILES.filter((f) => GREEN.test(readFileSync(f, "utf8")));
    expect(stillGreen.length).toBeGreaterThan(10);
  });

  it("the pulses that survive are gated on a real event, not on nothing", () => {
    /**
     * The deeper law. A pulse must report something. This checks the specific
     * surfaces whose motion was KEPT during the sweep, and pins each to the
     * condition that earns it — so deleting the gate while keeping the
     * animation fails here rather than shipping as ambient shimmer.
     */
    /**
     * Read as: EVERY `animate-pulse` in this file must have its gate within the
     * preceding N lines. Written as an every-occurrence check rather than a
     * "somewhere in the file" match, because the latter passes as soon as ONE
     * gated pulse exists and would happily ignore an ungated second one added
     * beside it.
     */
    const cases: ReadonlyArray<{
      readonly file: string;
      readonly gate: RegExp;
      readonly lookbehind: number;
      readonly pulses: number;
    }> = [
      {
        // Two, and both earned. `status.live` is a certified quote actually
        // arriving; `closeFlash` fires as the bar is about to close, which is
        // the one moment where urgency on a chart is the literal truth.
        file: "components/chart/MainChart.tsx",
        gate: /status\.live|closeFlash/,
        lookbehind: 20,
        pulses: 2,
      },
      {
        file: "components/chart/ChartToolbar.tsx",
        gate: /liveSearching/,
        lookbehind: 12,
        pulses: 1,
      },
      {
        // Two survive: someone is audibly speaking right now, and a join
        // request is genuinely outstanding. A third — an unconditional dot in
        // the room header, wired to no state at all — was removed by this
        // sweep, which is why the count is pinned rather than left open.
        file: "components/lounge/LiveRoom.tsx",
        gate: /isSpeaking|myRequestState === "pending"/,
        lookbehind: 16,
        pulses: 2,
      },
    ];

    const ungated: string[] = [];
    for (const c of cases) {
      const lines = readFileSync(resolve(SRC, c.file), "utf8").split("\n");
      let seen = 0;
      lines.forEach((line, i) => {
        if (!line.includes("animate-pulse")) return;
        seen++;
        const window = lines.slice(Math.max(0, i - c.lookbehind), i).join("\n");
        if (!c.gate.test(window)) ungated.push(`${c.file}:${i + 1}`);
      });
      // Positive control per file: a pulse that was deleted outright would make
      // "every pulse is gated" trivially true.
      expect(`${c.file} pulses: ${seen}`).toBe(`${c.file} pulses: ${c.pulses}`);
    }
    expect(ungated).toEqual([]);
  });

  it("a surviving pulse never carries its meaning in colour alone", () => {
    /**
     * §9's colour clauses all end "…and a word". The reason is not tidiness:
     * roughly one in twelve men cannot separate these hues, and a claim only a
     * subset of traders can read is not disclosed, it is decorated.
     *
     * So each kept pulse must sit beside text a screen reader will announce.
     */
    const cases: ReadonlyArray<{ readonly file: string; readonly word: RegExp }> = [
      { file: "components/chart/MainChart.tsx", word: /LIVE — CERTIFIED QUOTE/ },
      { file: "components/chart/ChartToolbar.tsx", word: /Searching all global markets/ },
      { file: "components/lounge/LiveRoom.tsx", word: /sr-only[\s\S]{0,80}?is speaking/ },
    ];
    for (const c of cases) {
      const source = readFileSync(resolve(SRC, c.file), "utf8");
      expect(`${c.file}: ${c.word.test(source)}`).toBe(`${c.file}: true`);
    }
  });
});
