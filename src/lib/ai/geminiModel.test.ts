import { describe, expect, it } from "vitest";
import { pickGeminiModel } from "./geminiModel";

const m = (name: string, methods = ["generateContent", "streamGenerateContent"]) => ({ name: `models/${name}`, supportedGenerationMethods: methods });

describe("pickGeminiModel — what the key can use, not a typed name", () => {
  it("takes the newest stable flash model that streams", () => {
    expect(pickGeminiModel([m("gemini-2.0-flash"), m("gemini-2.5-flash"), m("gemini-2.5-pro"), m("gemini-3.8-flash"), m("gemini-10.1-flash")])).toBe("gemini-10.1-flash");
  });
  it("skips lite / preview / experimental / dated pins and non-generating models", () => {
    expect(pickGeminiModel([
      m("gemini-9.0-flash-lite"), m("gemini-9.0-flash-preview-05-20"), m("gemini-9.0-flash-exp"), m("gemini-9.0-flash-001"),
      m("gemini-9.0-flash", ["embedContent"]), m("gemini-2.5-flash"),
    ])).toBe("gemini-2.5-flash");
  });
  it("answers null when nothing qualifies", () => {
    expect(pickGeminiModel([m("text-embedding-004", ["embedContent"])])).toBeNull();
  });
});
