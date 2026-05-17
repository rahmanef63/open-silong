"use client";

/** Submit a new ticket — title + kind + priority + body. Replaces the
 *  bare FeedbackDialog when the user is on the Tickets settings tab.
 *  Inline (not a dialog) so it fits the section layout. */

import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import {
  KIND_META, KIND_ORDER, PRIORITY_META, PRIORITY_ORDER,
  type TicketKind, type TicketPriority,
} from "../lib/ticketMeta";

interface Props {
  onSubmitted?: () => void;
}

export function NewTicketForm({ onSubmitted }: Props) {
  const create = useMutation(api.feedback.mutations.createFeedback);
  const [kind, setKind] = useState<TicketKind>("bug");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("med");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!body.trim()) {
      toast.error("Description is required");
      return;
    }
    setBusy(true);
    try {
      await create({
        kind,
        title: title.trim() || undefined,
        message: body.trim(),
        priority,
      });
      toast.success("Ticket submitted — we'll review it shortly");
      setTitle("");
      setBody("");
      setKind("bug");
      setPriority("med");
      onSubmitted?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">Submit a new ticket</h3>

      <div>
        <Label className="text-xs uppercase text-muted-foreground">Type</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {KIND_ORDER.map((k) => {
            const meta = KIND_META[k];
            return (
              <Button
                key={k}
                type="button"
                variant="outline"
                onClick={() => setKind(k)}
                title={meta.description}
                className={cn(
                  "h-auto justify-start gap-1.5 px-2 py-1.5 text-xs font-normal",
                  kind === k ? "border-brand bg-brand/10 text-foreground" : "text-muted-foreground",
                )}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="ticket-title" className="text-xs uppercase text-muted-foreground">Title (optional)</Label>
        <Input
          id="ticket-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="One-line summary"
          maxLength={160}
          className="mt-1.5"
          disabled={busy}
        />
      </div>

      <div>
        <Label className="text-xs uppercase text-muted-foreground">Priority</Label>
        <div className="mt-1.5 flex gap-1.5">
          {PRIORITY_ORDER.map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              onClick={() => setPriority(p)}
              className={cn(
                "h-auto px-3 py-1 text-xs font-normal",
                priority === p ? "border-brand bg-brand/10 text-foreground" : "text-muted-foreground",
              )}
            >
              {PRIORITY_META[p].label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="ticket-body" className="text-xs uppercase text-muted-foreground">Description</Label>
        <Textarea
          id="ticket-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened? What did you expect? Steps to reproduce?"
          rows={5}
          maxLength={4000}
          className="mt-1.5"
          disabled={busy}
        />
        <p className="mt-1 text-[10px] text-muted-foreground">{body.length} / 4000</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy || !body.trim()}>
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
          Submit ticket
        </Button>
      </div>
    </div>
  );
}
