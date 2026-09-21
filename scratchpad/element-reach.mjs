import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "/Users/dspaidnoosleep/wealthymindsets-pro/src";

const ELEMENTS = [
  "MARKET_CANVAS", "THESIS_GEOMETRY", "EXPRESSION_CARD", "ONE_STORY",
  "PROTECTION_GRADE", "PENDING_BANNER", "HOT_PATH_REMOTE", "FLATTEN_CONFIRM",
  "HUMILITY_PANEL", "FIDELITY_CHIPS", "RECEIPT_SHEET", "OPEN_BROKER",
];

const files = [];
const walk = d => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) { if (e !== "node_modules") walk(p); continue; }
    if (/\.tsx?$/.test(e)) files.push(p);
  }
};
walk(SRC);

const routes = files.filter(p => /\/app\/.*\/(page|layout)\.tsx$/.test(p));

// Strip comments so prose ABOUT an element is not counted as a use of it.
const code = s => s
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
  .replace(/(^|[^:])\/\/.*$/gm, (m, lead) => lead + " ".repeat(m.length - lead.length));

console.log("ELEMENT               governed-by  SceneAdmits  admitted-in-scenes");
console.log("-".repeat(72));

const compile = readFileSync(join(SRC, "lib/experience/compileScene.ts"), "utf8");
const admissionBody = compile.slice(compile.indexOf("function admissionFor"));

for (const el of ELEMENTS) {
  // Which routes route it through <SceneAdmits element="X">
  const admits = routes.filter(p => code(readFileSync(p, "utf8")).includes(`element="${el}"`));
  // Which routes name it in a GOVERNED list
  const governed = routes.filter(p => {
    const c = code(readFileSync(p, "utf8"));
    return new RegExp(`GOVERNED[\\s\\S]{0,600}?"${el}"`).test(c);
  });
  // How many scene branches admit it
  const inScenes = (admissionBody.match(new RegExp(`"${el}"`, "g")) ?? []).length;

  const g = governed.length ? governed.map(p => p.split("/app/")[1].split("/")[0]).join(",") : "—";
  const a = admits.length ? admits.map(p => p.split("/app/")[1].split("/")[0]).join(",") : "—";
  console.log(`${el.padEnd(20)} ${g.padEnd(12)} ${a.padEnd(12)} ${inScenes}`);
}

console.log("\n\nSCENE ADMITS / GOVERNED lists per route:");
for (const p of routes) {
  const c = code(readFileSync(p, "utf8"));
  const found = ELEMENTS.filter(e => c.includes(`element="${e}"`));
  if (found.length) console.log(`  ${p.split("/app/")[1]}: ${found.join(", ")}`);
}
