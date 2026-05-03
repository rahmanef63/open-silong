"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";

type Kind = "bug" | "idea" | "praise" | "other";
const KINDS: { id: Kind; label: string; emoji: string }[] = [
  { id: "bug", label: "Bug", emoji: "🐞" },
  { id: "idea", label: "Idea", emoji: "💡" },
  { id: "praise", label: "Praise", emoji: "🙌" },
  { id: "other", label: "Other", emoji: "💬" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: Props) {
  const [kind, setKind] = useState<Kind>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const create = useMutation(api.feedback.mutations.createFeedback);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await create({ kind, message });
      setSent(true);
      setMessage("");
      setTimeout(() => {
        setSent(false);
        onOpenChange(false);
      }, 1200);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>Bug, idea, praise — drop a note. We read every one.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-1">
            {KINDS.map((k) => (
              <Button
                key={k.id}
                size="sm"
                variant={kind === k.id ? "default" : "outline"}
                onClick={() => setKind(k.id)}
              >
                <span className="mr-1">{k.emoji}</span>{k.label}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="msg" className="sr-only">Message</Label>
            <Textarea
              id="msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened…"
              className="min-h-[120px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !message.trim() || sent}>
              {sent ? "Sent ✓" : sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
