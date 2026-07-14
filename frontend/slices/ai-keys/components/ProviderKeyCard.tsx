"use client";

/** ProviderKeyCard — one row in the AISection key list. Surfaces label,
 *  scope badge, masked last4, enabled model count, validation status,
 *  and Edit / Delete actions. Personal cards expose the preferOwn
 *  toggle inline; workspace cards show a member-shared badge instead. */

import { useState } from "react";
import { Edit3, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { useConfirm } from "@/shared/components/ConfirmProvider";
import { cn } from "@/shared/lib/utils";
import type { UserKeyRow } from "../hooks/useAiKeys";

export interface ProviderKeyCardProps {
  row: UserKeyRow;
  onEdit: () => void;
  onRemove: () => void;
  onTogglePreferOwn: (next: boolean) => void;
  providerLabel?: string;
}

export function ProviderKeyCard({
  row, onEdit, onRemove, onTogglePreferOwn, providerLabel,
}: ProviderKeyCardProps) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const enabledModelCount = row.enabledModels.filter((m) => m.enabled).length;
  const validated = !!row.validatedAt && !row.validatedError;
  // Codex is an OAuth connection, not a pasted key — no Edit dialog, and
  // preferOwn has no effect (it resolves only via an explicit picker ref).
  const isCodex = row.provider === "openai-codex";
  const displayLabel = isCodex ? "ChatGPT (OAuth)" : (providerLabel ?? row.provider);

  const handleRemove = async () => {
    const ok = await confirm({
      title: "Remove AI key?",
      description: `${providerLabel ?? row.provider} key ending in ${row.last4} will be permanently removed.`,
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    setBusy(true);
    try { onRemove(); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {row.label || displayLabel}
            </span>
            <Badge variant={row.scope === "workspace" ? "default" : "secondary"} className="text-[10px]">
              {row.scope}
            </Badge>
            {isCodex && (
              <Badge variant="outline" className="text-[10px]">OAuth</Badge>
            )}
            <span className="font-mono text-[11px] text-muted-foreground">{row.last4}</span>
            {validated ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> validated
              </span>
            ) : row.validatedError ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="h-3 w-3" /> {row.validatedError}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {displayLabel} ·{" "}
            <span className="tabular-nums">{enabledModelCount}</span> model{enabledModelCount === 1 ? "" : "s"} enabled
            {row.endpoint ? ` · ${truncMid(row.endpoint, 36)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isCodex && (
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit key" className="h-7 w-7">
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            aria-label="Remove key"
            disabled={busy}
            className="h-7 w-7 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {row.scope === "personal" && !isCodex && (
        <div className={cn("mt-3 flex items-center justify-between gap-3 rounded border border-dashed border-border/60 px-3 py-2")}>
          <div>
            <p className="text-xs font-medium">Prefer this key</p>
            <p className="text-[11px] text-muted-foreground">
              When on, AI requests use this key first instead of the workspace or admin key.
            </p>
          </div>
          <Switch checked={row.preferOwn} onCheckedChange={onTogglePreferOwn} />
        </div>
      )}
    </div>
  );
}

function truncMid(s: string, max: number): string {
  if (s.length <= max) return s;
  const half = Math.floor((max - 1) / 2);
  return `${s.slice(0, half)}…${s.slice(-half)}`;
}
