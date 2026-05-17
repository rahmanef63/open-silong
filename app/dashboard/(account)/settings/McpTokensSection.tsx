"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { Copy, Trash2, Plus, Loader2, KeyRound } from "lucide-react";
import { Field } from "@/shared/components/forms/Field";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { formatRelTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";

interface IssuedToken { id: Id<"mcpTokens">; token: string; label: string }

export function McpTokensSection() {
  const tokens = useQuery(api["mcp/tokens"].listMine, {});
  const issueMut = useMutation(api["mcp/tokens"].issue);
  const revokeMut = useMutation(api["mcp/tokens"].revoke);
  const issuing = useAsyncError("McpTokens.issue");
  const revoking = useAsyncError("McpTokens.revoke");

  const [label, setLabel] = useState("");
  const [issued, setIssued] = useState<IssuedToken | null>(null);

  const onIssue = async () => {
    const trimmed = label.trim();
    if (!trimmed || issuing.pending) return;
    const res = await issuing.execute(async () => issueMut({ label: trimmed }));
    if (!res) return;
    setIssued({ id: res.id, token: res.token, label: res.label });
    setLabel("");
  };

  const onRevoke = async (id: Id<"mcpTokens">, label: string) => {
    if (!confirm(`Revoke "${label}"? Existing clients using this token will stop working.`)) return;
    await revoking.execute(async () => revokeMut({ tokenId: id }));
  };

  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s);
      toast.success("Token copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const live = (tokens ?? []).filter((t) => !t.revoked);
  const revoked = (tokens ?? []).filter((t) => t.revoked);

  return (
    <>
      <Field label="New token">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void onIssue(); } }}
            placeholder="Label e.g. Cursor laptop"
            maxLength={60}
            className="flex-1 min-w-[12rem] rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void onIssue()}
            disabled={!label.trim() || issuing.pending}
            className="h-auto gap-2 bg-background px-3 py-1.5 text-sm font-normal disabled:opacity-60 [&_svg]:size-3.5"
          >
            {issuing.pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Issue token
          </Button>
        </div>
        {issuing.error && (
          <p className="mt-2 text-xs text-destructive">{issuing.error.message}</p>
        )}
      </Field>

      {issued && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4 text-amber-600" /> Copy now — shown only once
          </div>
          <div className="flex items-center gap-2 rounded border border-border bg-card p-1">
            <code className="flex-1 px-2 py-1 text-xs font-mono break-all">{issued.token}</code>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void copy(issued.token)}
              className="h-7 gap-1 rounded px-2 text-xs font-normal [&_svg]:size-3.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Send as <code>Authorization: Bearer …</code> to <code>/mcp/v1</code>.
              We only stored the SHA-256 hash; you can&apos;t see this token again.
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIssued(null)}
              className="h-auto p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <Field label="Active tokens">
        {tokens === undefined ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : live.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tokens issued yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {live.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Issued {formatRelTime(t.createdAt)}
                    {t.lastUsedAt
                      ? ` · last used ${formatRelTime(t.lastUsedAt)}`
                      : " · never used"}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void onRevoke(t.id, t.label)}
                  disabled={revoking.pending}
                  className="h-auto gap-1 px-2 py-1 text-xs font-normal text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 [&_svg]:size-3.5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      {revoked.length > 0 && (
        <Field label={`Revoked (${revoked.length})`}>
          <ul className="space-y-1">
            {revoked.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="line-through">{t.label}</span>
                <span>· revoked</span>
              </li>
            ))}
          </ul>
        </Field>
      )}
    </>
  );
}
