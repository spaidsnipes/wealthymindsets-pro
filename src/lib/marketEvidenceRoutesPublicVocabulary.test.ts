import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const indexPage = fs.readFileSync(path.join(process.cwd(), "src/app/nectar/page.tsx"), "utf8");
const detailPage = fs.readFileSync(path.join(process.cwd(), "src/app/nectar/[symbol]/page.tsx"), "utf8");

describe("Market Evidence route public vocabulary", () => {
  it("presents the index hierarchy as Market Evidence", () => {
    expect(indexPage).toContain("Market Evidence context ribbon");
    expect(indexPage).toContain('label="EVIDENCE"');
    expect(indexPage).toContain('label="TRADES OBSERVED"');
    expect(indexPage).toContain("Browser-local per-symbol evidence");
    expect(indexPage).toContain("No market evidence yet.");
    expect(indexPage).toContain("Market Evidence shows what WM observed.");
  });

  it("keeps export schema stable while public export copy is outcome-facing", () => {
    expect(indexPage).toContain('wmNectarExport: "v1"');
    expect(indexPage).toContain("sessionNectar: {");
    expect(indexPage).toContain("wm-market-evidence-session-");
    expect(indexPage).toContain("Export session market evidence as JSON");
  });

  it("keeps public Data Health rows and omits private diagnostic fields", () => {
    for (const label of ["Coverage state", "Fidelity class", "Observed events", "Gaps", "Last event"]) {
      expect(detailPage).toContain(`label="${label}"`);
    }
    for (const label of ["Memory state", "Persistence right", "Rights policy"]) {
      expect(detailPage).not.toContain(`label="${label}"`);
    }
    expect(detailPage).not.toContain("label={`${ch.channel.toUpperCase()} · ${ch.providerPath}`}");
    expect(detailPage).not.toContain("{ch.detail}");
  });

  it("keeps private route and owner identities intact", () => {
    expect(indexPage).toContain("getSessionNectarSnapshot");
    expect(indexPage).toContain("findSessionNectarChannel");
    expect(detailPage).toContain('href="/nectar"');
    expect(detailPage).toContain("subscribeToSessionNectar");
    expect(detailPage).toContain("NectarSymbolDetailPage");
  });

  it("removes private vocabulary from visible route entry copy", () => {
    expect(indexPage).not.toContain("Nectar Vault context ribbon");
    expect(indexPage).not.toContain('label="VAULT"');
    expect(indexPage).not.toContain("The Vault is empty");
    expect(detailPage).not.toContain('aria-label="Back to Nectar Vault"');
    expect(detailPage).not.toContain("Back to Vault");
    expect(detailPage).not.toContain("recent live samples");
  });
});
