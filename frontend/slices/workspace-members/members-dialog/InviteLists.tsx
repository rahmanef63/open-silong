import { Clock, Copy, Trash2, Check, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { formatRelTime } from "@/shared/lib/format";

interface Invite {
  _id: unknown;
  code: string;
  role: string;
  createdAt: number;
  acceptedAt?: number | null;
  expired?: boolean | null;
}

export function PendingInvites({
  invites, onCopy, onRevoke,
}: {
  invites: Invite[];
  onCopy: (code: string) => void;
  onRevoke: (id: any) => void;
}) {
  if (invites.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Pending invites ({invites.length})
      </h3>
      <div className="space-y-1.5">
        {invites.map((inv) => (
          <div
            key={String(inv._id)}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs"
          >
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[10px]">{inv.code.slice(0, 12)}…</div>
              <div className="text-muted-foreground">
                {inv.role} · created {formatRelTime(inv.createdAt)}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onCopy(inv.code)} title="Copy link">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-destructive"
              onClick={() => onRevoke(inv._id)}
              title="Revoke"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InviteHistory({ invites }: { invites: Invite[] }) {
  if (invites.length === 0) return null;
  return (
    <details className="rounded-md border border-border">
      <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground hover:bg-accent/40">
        History ({invites.length})
      </summary>
      <div className="divide-y divide-border">
        {invites.map((inv) => (
          <div key={String(inv._id)} className="px-3 py-1.5 text-xs text-muted-foreground">
            {inv.acceptedAt ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-success" /> accepted {formatRelTime(inv.acceptedAt)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <X className="h-3 w-3" /> expired
              </span>
            )}
            <span className="ml-2">{inv.role}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
