import { describe, expect, it } from "vitest";
import { formatPropertyNumber, resolveNumberFormat } from "./numberFormat";
import type { Property } from "@/shared/types/domain";

const prop = (patch: Partial<Property>): Property => ({
  id: "p", name: "n", type: "number", ...patch,
});

describe("resolveNumberFormat", () => {
  it("defaults to number / 0 decimals / USD", () => {
    expect(resolveNumberFormat(prop({}))).toEqual({
      format: "number", decimals: 0, currency: "USD",
    });
  });

  it("currency defaults to 2 decimals", () => {
    expect(resolveNumberFormat(prop({ numberFormat: "currency" })))
      .toEqual({ format: "currency", decimals: 2, currency: "USD" });
  });

  it("respects explicit currency code", () => {
    expect(resolveNumberFormat(prop({
      numberFormat: "currency", numberCurrencyCode: "IDR",
    }))).toEqual({ format: "currency", decimals: 2, currency: "IDR" });
  });

  it("respects explicit decimals", () => {
    expect(resolveNumberFormat(prop({
      numberFormat: "decimal", numberDecimals: 4,
    }))).toEqual({ format: "decimal", decimals: 4, currency: "USD" });
  });
});

describe("formatPropertyNumber", () => {
  it("returns empty string for null/undefined/NaN", () => {
    expect(formatPropertyNumber(null, prop({}), { locale: "en-US" })).toBe("");
    expect(formatPropertyNumber(undefined, prop({}), { locale: "en-US" })).toBe("");
    expect(formatPropertyNumber(NaN, prop({}), { locale: "en-US" })).toBe("");
  });

  it("formats plain number", () => {
    expect(formatPropertyNumber(1234, prop({}), { locale: "en-US" })).toBe("1,234");
  });

  it("formats decimal with 2 dp", () => {
    expect(formatPropertyNumber(1234.5, prop({ numberFormat: "decimal" }), { locale: "en-US" }))
      .toBe("1,234.50");
  });

  it("formats percent — value is 0..100, displayed as %", () => {
    expect(formatPropertyNumber(25, prop({ numberFormat: "percent" }), { locale: "en-US" }))
      .toBe("25%");
  });

  it("formats USD currency", () => {
    expect(formatPropertyNumber(1234.5, prop({
      numberFormat: "currency", numberCurrencyCode: "USD",
    }), { locale: "en-US" })).toBe("$1,234.50");
  });

  it("formats IDR currency in id-ID locale", () => {
    const out = formatPropertyNumber(1_500_000, prop({
      numberFormat: "currency", numberCurrencyCode: "IDR",
    }), { locale: "id-ID" });
    // id-ID uses thin space + "Rp" — be lenient with the spacing
    expect(out).toMatch(/Rp.*1[\.,]500[\.,]000/);
  });
});
