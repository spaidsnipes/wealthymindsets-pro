/**
 * executionReadinessDisclosure — why the executionConnectivity orphan is safe,
 * and the load-bearing sentences that are the ONLY reason it is safe.
 *
 * The state, verified rather than assumed:
 *
 *   src/lib/authority/executionConnectivity.ts is a pure selector that composes
 *   an authority decision with provider readiness and a live broker receipt, so
 *   a surface can never render "order sent" from credential presence. It has
 *   ZERO production consumers — the module and its own unit test are the only
 *   two files in the repo that mention it.
 *
 * That is not currently a live defect, and this file does not wire it. The
 * reason is worth stating precisely, because it is not "the gate is running":
 *
 *   /readiness never makes the claim the gate exists to police. It renders a
 *   READY provider as "SETUP PRESENT", and says in plain words that credentials
 *   present "does not mean connected or live". The overclaim is absent because
 *   the surface REFUSES TO MAKE IT — not because anything checks it.
 *
 * So the orphan's safety rests on prose in JSX. Before this file, nothing
 * guarded that prose:
 *
 *   - selectReadinessWireboard.test.ts asserts the SELECTOR's blockerClass is
 *     "SETUP PRESENT" — real coverage, but of the selector, not the page.
 *   - responsiveShell.test.ts and brokerConnectAccessibility.test.ts read the
 *     page, but for layout and accessibility, not for truth claims.
 *
 * The page's disclaimers are hardcoded JSX strings. Change line "It does not
 * mean connected or live" to "Connected", or reword the READY row into a
 * connection claim, and WM Pro starts asserting a broker wire it has not
 * proven — while the selector built to prevent exactly that sits unwired and
 * silent. A green suite would report no problem.
 *
 * This is the §14.13 named-blocker shape: assert the CURRENT honest state so
 * the suite stays green, the orphan stays visible, and the assertions flip the
 * moment someone either wires the gate or erodes the disclosure that stands in
 * for it. Deliberately NOT wired here — resolveExecutionReady needs a real live
 * connection receipt from a provider probe, and no adapter produces one yet
 * (every BrokerAdapter.submitOrder() still returns rejected/brokerOrderId null).
 * Wiring a gate to a receipt nobody can emit would be ceremony, not proof.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SRC = join(REPO_ROOT, "src");

const GATE_MODULE = "src/lib/authority/executionConnectivity.ts";
const READINESS_PAGE = "src/app/readiness/page.tsx";

function walkProduction(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
      out.push(...walkProduction(p));
      continue;
    }
    if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * Match a bare identifier, not call syntax. A gate can be adopted point-free
 * (passed as a callback, re-exported through a barrel) and a `sym(` matcher
 * would score that as unwired. The positive control below keeps this honest.
 */
function referencingFiles(sym: string, exclude: readonly string[]): string[] {
  const hits: string[] = [];
  for (const abs of walkProduction(SRC)) {
    const rel = relative(REPO_ROOT, abs);
    if (exclude.includes(rel)) continue;
    const body = readFileSync(abs, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    if (new RegExp(`\\b${sym}\\b`).test(body)) hits.push(rel);
  }
  return hits.sort();
}

const page = () => readFileSync(join(REPO_ROOT, READINESS_PAGE), "utf8");

describe("execution readiness disclosure", () => {
  it("the detector is not vacuous and can see a real consumer", () => {
    expect(walkProduction(SRC).length).toBeGreaterThan(300);

    // POSITIVE CONTROL: selectReadinessWireboard IS wired, and the readiness
    // page is among its consumers. If the walk or the matcher silently stops
    // finding anything, this fails before the zero-count assertion below can
    // go quietly, wrongly green.
    expect(referencingFiles("selectReadinessWireboard", [])).toContain(READINESS_PAGE);
  });

  it("BLOCKER: the executionConnectivity gate has zero production consumers", () => {
    // Both the composer and its exported verdict type. If either is adopted,
    // this fails ON PURPOSE — that failure is the signal to retire this entry,
    // not to loosen the assertion.
    expect(referencingFiles("resolveExecutionReady", [GATE_MODULE])).toEqual([]);
    expect(referencingFiles("ExecutionConnectionReceipt", [GATE_MODULE])).toEqual([]);
  });

  it("the /readiness page still refuses to claim a connection it has not proven", () => {
    const src = page();

    // These four sentences are the reason the orphan above is inert. They are
    // hardcoded in JSX and were unguarded before this test.
    expect(src).toContain(
      "Credentials present means WM Pro may attempt a connection. It does not mean connected or live.",
    );
    expect(src).toContain("Presence allows an attempt. It is not a live receipt.");
    expect(src).toContain(
      "Setup present — verification required. Charts and trading are not certified by this receipt.",
    );
    expect(src).toContain("Presence of a key never");
  });

  it("a READY provider is never rendered as connected, live, or tradable", () => {
    const src = page();

    // READY means "the required env names are present" and nothing more.
    // Collect EVERY string the page gates on isReady rather than positionally
    // guessing which ternary is the label — an earlier draft of this test
    // matched the className ternary and asserted against Tailwind tokens.
    const readyBranches = [...src.matchAll(/isReady\s*\n?\s*\?\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(readyBranches.length).toBeGreaterThan(0);

    // Split the human-visible sentence from the styling branches. A class list
    // has no sentence punctuation; the digit guard keeps Tailwind's decimal
    // tokens (bg-emerald-500/[0.045]) from reading as prose.
    const prose = readyBranches.filter((s) => /[a-z]\./.test(s));
    const styling = readyBranches.filter((s) => !/[a-z]\./.test(s));

    // Both halves must be non-empty, or the filter has quietly swallowed the
    // set and the pin below would be asserting about nothing.
    expect(styling.length).toBeGreaterThan(0);

    // PINNED EXACTLY, not substring-scanned.
    //
    // The first draft banned the substrings "connected" / "live" / "certified"
    // from every READY branch. It went red against the HONEST sentence, because
    // that sentence reads "...are not certified by this receipt" — the ban
    // could not tell a claim from its negation. A prose matcher that cannot
    // parse English negation must not pretend it can: it would flag honest
    // wording and, worse, invite someone to loosen it later.
    //
    // So this asserts the whole visible sentence, exactly. Any reword goes red
    // and a human has to re-read the new wording before it ships. That is
    // strictly stronger than the substring list — it also catches overclaims
    // nobody thought to enumerate ("Order routing available", "Wire open") —
    // and it fails closed rather than guessing at meaning.
    expect(prose).toEqual([
      "Setup present — verification required. Charts and trading are not certified by this receipt.",
    ]);
  });
});
