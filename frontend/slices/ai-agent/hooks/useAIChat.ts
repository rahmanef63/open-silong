import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { uid } from "@/shared/lib/uid";
import { findSlash } from "../lib/slashCommands";
import { AGENT_BY_ID, AGENTS, DEFAULT_AGENT_ID, type AgentPreset } from "../lib/agents";
import { SessionStore, deriveTitle, type ChatSession } from "../lib/sessions";
import type { ProgressStep } from "../types/progress";

export interface ActiveContext {
  activePageId?: string;
  activePageTitle?: string;
  userName?: string;
  workspaceName?: string;
}

export interface ProposalCall {
  id: string;
  skillId: string;
  label: string;
  args: Record<string, unknown>;
  /** Lifecycle: pending → approving → applied | discarded | error */
  state: "pending" | "approving" | "applied" | "discarded" | "error";
  error?: string;
  /** Stored after successful execute so the next chat turn can chain
   *  on it — e.g. pages.create returns {pageId}, then a follow-up
   *  pages.append_markdown sees that pageId. */
  result?: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** Tool-call timeline for this assistant turn. */
  progress?: ProgressStep[];
  /** Mutation skill calls the model queued for user approval. */
  proposals?: ProposalCall[];
}

export function useAIChat(activeContext?: ActiveContext) {
  const complete = useAction(api.ai.chat.complete);
  const executeProposal = useAction(api.ai.chat.executeProposal);
  const [liveRunId, setLiveRunId] = useState<string | null>(null);

  // Session bootstrap: load existing or create the first one.
  const [sessions, setSessions] = useState<ChatSession[]>(() => SessionStore.list());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const list = SessionStore.list();
    if (list[0]) return list[0].id;
    const fresh = SessionStore.create({ id: uid(), agentId: DEFAULT_AGENT_ID });
    return fresh.id;
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh sessions list from store. Called after any mutation.
  const refreshSessions = useCallback(() => {
    setSessions(SessionStore.list());
  }, []);

  // Active session — derived. Re-derives whenever sessions or
  // activeSessionId changes, so renames / message appends flow through.
  const activeSession = sessions.find((s) => s.id === activeSessionId)
    ?? SessionStore.get(activeSessionId);
  const messages = activeSession?.messages ?? [];
  const agentId = activeSession?.agentId ?? DEFAULT_AGENT_ID;
  const agent = AGENT_BY_ID[agentId] ?? AGENT_BY_ID[DEFAULT_AGENT_ID];

  // Ref so async callbacks see the latest list without re-binding.
  const sessionIdRef = useRef(activeSessionId);
  sessionIdRef.current = activeSessionId;

  const writeMessages = useCallback((sid: string, next: ChatMessage[]) => {
    SessionStore.setMessages(sid, next);
    refreshSessions();
  }, [refreshSessions]);

  const setAgent = useCallback((nextAgentId: string) => {
    SessionStore.setAgent(activeSessionId, nextAgentId);
    refreshSessions();
  }, [activeSessionId, refreshSessions]);

  const newSession = useCallback(() => {
    const s = SessionStore.create({ id: uid(), agentId: DEFAULT_AGENT_ID });
    setActiveSessionId(s.id);
    refreshSessions();
    setError(null);
  }, [refreshSessions]);

  const switchSession = useCallback((sid: string) => {
    setActiveSessionId(sid);
    setError(null);
  }, []);

  const renameSession = useCallback((sid: string, title: string) => {
    SessionStore.rename(sid, title);
    refreshSessions();
  }, [refreshSessions]);

  const deleteSession = useCallback((sid: string) => {
    SessionStore.delete(sid);
    let next = SessionStore.list();
    if (next.length === 0) {
      const fresh = SessionStore.create({ id: uid(), agentId: DEFAULT_AGENT_ID });
      next = [fresh];
    }
    if (sid === activeSessionId) setActiveSessionId(next[0].id);
    refreshSessions();
  }, [activeSessionId, refreshSessions]);

  const send = useCallback(async (input: string, context?: string) => {
    if (!input.trim() || pending) return;
    setError(null);
    const sid = sessionIdRef.current;
    const session = SessionStore.get(sid);
    if (!session) return;

    const slash = findSlash(input);
    const built = slash
      ? slash.cmd.buildPrompt(slash.rest, context)
      : { userPrompt: context ? `${context}\n\n---\nQuestion: ${input}` : input };

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: input,
      createdAt: Date.now(),
    };
    const baseMessages = [...session.messages, userMsg];
    writeMessages(sid, baseMessages);

    // Auto-title from the first user message.
    if (session.messages.length === 0) {
      SessionStore.rename(sid, deriveTitle(input));
      refreshSessions();
    }

    setPending(true);
    const runId = `run-${uid()}`;
    setLiveRunId(runId);
    try {
      const currentAgent: AgentPreset = AGENT_BY_ID[session.agentId] ?? AGENT_BY_ID[DEFAULT_AGENT_ID];
      // Collect any APPLIED proposals from earlier turns so the model
      // can chain on their structured results (pages.create returns
      // {pageId} → next turn's append/rename can use it). Injected as
      // a synthetic system note since the LLM doesn't see tool-result
      // messages across complete() calls.
      const appliedNotes: string[] = [];
      for (const m of session.messages) {
        if (!m.proposals) continue;
        for (const p of m.proposals) {
          if (p.state === "applied" && p.result !== undefined) {
            appliedNotes.push(`- ${p.skillId} args=${JSON.stringify(p.args)} → ${JSON.stringify(p.result)}`);
          }
        }
      }
      const recentActionsNote = appliedNotes.length
        ? `<RECENT_ACTIONS>\n${appliedNotes.join("\n")}\n</RECENT_ACTIONS>\nWhen the user references an action you already took, reuse the ids/results from RECENT_ACTIONS instead of asking or re-creating.`
        : "";
      // Combine agent system prompt + slash-command system + recent
      // actions note. Slash command wins last (most specific intent).
      const systemParts = [currentAgent.systemPrompt, recentActionsNote, built.system].filter(Boolean);
      const apiMessages = [
        ...session.messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: built.userPrompt },
      ];
      const r = await complete({
        messages: apiMessages,
        system: systemParts.length ? systemParts.join("\n\n") : undefined,
        context: activeContext && (activeContext.activePageId || activeContext.userName)
          ? activeContext
          : undefined,
        runId,
      });
      const proposals = (r as { proposals?: Array<{ id: string; skillId: string; label: string; args: Record<string, unknown> }> }).proposals;
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: r.text,
        createdAt: Date.now(),
        progress: (r as { progress?: ProgressStep[] }).progress,
        proposals: proposals?.map((p) => ({ ...p, state: "pending" as const })),
      };
      writeMessages(sid, [...baseMessages, assistantMsg]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
      setLiveRunId(null);
    }
  }, [activeContext, complete, pending, refreshSessions, writeMessages]);

  /** Approve one proposal → run the mutation via the convex action,
   *  patch the assistant message's proposal state inline. */
  const approveProposal = useCallback(async (messageId: string, proposalId: string) => {
    const sid = sessionIdRef.current;
    const session = SessionStore.get(sid);
    if (!session) return;
    const patchProposal = (state: ProposalCall["state"], opts?: { error?: string; result?: unknown }) => {
      const fresh = SessionStore.get(sid);
      if (!fresh) return;
      const next = fresh.messages.map((m) => {
        if (m.id !== messageId || !m.proposals) return m;
        return {
          ...m,
          proposals: m.proposals.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  state,
                  ...(opts?.error ? { error: opts.error } : {}),
                  ...(opts?.result !== undefined ? { result: opts.result } : {}),
                }
              : p,
          ),
        };
      });
      writeMessages(sid, next);
    };
    const msg = session.messages.find((m) => m.id === messageId);
    const proposal = msg?.proposals?.find((p) => p.id === proposalId);
    if (!proposal) return;
    patchProposal("approving");
    try {
      const res = await executeProposal({ skillId: proposal.skillId, args: proposal.args });
      if (res.ok) patchProposal("applied", { result: res.result });
      else patchProposal("error", { error: res.error ?? "unknown" });
    } catch (e) {
      patchProposal("error", { error: (e as Error).message });
    }
  }, [executeProposal, writeMessages]);

  const discardProposal = useCallback((messageId: string, proposalId: string) => {
    const sid = sessionIdRef.current;
    const session = SessionStore.get(sid);
    if (!session) return;
    const next = session.messages.map((m) => {
      if (m.id !== messageId || !m.proposals) return m;
      return {
        ...m,
        proposals: m.proposals.map((p) =>
          p.id === proposalId ? { ...p, state: "discarded" as const } : p,
        ),
      };
    });
    writeMessages(sid, next);
  }, [writeMessages]);

  const clear = useCallback(() => {
    const sid = sessionIdRef.current;
    writeMessages(sid, []);
    setError(null);
  }, [writeMessages]);

  // Re-read on mount in case another tab updated the store.
  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  return {
    // Conversation
    messages, pending, error, send, clear,
    // Live progress (subscribed in the Console component)
    liveRunId,
    // Approvals
    approveProposal, discardProposal,
    // Sessions
    sessions, activeSessionId, newSession, switchSession, renameSession, deleteSession,
    // Agent
    agent, agents: AGENTS, setAgent,
  };
}
