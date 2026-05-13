interface Member {
  _id: unknown;
  name?: string | null;
  email?: string | null;
  role: string;
}

export function MembersList({ members }: { members: Member[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Members ({members.length})
      </h3>
      <div className="space-y-1.5">
        {members.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
        {members.map((m) => (
          <div
            key={String(m._id)}
            className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
              {(m.name ?? m.email ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{m.name ?? "Unknown"}</div>
              <div className="truncate text-xs text-muted-foreground">{m.email ?? "—"}</div>
            </div>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {m.role}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
