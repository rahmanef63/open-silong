"use client";

/** Settings → Webhooks section.
 *
 *  Manages `convex/webhooks/{mutations,queries}` — register outbound
 *  HMAC-signed event endpoints. Secret is shown ONCE on create and
 *  never re-readable (`listMine` strips it). Subscription set is fixed
 *  v1: page.created / page.updated / page.deleted / db.created.
 *
 *  Auto-dispatch from entity mutations is a follow-up — for now the
 *  user must trigger `webhooks/deliver:run` manually (or via MCP) to
 *  test their endpoint.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { Copy, Trash2, Loader2, Webhook, ChevronRight } from "lucide-react";
import { Field } from "@/shared/components/forms/Field";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { formatRelTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Switch } from "@/shared/ui/switch";
import { WebhookDeliveryLog } from "./WebhookDeliveryLog";
import { cn } from "@/shared/lib/utils";

const EVENT_OPTIONS = [
  { id: "page.created", label: "Page created" },
  { id: "page.updated", label: "Page updated" },
  { id: "page.deleted", label: "Page deleted" },
  { id: "db.created", label: "Database created" },
  { id: "db.row.added", label: "Database row added" },
] as const;

interface IssuedWebhook { id: Id<"webhookEndpoints">; secret: string; url: string }

export function WebhooksSection() {
  const list = useQuery(api["webhooks/queries"].listMine, {});
  const createMut = useMutation(api["webhooks/mutations"].create);
  const toggleMut = useMutation(api["webhooks/mutations"].toggle);
  const removeMut = useMutation(api["webhooks/mutations"].remove);
  const creating = useAsyncError("Webhooks.create");
  const toggling = useAsyncError("Webhooks.toggle");
  const removing = useAsyncError("Webhooks.remove");

  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<Set<string>>(new Set(["page.updated"]));
  const [issued, setIssued] = useState<IssuedWebhook | null>(null);
  const [openLog, setOpenLog] = useState<Id<"webhookEndpoints"> | null>(null);

  const toggleEvent = (id: string) => {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const onCreate = async () => {
    const trimmed = url.trim();
    if (!trimmed || events.size === 0 || creating.pending) return;
    const res = await creating.execute(async () =>
      createMut({ url: trimmed, events: [...events] }),
    );
    if (!res) return;
    setIssued({ id: res.id, secret: res.secret, url: trimmed });
    setUrl("");
    toast.success("Webhook registered — copy the secret now");
  };

  const onToggle = async (id: Id<"webhookEndpoints">) => {
    await toggling.execute(async () => toggleMut({ endpointId: id }));
  };

  const onRemove = async (id: Id<"webhookEndpoints">, url: string) => {
    if (!confirm(`Delete webhook for "${url}"? Subscribers will stop receiving events.`)) return;
    await removing.execute(async () => removeMut({ endpointId: id }));
  };

  const copy = async (s: string) => {
    try { await navigator.clipboard.writeText(s); toast.success("Copied"); }
    catch { toast.error("Couldn't copy"); }
  };

  return (
    <>
      <Field label="Register endpoint">
        <div className="space-y-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhooks/nosion"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/30 p-2">
            {EVENT_OPTIONS.map((ev) => (
              <label key={ev.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={events.has(ev.id)}
                  onCheckedChange={() => toggleEvent(ev.id)}
                />
                <span className="font-mono text-[11px]">{ev.id}</span>
              </label>
            ))}
          </div>
          <Button
            onClick={() => void onCreate()}
            disabled={creating.pending || !url.trim() || events.size === 0}
            size="sm"
          >
            {creating.pending ? <><Loader2 className="h-3 w-3 animate-spin" /> Creating…</> : <><Webhook className="h-3 w-3" /> Register</>}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Each delivery POSTs JSON with <code>X-Nosion-Signature: sha256=&lt;hex&gt;</code>
          HMAC of the body. Verify on your endpoint with the secret shown
          once at create-time (it never re-displays).
        </p>
      </Field>

      {issued && (
        <Field label="✓ Webhook created — copy the secret below (only shown once)">
          <div className="rounded-md border border-brand/40 bg-brand/5 p-3 space-y-2">
            <div className="text-[11px] text-muted-foreground">Endpoint: <code>{issued.url}</code></div>
            <div className="flex gap-2">
              <code className="flex-1 truncate rounded border border-border bg-background px-2 py-1 text-xs font-mono">{issued.secret}</code>
              <Button size="sm" onClick={() => void copy(issued.secret)}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIssued(null)}>Dismiss</Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Store this somewhere safe. We don't show it again. If lost,
              delete the endpoint and register a new one.
            </p>
          </div>
        </Field>
      )}

      <Field label="Registered endpoints">
        {list === undefined && (
          <div className="text-xs text-muted-foreground">Loading…</div>
        )}
        {list && list.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
            No webhooks registered. Add one above.
          </div>
        )}
        <ul className="space-y-2">
          {(list ?? []).map((w) => {
            const expanded = openLog === w.id;
            return (
              <li key={String(w.id)} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <code className="truncate text-xs">{w.url}</code>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {w.events.map((e) => (
                        <span key={e} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {e}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                      {w.lastSuccessAt && <span>Last success: {formatRelTime(w.lastSuccessAt)}</span>}
                      {w.lastError && <span className="text-destructive">Last error: {w.lastError}</span>}
                      {!w.lastSuccessAt && !w.lastError && <span>No deliveries yet</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={w.enabled}
                      onCheckedChange={() => void onToggle(w.id)}
                      disabled={toggling.pending}
                      className="scale-75"
                      aria-label="Enable/disable"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void copy(w.url)}
                      className="h-7 w-7 text-muted-foreground"
                      title="Copy URL"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void onRemove(w.id, w.url)}
                      disabled={removing.pending}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenLog(expanded ? null : w.id)}
                  className="mt-2 h-auto w-full justify-start gap-1 px-1 py-1 text-[11px] font-normal text-muted-foreground hover:bg-accent/50"
                >
                  <ChevronRight className={cn("h-3 w-3 transition", expanded && "rotate-90")} />
                  {expanded ? "Hide" : "Show"} delivery history
                </Button>
                {expanded && (
                  <div className="mt-2 rounded border border-border bg-muted/20 p-2">
                    <WebhookDeliveryLog endpointId={w.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Field>
    </>
  );
}
