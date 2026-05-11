/** Group rows by Today / Yesterday / Earlier this week / Last 30 days /
 *  Older — for Feed views in admin panels. Returns sections in display
 *  order, skipping empty buckets. */
export function groupByDateBucket<T>(
  rows: T[],
  getTs: (row: T) => number,
): { label: string; rows: T[] }[] {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayStart = startOfDay.getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  const buckets: { key: string; label: string; rows: T[] }[] = [
    { key: "today", label: "Today", rows: [] },
    { key: "yesterday", label: "Yesterday", rows: [] },
    { key: "week", label: "Earlier this week", rows: [] },
    { key: "month", label: "Last 30 days", rows: [] },
    { key: "older", label: "Older", rows: [] },
  ];
  for (const r of rows) {
    const t = getTs(r);
    const target =
      t >= todayStart
        ? "today"
        : t >= yesterdayStart
          ? "yesterday"
          : t >= weekStart
            ? "week"
            : t >= monthStart
              ? "month"
              : "older";
    buckets.find((b) => b.key === target)!.rows.push(r);
  }
  return buckets.filter((b) => b.rows.length > 0);
}
