/** Number formatting per `Property.numberFormat`. Single source of
 *  truth so cells / cards / chart axes / rollups all render
 *  identically.
 *
 *  Uses `Intl.NumberFormat` (Unicode CLDR). Locale comes from
 *  navigator (frontend) or "en-US" fallback (server-side
 *  formatters). Currency code defaults to "USD" if missing. */

import type { NumberFormat, Property } from "@/shared/types/domain";

interface Options {
  /** BCP-47 locale tag. Defaults to navigator.language or "en-US". */
  locale?: string;
}

const DEFAULT_DECIMALS: Record<NumberFormat, number> = {
  number: 0,
  decimal: 2,
  percent: 0,
  currency: 2,
};

/** Resolve effective format options for a property. */
export function resolveNumberFormat(prop: Property): {
  format: NumberFormat;
  decimals: number;
  currency: string;
} {
  const format: NumberFormat = prop.numberFormat ?? "number";
  const decimals = prop.numberDecimals ?? DEFAULT_DECIMALS[format];
  const currency = prop.numberCurrencyCode ?? "USD";
  return { format, decimals, currency };
}

/** Format a numeric value per the property's format settings.
 *  Returns "" when value is null/undefined/NaN — caller renders the
 *  empty placeholder. */
export function formatPropertyNumber(
  value: number | null | undefined,
  prop: Property,
  options: Options = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const { format, decimals, currency } = resolveNumberFormat(prop);
  const locale = options.locale
    ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");

  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (format === "percent") {
    opts.style = "percent";
    return new Intl.NumberFormat(locale, opts).format(value / 100);
  }
  if (format === "currency") {
    opts.style = "currency";
    opts.currency = currency;
    return new Intl.NumberFormat(locale, opts).format(value);
  }
  // "number" / "decimal" — same Intl call, decimals differ via DEFAULT_DECIMALS.
  return new Intl.NumberFormat(locale, opts).format(value);
}

/** Common ISO 4217 codes for the picker UI. */
export const COMMON_CURRENCIES: Array<{ code: string; label: string }> = [
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "JPY", label: "Japanese Yen (JPY)" },
  { code: "CNY", label: "Chinese Yuan (CNY)" },
  { code: "IDR", label: "Indonesian Rupiah (IDR)" },
  { code: "SGD", label: "Singapore Dollar (SGD)" },
  { code: "MYR", label: "Malaysian Ringgit (MYR)" },
  { code: "AUD", label: "Australian Dollar (AUD)" },
  { code: "CAD", label: "Canadian Dollar (CAD)" },
  { code: "CHF", label: "Swiss Franc (CHF)" },
  { code: "INR", label: "Indian Rupee (INR)" },
  { code: "KRW", label: "South Korean Won (KRW)" },
  { code: "THB", label: "Thai Baht (THB)" },
  { code: "VND", label: "Vietnamese Dong (VND)" },
  { code: "PHP", label: "Philippine Peso (PHP)" },
];
