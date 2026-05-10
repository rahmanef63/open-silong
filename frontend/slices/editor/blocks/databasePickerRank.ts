export interface RankInput { id: string; name: string; icon: string; rowIds: string[] }
export interface Ranked { id: string; name: string; icon: string; rowCount: number; score: number }

export function rankDatabases(dbs: RankInput[], query: string): Ranked[] {
  const q = query.trim().toLowerCase();
  return dbs
    .map((d) => {
      const name = d.name || "Untitled";
      const lower = name.toLowerCase();
      let score = 0;
      if (q) {
        if (lower === q) score = 100;
        else if (lower.startsWith(q)) score = 60;
        else if (lower.includes(q)) score = 30;
        else return null;
      } else {
        score = 1;
      }
      return { id: d.id, name, icon: d.icon, rowCount: d.rowIds.length, score };
    })
    .filter((r): r is Ranked => r !== null)
    .sort((a, b) => b.score - a.score || b.rowCount - a.rowCount || a.name.localeCompare(b.name))
    .slice(0, 50);
}
