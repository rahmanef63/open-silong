"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import {
  Sparkles, Trash2, ArrowUp, ChevronDown, ChevronRight, Wrench, CheckCircle2,
  XCircle, Pencil, Search as SearchIcon, History, Plus, MessageSquare, AtSign, Slash,
} from "lucide-react";
import { useAIChat, type ActiveContext, type ProposalCall } from "../hooks/useAIChat";
import { SLASH_COMMANDS } from "../lib/slashCommands";
import { cn } from "@/shared/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string;
  activeContext?: ActiveContext;
}

export function AIAgentConsole({ open, onOpenChange, context, activeContext }: Props) {
  const chat = useAIChat(activeContext);
  const {
    messages, pending, error, send, clear,
    liveRunId,
    approveProposal, discardProposal,
    sessions, activeSessionId, newSession, switchSession, renameSession, deleteSession,
    agent, agents, setAgent,
  } = chat;

  // Subscribe to live progress while a run is in flight. Convex queries
  // are reactive — re-renders as the backend pushes new steps.
  const liveProgressDoc = useQuery(
    api.ai.queries.getProgress,
    liveRunId ? { runId: liveRunId } : "skip",
  );
  const liveSteps = liveProgressDoc?.steps as Array<{ kind: string; label: string; skillId?: string; ms?: number; ok?: boolean }> | undefined;

  const [input, setInput] = useState("");
  const [showSlash, setShowSlash] = useState(false);
  const [showAt, setShowAt] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    setShowSlash(input.startsWith("/") && !input.includes(" "));
    setShowAt(input.startsWith("@") && !input.includes(" "));
  }, [input]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setShowSlash(false);
    setShowAt(false);
    await send(text, context);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2 text-base min-w-0">
              <Sparkles className="h-4 w-4 text-brand shrink-0" /> Nosion AI
              <span className="text-[10px] rounded border border-border bg-muted/40 px-1.5 py-0 text-muted-foreground truncate">
                {agent.glyph} {agent.label}
              </span>
            </SheetTitle>
            {/* mr-8 keeps our buttons clear of the sheet's built-in
                X close icon at top-right (~24px wide). */}
            <div className="flex items-center gap-1 mr-8 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                title="New chat"
                onClick={newSession}
                className="h-7 w-7 [&_svg]:size-3.5"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Chat history"
                onClick={() => setHistoryOpen((o) => !o)}
                className="h-7 w-7 [&_svg]:size-3.5"
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <SheetDescription className="text-xs">
            <code>@</code> picks an agent · <code>/</code> picks a skill · mutations need approval.
          </SheetDescription>
        </SheetHeader>

        {historyOpen && (
          <SessionRail
            sessions={sessions}
            activeId={activeSessionId}
            onSwitch={(id) => { switchSession(id); setHistoryOpen(false); }}
            onRename={renameSession}
            onDelete={deleteSession}
          />
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <EmptyState onPick={(prefix) => { setInput(prefix); inputRef.current?.focus(); }} />
          )}
          {messages.map((m) => (
            <div key={m.id}>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "bg-brand/10 ml-6" : "bg-muted/40 mr-6 border border-border",
                )}
              >
                {m.content}
              </div>
              {m.role === "assistant" && m.proposals && m.proposals.length > 0 && (
                <div className="mr-6 mt-2 space-y-1.5">
                  {m.proposals.map((p) => (
                    <ActionCard
                      key={p.id}
                      proposal={p}
                      onApprove={() => approveProposal(m.id, p.id)}
                      onDiscard={() => discardProposal(m.id, p.id)}
                    />
                  ))}
                </div>
              )}
              {m.role === "assistant" && m.progress && m.progress.length > 1 && (
                <ProgressStrip steps={m.progress} />
              )}
            </div>
          ))}
          {pending && (
            <div className="bg-muted/40 mr-6 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                <span>Thinking…</span>
              </div>
              {liveSteps && liveSteps.length > 0 && (
                <ul className="ml-3 space-y-0.5 border-l border-border pl-2">
                  {liveSteps.map((s, i) => {
                    const isWrite = s.skillId?.startsWith("pages.append")
                      || s.skillId?.startsWith("pages.create")
                      || s.skillId?.startsWith("pages.set_");
                    const isLast = i === liveSteps.length - 1;
                    return (
                      <li key={i} className="flex items-center gap-1.5 text-[11px]">
                        {isLast
                          ? <div className="h-2 w-2 rounded-full bg-brand animate-pulse shrink-0" />
                          : s.ok === false
                            ? <XCircle className="h-3 w-3 text-rose-500 shrink-0" />
                            : isWrite
                              ? <Pencil className="h-3 w-3 text-amber-500 shrink-0" />
                              : <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                        <span className="font-mono">{s.skillId ?? s.label}</span>
                        {s.ms != null && <span className="text-muted-foreground/60">· {s.ms}ms</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
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

        {showAt && (
          <div className="border-t border-border bg-card max-h-56 overflow-y-auto">
            {agents
              .filter((a) => a.id.startsWith(input.slice(1).toLowerCase()) || a.label.toLowerCase().startsWith(input.slice(1).toLowerCase()))
              .map((a) => (
                <Button
                  key={a.id}
                  variant="ghost"
                  className={cn(
                    "w-full h-auto text-left px-3 py-2 text-sm font-normal flex items-center gap-3 justify-start rounded-none",
                    a.id === agent.id && "bg-accent/40",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setAgent(a.id);
                    setInput("");
                    setShowAt(false);
                  }}
                >
                  <span className="text-base shrink-0">{a.glyph}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{a.tagline}</div>
                  </div>
                  {a.id === agent.id && <CheckCircle2 className="h-3.5 w-3.5 text-brand" />}
                </Button>
              ))}
          </div>
        )}

        <div className="border-t border-border p-3 space-y-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="@ agent · / skill · ⌘↵ send"
            className="min-h-[60px] text-sm"
            disabled={pending}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <AtSign className="h-3 w-3" /> agent
              <Slash className="h-3 w-3 ml-1" /> skill
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={clear} disabled={pending || messages.length === 0}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
              <Button size="sm" onClick={handleSend} disabled={pending || !input.trim()}>
                <ArrowUp className="h-3.5 w-3.5 mr-1" /> Send
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ onPick }: { onPick: (prefix: string) => void }) {
  return (
    <div className="text-center py-8 space-y-3 text-sm text-muted-foreground">
      <Sparkles className="h-6 w-6 mx-auto opacity-50" />
      <div>Type <code>@</code> to switch agent, <code>/</code> for a skill.</div>
      <div className="grid grid-cols-1 gap-1 mt-3 text-left">
        {SLASH_COMMANDS.slice(0, 5).map((c) => (
          <Button
            key={c.id}
            variant="outline"
            className="h-auto px-2 py-1 text-xs font-normal justify-start"
            onClick={() => onPick(c.trigger + " ")}
          >
            <span className="font-mono text-brand">{c.trigger}</span>
            <span className="text-muted-foreground"> · {c.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function ActionCard({
  proposal, onApprove, onDiscard,
}: {
  proposal: ProposalCall;
  onApprove: () => void;
  onDiscard: () => void;
}) {
  const isWrite = proposal.skillId.startsWith("pages.");
  return (
    <div
      className={cn(
        "rounded-md border p-2.5 text-xs",
        proposal.state === "applied" && "border-emerald-500/40 bg-emerald-500/5",
        proposal.state === "discarded" && "border-border opacity-60",
        proposal.state === "error" && "border-rose-500/40 bg-rose-500/5",
        proposal.state === "pending" && "border-amber-500/40 bg-amber-500/5",
        proposal.state === "approving" && "border-brand/40 bg-brand/5",
      )}
    >
      <div className="flex items-start gap-2">
        {isWrite ? <Pencil className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" /> : <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[11px]">{proposal.skillId}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{proposal.label}</div>
          <details className="mt-1">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">args</summary>
            <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted/40 p-1.5 text-[10px] whitespace-pre-wrap break-all">
              {JSON.stringify(proposal.args, null, 2)}
            </pre>
          </details>
          {proposal.error && (
            <div className="mt-1 text-[11px] text-rose-600">{proposal.error}</div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        {proposal.state === "pending" && (
          <>
            <Button size="sm" variant="ghost" onClick={onDiscard} className="h-8 px-3 text-xs">
              Discard
            </Button>
            <Button size="sm" onClick={onApprove} className="h-8 px-3 text-xs">
              Approve
            </Button>
          </>
        )}
        {proposal.state === "approving" && (
          <span className="text-[11px] text-brand">Applying…</span>
        )}
        {proposal.state === "applied" && (
          <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Applied
          </span>
        )}
        {proposal.state === "discarded" && (
          <span className="text-[11px] text-muted-foreground">Discarded</span>
        )}
        {proposal.state === "error" && (
          <Button size="sm" onClick={onApprove} className="h-8 px-3 text-xs">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

function ProgressStrip({ steps }: { steps: NonNullable<ReturnType<typeof useAIChat>["messages"][number]["progress"]> }) {
  const [open, setOpen] = useState(false);
  const toolSteps = steps.filter((s) => s.kind === "tool");
  if (toolSteps.length === 0) return null;
  const totalMs = toolSteps.reduce((n, s) => n + (s.ms ?? 0), 0);
  return (
    <div className="mr-6 mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3" />
        {toolSteps.length} tool call{toolSteps.length === 1 ? "" : "s"} · {totalMs}ms
      </button>
      {open && (
        <ul className="mt-1 ml-4 space-y-0.5 border-l border-border pl-2">
          {steps.map((s, i) => {
            const isWrite = s.skillId?.startsWith("pages.append")
              || s.skillId?.startsWith("pages.create")
              || s.skillId?.startsWith("pages.set_");
            return (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {s.kind === "tool"
                  ? (s.ok === false
                      ? <XCircle className="h-3 w-3 text-rose-500" />
                      : isWrite
                        ? <Pencil className="h-3 w-3 text-amber-500" />
                        : <SearchIcon className="h-3 w-3 text-emerald-500" />)
                  : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                <span className="font-mono">{s.skillId ?? s.label}</span>
                {s.ms != null && <span className="text-muted-foreground/60">· {s.ms}ms</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SessionRail({
  sessions, activeId, onSwitch, onRename, onDelete,
}: {
  sessions: ReturnType<typeof useAIChat>["sessions"];
  activeId: string;
  onSwitch: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border-b border-border bg-muted/20 max-h-48 overflow-y-auto">
      {sessions.length === 0 && (
        <div className="px-3 py-3 text-[11px] text-muted-foreground text-center">No history yet.</div>
      )}
      {sessions.map((s) => (
        <div
          key={s.id}
          className={cn(
            "group flex items-center gap-1 px-1 text-xs hover:bg-accent/30 transition",
            s.id === activeId && "bg-accent/40",
          )}
        >
          {/* Switch button = the full clickable row (button element so
              keyboard nav + click events behave). Inner rename/delete
              buttons sit OUTSIDE this button so there's no nested-
              button HTML warning + their clicks aren't swallowed. */}
          <button
            type="button"
            onClick={() => onSwitch(s.id)}
            className="flex-1 min-w-0 flex items-center gap-2 py-1.5 px-2 text-left rounded transition-colors"
          >
            <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="flex-1 min-w-0 truncate">{s.title}</span>
            <span className="text-[10px] text-muted-foreground/70 shrink-0">{s.messages.length}</span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = window.prompt("Rename session", s.title);
              if (next && next.trim()) onRename(s.id, next.trim());
            }}
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 [&_svg]:size-3"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.confirm(`Delete "${s.title}"?`)) onDelete(s.id);
            }}
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive [&_svg]:size-3"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
