import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * INTERNAL ANCHOR NAVIGATION SENTINEL
 *
 * A ROOM MAY NOT REBOOT THE MACHINE.
 *
 * MEASURED LIVE on production (2026-09-18). Clicked the OS rail's Charts
 * door from /command-deck, then read the Navigation Timing entry:
 *
 *     navType "navigate" · loadEventEnd 745ms · 35 resources refetched
 *     a window global set one instant earlier: GONE
 *
 * A raw `<a href="/room">` is a DOCUMENT LOAD. In a product that calls
 * itself an operating system, crossing a door must be a client-side
 * transition, because the in-memory session IS the product: the live tape
 * subscription, and `priorStory` — the prior snapshot the canon §4
 * Auto-Quiet gate compares against. Destroy it and SECONDARY NOISE can
 * only read "Unwatched" after every door, however long the trader has
 * been watching.
 *
 * WHY THIS FILE EXISTS AND NOT JUST FOUR FIXES:
 *   The frame's two doors were fixed first, under their own sentinel. But
 *   a census of `src/**\/*.tsx` found the same defect at three more call
 *   sites in three unrelated files, none of which imported `next/link`.
 *   That is the species this shift keeps meeting: AN OWNER BEATS A
 *   CONVENTION — a convention is re-decided at every call site, and the
 *   sixth decision was wrong. This file is the owner. The rule is now
 *   decided once and CHECKED, instead of remembered.
 *
 * WHY A SOURCE SCAN, WHICH IS WEAKER THAN MEASUREMENT:
 *   The defect is an ELEMENT TYPE. `next/link` and a raw anchor emit the
 *   identical `<a href="...">` in static markup — which is exactly why the
 *   repo's ShellAccessParity assertions survived the frame fix untouched.
 *   The difference only exists at runtime, in a browser this suite cannot
 *   reach. Source is the only instrument that can see an element type, so
 *   source is the right instrument here. It says so rather than implying
 *   it is a measurement.
 *
 * WHAT IT DOES NOT CLAIM:
 *   Nothing about prefetching. `prefetch` is a separate, unmeasured claim
 *   about network cost and it is not this file's business.
 */

const SRC = resolve(__dirname, "..");

function collectTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectTsx(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Comments stripped, so the rule judges CODE and never prose that quotes it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Returns the full text of every `<a ...>` OPENING tag.
 *
 * A naive /<a\s[^>]*>/ is wrong in this repo: BrokerConnectPanel carried
 * `onClick={e => e.stopPropagation()}`, whose arrow `>` ends the match
 * early and hides the href. So walk the tag tracking brace depth and
 * string quoting, and only stop at a `>` that is genuinely at depth zero.
 */
function anchorOpenTags(code: string): string[] {
  const tags: string[] = [];
  const start = /<a[\s/>]/g;
  let m: RegExpExecArray | null;
  while ((m = start.exec(code)) !== null) {
    let depth = 0;
    let quote: string | null = null;
    for (let i = m.index + 2; i < code.length; i++) {
      const ch = code[i];
      if (quote) {
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) {
        tags.push(code.slice(m.index, i + 1));
        break;
      }
    }
  }
  return tags;
}

/** The href value as written: a quoted literal, or the `{...}` expression. */
function hrefOf(tag: string): string | null {
  const literal = /href\s*=\s*"([^"]*)"/.exec(tag);
  if (literal) return literal[1];
  const expr = /href\s*=\s*\{/.exec(tag);
  if (!expr) return null;
  let depth = 0;
  for (let i = expr.index + expr[0].length - 1; i < tag.length; i++) {
    if (tag[i] === "{") depth++;
    else if (tag[i] === "}") {
      depth--;
      if (depth === 0) return tag.slice(expr.index + expr[0].length, i).trim();
    }
  }
  return null;
}

/**
 * An href is INTERNAL when it is a literal app path, or an expression whose
 * name declares it is a route. Expressions naming a `url` — `item.url`,
 * `docsUrl`, `stream.fallback` — are runtime values pointing off-app and
 * an anchor is correct for those.
 */
function isInternalRoute(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (/^`\/(?!\/)/.test(href)) return true;
  return /_ROUTE\b|Route$|_PATH\b/.test(href);
}

describe("internal anchor navigation sentinel · a room may not reboot the machine", () => {
  const files = collectTsx(SRC);

  it("the sweep and the tag walker are not vacuous", () => {
    expect(files.length, "the sweep must actually find .tsx files").toBeGreaterThan(50);

    // The exact shape that defeated a naive [^>]* scan, kept as a pin.
    const arrowInAttr = `<a href="/readiness" onClick={e => e.stopPropagation()}>x</a>`;
    expect(anchorOpenTags(arrowInAttr)).toHaveLength(1);
    expect(hrefOf(anchorOpenTags(arrowInAttr)[0])).toBe("/readiness");
    expect(isInternalRoute("/readiness")).toBe(true);

    // And the classifier must not drag genuinely external links in.
    expect(isInternalRoute("https://example.com")).toBe(false);
    expect(isInternalRoute("broker.runtimeConnection.docsUrl")).toBe(false);
    expect(isInternalRoute("INSTRUMENT_VIEW_ROUTE")).toBe(true);
  });

  it("no raw <a> anywhere in src/ navigates to an internal route", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const tag of anchorOpenTags(code)) {
        const href = hrefOf(tag);
        if (href !== null && isInternalRoute(href)) {
          offenders.push(`${file.slice(SRC.length + 1)} → ${href}`);
        }
      }
    }

    expect(
      offenders,
      "A raw <a> to an internal route is a full document load: it power-cycles " +
        "the app, drops the live tape subscription, and erases priorStory so the " +
        "Auto-Quiet gate can only say 'Unwatched'. Use `next/link` instead.",
    ).toEqual([]);
  });

  it("still finds the external anchors, so the rule is a filter and not a ban", () => {
    let external = 0;
    for (const file of files) {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const tag of anchorOpenTags(code)) {
        const href = hrefOf(tag);
        if (href !== null && !isInternalRoute(href)) external++;
      }
    }
    // An anchor is the CORRECT element for an off-app destination. If this
    // ever hits zero the scan has stopped seeing anchors at all, and the
    // rule above would be passing vacuously.
    expect(external).toBeGreaterThan(5);
  });
});
