import { describe, expect, it } from "vitest";
import { parseModelRef } from "./modelRef";

describe("parseModelRef", () => {
  it("returns a null provider for a bare model string", () => {
    expect(parseModelRef("gpt-4o-mini")).toEqual({ provider: null, model: "gpt-4o-mini" });
  });

  it("peels a known provider prefix", () => {
    expect(parseModelRef("openai/gpt-4o")).toEqual({ provider: "openai", model: "gpt-4o" });
  });

  it("splits on the FIRST slash so nested OpenRouter model ids survive", () => {
    expect(parseModelRef("openrouter/google/gemini-3.1-flash-lite")).toEqual({
      provider: "openrouter",
      model: "google/gemini-3.1-flash-lite",
    });
  });

  it("recognizes the ChatGPT/Codex OAuth provider", () => {
    expect(parseModelRef("openai-codex/gpt-5-codex")).toEqual({
      provider: "openai-codex",
      model: "gpt-5-codex",
    });
  });

  it("treats an unknown first segment as a bare model (no false BYOK route)", () => {
    // `meta-llama` is an OpenRouter vendor, NOT a provider prefix — must
    // stay a bare model so it routes through the admin provider.
    expect(parseModelRef("meta-llama/llama-3.3-70b-instruct")).toEqual({
      provider: null,
      model: "meta-llama/llama-3.3-70b-instruct",
    });
  });
});
