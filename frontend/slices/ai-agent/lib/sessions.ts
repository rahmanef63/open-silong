/** Session store — localStorage-backed conversation persistence.
 *
 *  Each session is a list of messages + the chosen agent. Sessions are
 *  keyed under one global localStorage entry so reads/writes are atomic
 *  and we never have to clean up orphan keys.
 *
 *  Cross-device sync is deferred; when needed, swap this module for a
 *  convex-backed implementation behind the same API.
 */

import type { ChatMessage } from "../hooks/useAIChat";

export interface ChatSession {
  id: string;
  title: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "nosion.ai.sessions.v1";
const MAX_SESSIONS = 50;
const MAX_TITLE_LEN = 60;

function safeRead(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && typeof s.id === "string" && Array.isArray(s.messages));
  } catch { return []; }
}

function safeWrite(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    // Cap to MAX_SESSIONS most-recent so localStorage doesn't bloat.
    const trimmed = [...sessions]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SESSIONS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota / disabled — silent */ }
}

export const SessionStore = {
  list(): ChatSession[] {
    return safeRead().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  get(id: string): ChatSession | undefined {
    return safeRead().find((s) => s.id === id);
  },

  create(opts: { id: string; agentId: string }): ChatSession {
    const now = Date.now();
    const session: ChatSession = {
      id: opts.id,
      title: "New chat",
      agentId: opts.agentId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const all = safeRead();
    all.push(session);
    safeWrite(all);
    return session;
  },

  update(id: string, patch: Partial<Omit<ChatSession, "id" | "createdAt">>): void {
    const all = safeRead();
    const idx = all.findIndex((s) => s.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
    safeWrite(all);
  },

  rename(id: string, title: string): void {
    SessionStore.update(id, { title: title.slice(0, MAX_TITLE_LEN) });
  },

  setMessages(id: string, messages: ChatMessage[]): void {
    SessionStore.update(id, { messages });
  },

  setAgent(id: string, agentId: string): void {
    SessionStore.update(id, { agentId });
  },

  delete(id: string): void {
    safeWrite(safeRead().filter((s) => s.id !== id));
  },
};

/** Derive a title from the first user message (truncated). Used to
 *  auto-title sessions after the first send. */
export function deriveTitle(firstUserText: string): string {
  const stripped = firstUserText.replace(/^\/\S+\s*/, "").trim();
  if (!stripped) return "New chat";
  const head = stripped.split("\n")[0];
  return head.length > MAX_TITLE_LEN ? `${head.slice(0, MAX_TITLE_LEN - 1)}…` : head;
}
