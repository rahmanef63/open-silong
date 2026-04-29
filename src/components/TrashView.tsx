import { useStore } from "@/lib/store";
import { Trash2, RotateCcw, X } from "lucide-react";

export function TrashView() {
  const { trash, restorePage, permanentlyDelete } = useStore();

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-6 md:px-12 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Trash2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-serif">Trash</h1>
            <p className="text-sm text-muted-foreground">Restore or permanently delete pages.</p>
          </div>
        </div>

        {trash.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <div className="text-4xl mb-2">🧹</div>
            <div className="font-medium">Trash is empty</div>
            <p className="text-sm text-muted-foreground mt-1">Deleted pages will show up here.</p>
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-card divide-y divide-border">
            {trash.map(p => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">Deleted {new Date(p.updatedAt).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => restorePage(p.id)}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs hover:bg-accent"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
                <button
                  onClick={() => { if (confirm("Permanently delete? This cannot be undone.")) permanentlyDelete(p.id); }}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5" /> Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
