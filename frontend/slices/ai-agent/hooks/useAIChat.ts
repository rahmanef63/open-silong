import { useCallback, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { uid } from "@/shared/lib/uid";
import { findSlash } from "../lib/slashCommands";
import type { ProgressStep } from "../types/progress";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** Tool-call timeline returned by the agent for this assistant turn.
   *  Empty/undefined when no tools fired. Surfaces in the UI as a
   *  collapsible "thought process" strip under the bubble. */
  progress?: ProgressStep[];
}

export interface ActiveContext {
  activePageId?: string;
  activePageTitle?: string;
  userName?: string;
  workspaceName?: string;
}

export function useAIChat(activeContext?: ActiveContext) {
  const complete = useAction(api.ai.chat.complete);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (input: string, context?: string) => {
    if (!input.trim() || pending) return;
    setError(null);
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
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setPending(true);
    try {
      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: built.userPrompt },
      ];
      const r = await complete({
        messages: apiMessages,
        system: built.system,
        context: activeContext && (activeContext.activePageId || activeContext.userName)
          ? activeContext
          : undefined,
      });
      setMessages((prev) => [...prev, {
        id: uid(),
        role: "assistant",
        content: r.text,
        createdAt: Date.now(),
        progress: (r as { progress?: ProgressStep[] }).progress,
      }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }, [messages, pending, complete, activeContext]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, pending, error, send, clear };
}
