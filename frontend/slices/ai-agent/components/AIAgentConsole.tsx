"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Sparkles, Trash2, ArrowUp } from "lucide-react";
import { useAIChat } from "../hooks/useAIChat";
import { SLASH_COMMANDS } from "../lib/slashCommands";
import { cn } from "@/shared/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional context string (current page text, selection) prepended to every send. */
  context?: string;
}

export function AIAgentConsole({ open, onOpenChange, context }: Props) {
  const { messages, pending, error, send, clear } = useAIChat();
  const [input, setInput] = useState("");
  const [showSlash, setShowSlash] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  useEffect(() => {
    setShowSlash(input.startsWith("/") && !input.includes(" "));
  }, [input]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setShowSlash(false);
    await send(text, context);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-brand" /> Nosion AI
          </SheetTitle>
          <SheetDescription className="text-xs">
            Type <code>/</code> to see commands. Powered by Claude.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-2 text-sm text-muted-foreground">
              <Sparkles className="h-6 w-6 mx-auto opacity-50" />
              <div>Ask anything or use a slash command.</div>
              <div className="grid grid-cols-1 gap-1 mt-3 text-left">
                {SLASH_COMMANDS.map((c) => (
                  <Button
                    key={c.id}
                    variant="outline"
                    className="h-auto px-2 py-1 text-xs font-normal justify-start"
                    onClick={() => setInput(c.trigger + " ")}
                  >
                    <span className="font-mono text-brand">{c.trigger}</span>
                    <span className="text-muted-foreground"> · {c.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-brand/10 ml-6"
                  : "bg-muted/40 mr-6 border border-border",
              )}
            >
              {m.content}
            </div>
          ))}
          {pending && (
            <div className="bg-muted/40 mr-6 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
              Thinking…
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="px-3 py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {showSlash && (
          <div className="border-t border-border bg-card max-h-48 overflow-y-auto">
            {SLASH_COMMANDS
              .filter((c) => c.trigger.startsWith(input.split(" ")[0]))
              .map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="w-full h-auto text-left px-3 py-2 text-sm font-normal flex items-baseline gap-2 justify-start rounded-none"
                  onMouseDown={(e) => { e.preventDefault(); setInput(c.trigger + " "); }}
                >
                  <span className="font-mono text-brand text-xs">{c.trigger}</span>
                  <span>{c.label}</span>
                  <span className="text-xs text-muted-foreground truncate">{c.hint}</span>
                </Button>
              ))}
          </div>
        )}

        <div className="border-t border-border p-3 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything…  (⌘↵ to send)"
            className="min-h-[60px] text-sm"
            disabled={pending}
          />
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={clear} disabled={pending || messages.length === 0}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
            <Button size="sm" onClick={handleSend} disabled={pending || !input.trim()}>
              <ArrowUp className="h-3.5 w-3.5 mr-1" /> Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
