import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const SRC = "src";
const routes = [];
const walk = d => { for (const e of readdirSync(d)) { const p = join(d,e);
  if (statSync(p).isDirectory()) { if (e!=="node_modules") walk(p); continue; }
  if (/^(page|layout)\.tsx$/.test(e)) routes.push(p); } };
walk(join(SRC,"app"));
const C = ["MarketCanvasPanel","ContractStance","OneStoryStrip","ProtectionGradeLine",
  "HumilityPanel","DecisionReceiptPanel","SceneAdmissionPanel","CanvasBadgeMini",
  "DecisionSpineBand","ExperienceModeBar","OptionDecisionReceipt"];
for (const c of C) {
  const hits = routes.filter(p => { const s = readFileSync(p,"utf8");
    return s.includes(`<${c}`) && new RegExp(`import .*${c}.*from`).test(s); });
  console.log(c.padEnd(24), hits.map(p=>p.replace("src/app/","")).join(", ") || "—");
}
