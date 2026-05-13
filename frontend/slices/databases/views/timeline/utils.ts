export const DAY_MS = 86400000;

export function msToYMD(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toMs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
}

export function makeBarStyle(rangeStart: number, days: number, cellW: number) {
  return (x: { startMs: number; endMs: number }) => {
    const left = Math.max(0, Math.floor((x.startMs - rangeStart) / DAY_MS)) * cellW;
    const rawRight = Math.floor((x.endMs - rangeStart) / DAY_MS + 1) * cellW;
    const right = Math.min(days * cellW, rawRight);
    const width = Math.max(cellW, right - left);
    return { left, width };
  };
}
