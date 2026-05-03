import { useCallback, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { findSlash } from "../lib/slashCommands";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

const nano = () => Math.random().toString(36).slice(2, 10);

export function useAIChat() {
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
      id: nano(),
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
      });
      setMessages((prev) => [...prev, {
        id: nano(),
        role: "assistant",
        content: r.text,
        createdAt: Date.now(),
      }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }, [messages, pending, complete]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, pending, error, send, clear };
}
