import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HEADLINE, OPERATING_LOOP, PRODUCT_KIND, PRODUCT_KIND_TITLE, PRODUCT_LINE, PRODUCT_NAME, PRODUCT_NAME_TITLE,
  PROMISE, TERRITORY_LIFE, WHAT_IS_LIVE,
} from "./sellingStory";

const read = (p: string) => readFileSync(p, "utf8");
const PAGES = { welcome: "src/app/welcome/page.tsx", pricing: "src/app/pricing/page.tsx", login: "src/app/login/page.tsx" } as const;
const COMPONENT = "src/components/marketing/SellingStory.tsx";

/** Every sentence the selling story puts in front of a visitor. */
const STORY = [
  PRODUCT_LINE, HEADLINE, PROMISE,
  ...TERRITORY_LIFE.flatMap(t => [t.stage, t.line]),
  ...OPERATING_LOOP.flatMap(s => [s.step, s.line]),
  ...WHAT_IS_LIVE.flatMap(w => [w.label, w.line]),
];

/** Visible copy of a TSX page: JSX text and string literals, comments stripped. */
function copyOf(path: string): string {
  return read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * BANNED CLAIMS (§57): outcome promises, invented performance, testimonials,
 * indicator-launch hype, the fill myth stated as fact.
 */
const BANNED: readonly [string, RegExp][] = [
  ["guaranteed outcome", /(?<!\b(?:no|never|not|without)\s+)\bguarantee(d|s)?\b|\brisk[- ]free\b|\bcan(?:'|no)t lose\b|\bsure[- ]fire\b/i],
  ["profit promise", /\b(make|earn|double|grow)\s+(money|profits?|your account)\b|\bconsistent profits?\b|\bget rich\b|\bpassive income\b/i],
  ["win rate / accuracy stat", /\bwin[- ]?rate\b|\b\d{1,3}\s?%\s*(accura|win|success|of traders)/i],
  ["invented stat", /\b\d{1,3}(,\d{3})+\+?\s*(traders|users|members)\b|\b(thousands|millions) of (traders|users|members)\b|\btrusted by\b/i],
  ["testimonial", /\btestimonial|\b(5|five)[- ]star\b|★★★|“[^”]{8,}”\s*[—-]\s*[A-Z]/i],
  ["indicator launch", /\bnow with\b|\bnew indicator\b|\bFVG indicator\b/i],
  ["fill myth as fact", /\b(must|always|will)\s+(be\s+)?fill(ed|s)?\b/i],
  ["feature soup", /\ball[- ]in[- ]one\b/i],
];

function offenders(text: string): string[] {
  return BANNED.filter(([, re]) => re.test(text)).map(([name]) => name);
}

describe("§57 selling story — one owner, honest words", () => {
  it("names the product exactly", () => {
    expect(PRODUCT_LINE).toBe("WEALTHY MINDSETS PRO — TRADING OPERATING SYSTEM");
    expect(PRODUCT_NAME_TITLE.toUpperCase()).toBe(PRODUCT_NAME);
    expect(PRODUCT_KIND_TITLE.toUpperCase()).toBe(PRODUCT_KIND);
  });

  it("the operating loop is the 14 steps, in order, ending where it began", () => {
    expect(OPERATING_LOOP.map(s => s.step.toUpperCase())).toEqual([
      "LEARN", "SEE", "WAIT", "UNDERSTAND", "INSPECT", "PLAN", "DECIDE",
      "TRADE", "PROTECT", "MANAGE", "JOURNAL", "REVIEW", "MEASURE", "LEARN YOURSELF",
    ]);
    for (const s of OPERATING_LOOP) expect(s.line.length, s.step).toBeGreaterThan(10);
  });

  it("follows a territory through formation, interaction, response, memory, review and education", () => {
    expect(TERRITORY_LIFE.map(t => t.stage)).toEqual(["Formation", "Interaction", "Response", "Memory", "Review", "Education"]);
    expect(PROMISE).toMatch(/territor/i);
  });

  it("states what is live — broker connect is BETA, orders are the trader's own, data limits, not advice", () => {
    const live = WHAT_IS_LIVE.map(w => w.line).join(" ");
    expect(live).toMatch(/BETA/);
    expect(live).toMatch(/not enabled for members yet/);
    expect(live).toMatch(/your own broker/);
    expect(live).toMatch(/you confirm/);
    expect(live).toMatch(/differ by market/);
    expect(live).toMatch(/not investment advice/);
    expect(live).toMatch(/no outcome is promised/);
  });

  it("the story itself carries no banned claim", () => {
    for (const s of STORY) expect(offenders(s), s).toEqual([]);
  });

  it("the public pages and the story component carry no banned claim", () => {
    for (const p of [...Object.values(PAGES), COMPONENT]) expect(offenders(copyOf(p)), p).toEqual([]);
  });

  it("the sweep would catch what it bans", () => {
    expect(offenders("Now with FVG indicator!")).toContain("indicator launch");
    expect(offenders("A 78% win rate")).toContain("win rate / accuracy stat");
    expect(offenders("Trusted by 12,000+ traders")).toContain("invented stat");
    expect(offenders("Guaranteed profits")).toContain("guaranteed outcome");
    expect(offenders("Every FVG must fill")).toContain("fill myth as fact");
    expect(offenders("No guaranteed return should be assumed")).toEqual([]);
  });
});

describe("§57 — every public selling page reads the one story", () => {
  it("welcome: product line + full story", () => {
    const s = read(PAGES.welcome);
    expect(s).toContain("{PRODUCT_LINE}");
    expect(s).toContain('<SellingStory variant="full"');
  });
  it("pricing: product line + compact story ABOVE the tiers", () => {
    const s = read(PAGES.pricing);
    expect(s).toContain("{PRODUCT_LINE}");
    const story = s.indexOf('<SellingStory variant="compact"'), tiers = s.indexOf("{TIERS.map(");
    expect(story).toBeGreaterThan(0);
    expect(story).toBeLessThan(tiers);
  });
  it("login: left panel tells the story, phones get the product line", () => {
    const s = read(PAGES.login);
    expect(s).toContain('<SellingStory variant="compact"');
    expect(s).toContain("{PRODUCT_NAME_TITLE}");
    expect(s).toContain('data-testid="login-phone-product-line"');
    expect(s).not.toMatch(/const FEATURES = \[/);
  });
});

describe("pricing stays the Founder's — tiers and prices locked", () => {
  it("four tiers, $0 / $10 / $20 / $50, names and sale state unchanged", () => {
    const s = read(PAGES.pricing);
    const tiers = [...s.matchAll(/name: "([^"]+)", price: "(\$\d+)"/g)].map(m => [m[1], m[2]]);
    expect(tiers).toEqual([["Free · Guest", "$0"], ["WM Pro App", "$10"], ["Passport", "$20"], ["WM Pro OS", "$50"]]);
    expect(s.match(/cta: \{ label: "Not on sale yet" \}/g)?.length).toBe(3);
    expect(s).toContain("Paid plans are not on sale yet.");
  });
});
