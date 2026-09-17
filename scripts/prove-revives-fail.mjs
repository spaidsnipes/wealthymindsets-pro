#!/usr/bin/env node
/**
 * THE PROOFS WERE ONLY EVER RUN IN THE DIRECTION THAT PASSES.
 *
 * ── The gap this closes ──────────────────────────────────────────────────────
 *
 * `prove-vp-pixels.mjs` and `prove-bubble-pixels.mjs` each carry a `WM_*_REVIVE`
 * switch that swaps a real defect into the paint path, so every law can be made
 * to fail on demand. Both files argue, correctly, that this is what separates a
 * measurement from a rubber stamp:
 *
 *   "A law that cannot be made to fail is not a measurement."
 *
 * The VP file goes further and records that THREE OF ITS FIVE LAWS WERE WRITTEN
 * WRONG THE FIRST TIME, and were "only found because their revive ran GREEN".
 * So the revives are not documentation. They are the instrument that caught the
 * instrument, and they are the reason those five laws can be trusted at all.
 *
 * CI ran neither of them. It ran `npm run prove:vp-pixels` and
 * `npm run prove:bubble-pixels` clean, and nothing else. Ten revive modes
 * existed; zero were executed by anything automated.
 *
 * That is the precise failure mode this codebase already names as one it has
 * SHIPPED FOR REAL: a detector that silently stops matching reports "no
 * offences" forever, and a permanently-green check is indistinguishable from a
 * clean bill of health. If a fixture drifts until it can no longer express the
 * defect — exactly what happened to `BOT_Y` at 520 and to bucket 1's even bar
 * width — the clean run stays green and says nothing. The revive is the only
 * thing that notices.
 *
 * ── What this asserts ────────────────────────────────────────────────────────
 *
 * For every proof script that declares revive modes: each mode must exit RED.
 *
 *   exit 1  the defect was injected and a law fired.        ← the only pass
 *   exit 0  the defect was injected and NOTHING fired.      ← the law is dead
 *   exit 2  the script could not measure at all.            ← not a result
 *
 * Exit 0 and exit 2 are reported as different offences on purpose. "The law
 * stopped measuring" and "no browser could be launched" are different problems
 * and collapsing them would let a broken environment read as a dead law, or
 * worse, let a dead law hide behind a blamed environment.
 *
 * ── Why it DISCOVERS the scripts instead of listing them ─────────────────────
 *
 * A hard-coded list of two files is a coverage hole with a deadline: the moment
 * someone adds a third pixel proof with its own revive switch, this guard would
 * keep passing while silently never running it — which is the same blindness it
 * was written to cure, one level up.
 *
 * So it scans `scripts/` for files that declare `REVIVE_MODES`, and reads both
 * the mode list AND the environment variable name out of each file's own
 * source. Adding a law with a revive enrols it here automatically. Deleting the
 * last revive from a proof, or renaming the env var so the switch is dead, both
 * surface as offences rather than as silence.
 *
 * ── The guard's own vacuity guard ────────────────────────────────────────────
 *
 * If the scan matched nothing, every loop below would be empty and this file
 * would exit 0 — a green check proving that nothing was checked. That is the
 * failure it exists to prevent, so it refuses to report at all in that case.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/prove-revives-fail.mjs
 *
 * Exit 0 when every declared revive still fails, 1 on any offence, 2 when the
 * guard could not establish what it was supposed to check.
 */

import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = join(ROOT, "scripts");
const SELF = "prove-revives-fail.mjs";

/* ── Discover the proofs and read their switches out of their own source ──── */

const discovered = [];
for (const file of readdirSync(SCRIPTS).sort()) {
  if (!file.endsWith(".mjs") || file === SELF) continue;
  const src = readFileSync(join(SCRIPTS, file), "utf8");

  // The declaration, not a mention of it in prose.
  const decl = src.match(/const\s+REVIVE_MODES\s*=\s*\[([^\]]*)\]/);
  if (!decl) continue;

  const modes = [...decl[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const envMatch = src.match(/process\.env\.(WM_[A-Z0-9_]*REVIVE)/);

  discovered.push({ file, modes, env: envMatch ? envMatch[1] : null });
}

const offences = [];
const fail = (law, detail) => offences.push({ law, detail });

/* ── Vacuity: this guard must never pass by having found nothing ─────────── */

if (discovered.length === 0) {
  console.log(
    "REFUSING TO REPORT — no proof script in scripts/ declares REVIVE_MODES.\n" +
      "Either every revive switch has been deleted, or the declaration was\n" +
      "reshaped so this scan no longer sees it. Both mean the pixel laws are\n" +
      "now unfalsifiable, and neither is something to report as clean.",
  );
  process.exit(2);
}

/* ── Run every declared revive and require RED ───────────────────────────── */

console.log(`\nREVIVE PROOF — every pixel law must still be capable of failing\n`);

let executed = 0;
for (const proof of discovered) {
  if (!proof.env) {
    fail(
      "SWITCH_UNREACHABLE",
      `${proof.file} declares REVIVE_MODES but never reads a WM_*_REVIVE env var — ` +
        `the modes cannot be selected, so the laws are unfalsifiable in practice`,
    );
    continue;
  }
  if (proof.modes.length === 0) {
    fail(
      "NO_MODES",
      `${proof.file} declares an EMPTY REVIVE_MODES — its laws have no way to be made to fail`,
    );
    continue;
  }

  console.log(`  ${proof.file}  (${proof.env}, ${proof.modes.length} modes)`);
  for (const mode of proof.modes) {
    const run = spawnSync(process.execPath, [join(SCRIPTS, proof.file)], {
      cwd: ROOT,
      env: { ...process.env, [proof.env]: mode },
      encoding: "utf8",
    });
    executed++;

    const code = run.status;
    if (code === 1) {
      const offence = (run.stdout ?? "").split("\n").find((l) => /^\s{2}[A-Z_]+\s{2}/.test(l));
      console.log(`    RED   ${mode.padEnd(14)} ${(offence ?? "").trim().slice(0, 96)}`);
    } else if (code === 0) {
      console.log(`    GREEN ${mode.padEnd(14)} ← the defect was injected and no law noticed`);
      fail(
        "LAW_STOPPED_MEASURING",
        `${proof.file} ${proof.env}=${mode} exited CLEAN. The defect was swapped in and ` +
          `every law still passed, so whichever law owns this defect is no longer measuring ` +
          `it — most often because the fixture drifted until it can no longer express the ` +
          `defect, which is how this file's own BOT_Y and bar-width cases were found`,
      );
    } else {
      console.log(`    ERROR ${mode.padEnd(14)} exit ${code}`);
      fail(
        "COULD_NOT_MEASURE",
        `${proof.file} ${proof.env}=${mode} exited ${code}, which is neither a pass nor a ` +
          `failing law. "Could not measure" must never be reportable as "found nothing". ` +
          `stderr: ${(run.stderr ?? "").trim().split("\n").slice(-2).join(" / ").slice(0, 200)}`,
      );
    }
  }
}

/* ── Report ──────────────────────────────────────────────────────────────── */

console.log("");
if (offences.length === 0) {
  console.log(
    `CLEAN — ${executed} revive modes across ${discovered.length} proof scripts all still fail.`,
  );
  console.log("SCOPE: this proves the pixel laws remain FALSIFIABLE. It does not re-prove");
  console.log("the clean runs — those are separate steps, and both directions are required.");
  process.exit(0);
}

console.log(`${offences.length} OFFENCE(S)`);
for (const o of offences) console.log(`  ${o.law}  ${o.detail}`);
process.exit(1);
