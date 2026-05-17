"use client";

/** Per-row admin actions on a ticket — status dropdown + reply.
 *  Self-contained: fires the mutations internally, so the parent
 *  view just renders <TicketActions row={...} /> and reactivity
 *  flows through the useQuery in FeedbackPanel. */

import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, MessageSquare, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import type { Row, TicketStatus } from "./types";

const STATUSES: { id: TicketStatus; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "in_review", label: "In review" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

export function TicketActions({ row }: { row: Row }) {
  const setStatus = useMutation(api.feedback.mutations.setStatus);
  const replyM = useMutation(api.feedback.mutations.replyToFeedback);
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(row.adminReply ?? "");
  const [closeAfter, setCloseAfter] = useState(false);

  async function pickStatus(next: TicketStatus) {
    if (next === row.status) return;
    setBusy(true);
    try {
      await setStatus({ id: row._id, status: next });
      toast.success(`Status → ${next.replace("_", " ")}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReply() {
    setBusy(true);
    try {
      await replyM({
        id: row._id,
        reply,
        nextStatus: closeAfter ? "resolved" : undefined,
      });
      toast.success("Reply sent");
      setReplyOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={busy} className="h-7 gap-1 px-2 text-xs">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Status
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {STATUSES.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => pickStatus(s.id)} disabled={s.id === row.status}>
              {s.label}{s.id === row.status ? " ✓" : ""}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        onClick={() => { setReply(row.adminReply ?? ""); setCloseAfter(false); setReplyOpen(true); }}
        className="h-7 gap-1 px-2 text-xs"
      >
        <MessageSquare className="h-3 w-3" />
        {row.adminReply ? "Edit reply" : "Reply"}
      </Button>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="font-medium">{row.title || row.kind}</div>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground line-clamp-4">{row.message}</p>
            </div>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply to the reporter…"
              rows={6}
              maxLength={8000}
              autoFocus
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={closeAfter} onChange={(e) => setCloseAfter(e.target.checked)} className="h-3.5 w-3.5" />
              Mark resolved after sending
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={submitReply} disabled={busy}>
                {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                {row.adminReply ? "Update reply" : "Send reply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
