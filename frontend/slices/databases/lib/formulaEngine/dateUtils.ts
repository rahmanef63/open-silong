export const DAY_MS = 86_400_000;

export function addUnit(d: Date, n: number, unit: string): string {
  const next = new Date(d);
  switch (unit) {
    case "day": case "days": next.setUTCDate(next.getUTCDate() + n); break;
    case "week": case "weeks": next.setUTCDate(next.getUTCDate() + n * 7); break;
    case "month": case "months": next.setUTCMonth(next.getUTCMonth() + n); break;
    case "year": case "years": next.setUTCFullYear(next.getUTCFullYear() + n); break;
    case "hour": case "hours": next.setUTCHours(next.getUTCHours() + n); break;
    case "minute": case "minutes": next.setUTCMinutes(next.getUTCMinutes() + n); break;
    default: next.setUTCDate(next.getUTCDate() + n);
  }
  // Preserve date-only output if the source string was a YYYY-MM-DD.
  return next.toISOString().slice(0, unit.startsWith("hour") || unit.startsWith("minute") ? undefined : 10);
}

export function diffUnit(a: Date, b: Date, unit: string): number {
  const ms = b.getTime() - a.getTime();
  switch (unit) {
    case "day": case "days": return Math.round(ms / DAY_MS);
    case "week": case "weeks": return Math.round(ms / (DAY_MS * 7));
    case "month": case "months":
      return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    case "year": case "years": return b.getUTCFullYear() - a.getUTCFullYear();
    case "hour": case "hours": return Math.round(ms / 3_600_000);
    case "minute": case "minutes": return Math.round(ms / 60_000);
    default: return Math.round(ms / DAY_MS);
  }
}

export function formatDate(d: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return fmt
    .replace(/YYYY/g, String(d.getUTCFullYear()))
    .replace(/MM/g, pad(d.getUTCMonth() + 1))
    .replace(/DD/g, pad(d.getUTCDate()))
    .replace(/HH/g, pad(d.getUTCHours()))
    .replace(/mm/g, pad(d.getUTCMinutes()))
    .replace(/ss/g, pad(d.getUTCSeconds()));
}
