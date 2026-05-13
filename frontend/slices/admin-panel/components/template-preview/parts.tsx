import type { TemplateTreeNode } from "@/slices/templates/lib/previewTemplate";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-2">
      {children}
    </div>
  );
}

export function StatTile({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5 flex items-center gap-2.5">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-lg font-semibold leading-none tabular-nums">{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

export function TreeNode({ node }: { node: TemplateTreeNode }) {
  const indent = node.depth * 14;
  return (
    <div>
      <div className="flex items-baseline gap-1.5 text-sm leading-relaxed" style={{ paddingLeft: indent }}>
        {node.kind === "page" ? (
          <span className="text-base shrink-0">{node.icon ?? "📄"}</span>
        ) : node.kind === "database" ? (
          <span className="text-base shrink-0">{node.icon ?? "📊"}</span>
        ) : (
          <span className="text-muted-foreground/50 shrink-0 select-none">·</span>
        )}
        <span
          className={
            node.kind === "page"
              ? "font-medium truncate"
              : node.kind === "database"
                ? "text-blue-600 dark:text-blue-400 truncate"
                : "text-muted-foreground truncate"
          }
        >
          {node.label}
        </span>
        {node.detail && (
          <span className="text-xs text-muted-foreground/70 truncate">{node.detail}</span>
        )}
      </div>
      {node.children?.map((c, i) => <TreeNode key={i} node={c} />)}
    </div>
  );
}
