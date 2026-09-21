import { readFileSync, writeFileSync } from "node:fs";

// One-shot chrome migration for src/app/heatmaps/page.tsx.
// Sector hues and direction semantics are deliberately NOT in this map.
const f = "src/app/heatmaps/page.tsx";
let s = readFileSync(f, "utf8");

const MAP = {
  "#070A0F": "WM.surface.deepest",
  "#0A0E14": "WM.surface.deep",
  "#0D1117": "WM.surface.deep",
  "#161B22": "WM.surface.mid",
  "#111620": "WM.surface.mid",
  "#252B36": "WM.surface.raised",
  "#1A2030": "WM.border.hair",
  "#E8EDF3": "WM.text.hero",
  "#FFFFFF": "WM.text.hero",
  "#FFF": "WM.text.hero",
  "#D0D5DD": "WM.text.body",
  "#A5ADBA": "WM.text.body",
  "#CCCCCC": "WM.text.body",
  "#8892A0": "WM.text.muted",
  "#8B95A5": "WM.text.muted",
  "#5A6575": "WM.text.dim",
  "#697386": "WM.text.dim",
  "#687385": "WM.text.dim",
  "#F0B429": "WM.gold.mark",
  "#C9A55C": "WM.gold.mark",
};

let quoted = 0;
let interp = 0;

for (const [hex, token] of Object.entries(MAP)) {
  // "#8B95A5"  ->  WM.text.muted
  const q = new RegExp(`"${hex}"`, "gi");
  s = s.replace(q, () => {
    quoted++;
    return token;
  });
  // "1px solid #1A2030"  ->  `1px solid ${WM.border.hair}`  (handled below)
  const bare = new RegExp(hex, "gi");
  s = s.replace(bare, () => {
    interp++;
    return "${" + token + "}";
  });
}

// Any plain double-quoted string that now contains ${...} must become a template literal.
s = s.replace(/"([^"\n]*\$\{[^"\n]*)"/g, (_m, inner) => "`" + inner + "`");

writeFileSync(f, s);
console.log(JSON.stringify({ quoted, interp }));
