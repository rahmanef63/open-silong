import { describe, expect, it } from "vitest";
import { AI_PROVIDERS, listProvidersPublic, resolveProviderBaseUrl } from "./aiProviders";

describe("resolveProviderBaseUrl", () => {
  it("returns the catalog base URL for a known provider", () => {
    expect(resolveProviderBaseUrl("openai")).toBe("https://api.openai.com/v1");
    expect(resolveProviderBaseUrl("anthropic")).toBe("https://api.anthropic.com/v1");
  });

  it("prefers a non-empty override and strips trailing slashes", () => {
    expect(resolveProviderBaseUrl("openai", "https://proxy.test/v1")).toBe("https://proxy.test/v1");
    expect(resolveProviderBaseUrl("openai", "  https://proxy.test/v1///  ")).toBe("https://proxy.test/v1");
  });

  it("ignores a whitespace-only override and falls back to the spec", () => {
    expect(resolveProviderBaseUrl("openai", "   ")).toBe("https://api.openai.com/v1");
  });

  it("throws for an unknown provider with no override", () => {
    expect(() => resolveProviderBaseUrl("nope")).toThrow(/Unknown AI provider/);
  });

  it("requires an override for the custom provider (empty catalog baseUrl)", () => {
    expect(() => resolveProviderBaseUrl("custom")).toThrow(/Unknown AI provider/);
    expect(resolveProviderBaseUrl("custom", "https://my-host/v1")).toBe("https://my-host/v1");
  });
});

describe("listProvidersPublic", () => {
  it("returns one entry per catalog provider with the public shape", () => {
    const list = listProvidersPublic();
    expect(list).toHaveLength(Object.keys(AI_PROVIDERS).length);
    expect(list.map((p) => p.id).sort()).toEqual(
      ["anthropic", "custom", "deepseek", "gemini", "groq", "openai", "openrouter"],
    );
    expect(Object.keys(list[0]).sort()).toEqual(
      ["baseUrl", "defaultModel", "docsUrl", "id", "label", "models"],
    );
  });

  it("returns a defensive copy of models (not the catalog's readonly array)", () => {
    const openai = listProvidersPublic().find((p) => p.id === "openai")!;
    expect(openai.models).toEqual([...AI_PROVIDERS.openai.models]);
    expect(openai.models).not.toBe(AI_PROVIDERS.openai.models as unknown as string[]);
    openai.models.push("mutation-is-isolated");
    expect(AI_PROVIDERS.openai.models).not.toContain("mutation-is-isolated");
  });
});
