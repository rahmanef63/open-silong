/** Command palette MRU (most-recently-used) history.
 *
 *  Stored in localStorage so a user's recent actions persist across
 *  reloads. Pure-ish — accepts a `Storage` so tests can supply a
 *  fake.
 *
 *  Layout: JSON array of `{id, label}`. Newest first. Capped at
 *  `HISTORY_MAX`. */

export interface HistoryEntry {
  id: string;
  label: string;
}

export const HISTORY_KEY = "nosion.cmdk.history";
export const HISTORY_MAX = 5;

export function loadHistory(storage?: Storage | null): HistoryEntry[] {
  const s = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!s) return [];
  try {
    const raw = s.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e: unknown): e is HistoryEntry =>
        !!e && typeof e === "object"
        && typeof (e as HistoryEntry).id === "string"
        && typeof (e as HistoryEntry).label === "string",
      )
      .slice(0, HISTORY_MAX);
  } catch { return []; }
}

export function saveHistory(entry: HistoryEntry, storage?: Storage | null): HistoryEntry[] {
  const s = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!s) return [];
  const cur = loadHistory(s).filter((e) => e.id !== entry.id);
  const next = [entry, ...cur].slice(0, HISTORY_MAX);
  try { s.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

export function clearHistory(storage?: Storage | null): void {
  const s = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!s) return;
  try { s.removeItem(HISTORY_KEY); } catch { /* quota */ }
}
