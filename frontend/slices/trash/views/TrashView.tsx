"use client";

import { useStore } from "@/shared/lib/store";
import { Trash2, RotateCcw, X, Table2, FileText } from "lucide-react";
import { DynamicIcon, DEFAULT_DATABASE_ICON } from "@/shared/components/icon-picker";
import { useConfirm } from "@/shared/components/ConfirmProvider";
import { formatDateTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";

export function TrashView() {
  const {
    trash, restorePage, permanentlyDelete,
    trashedDatabases, restoreDatabase, permanentlyDeleteDatabase,
  } = useStore();
  const confirm = useConfirm();

  const isEmpty = trash.length === 0 && trashedDatabases.length === 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Trash2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight font-serif">Trash</h1>
            <p className="text-sm text-muted-foreground">
              Restore or permanently delete items. Items older than 30 days are auto-purged.
            </p>
          </div>
          {!isEmpty && (
            <Button
              variant="outline"
              onClick={async () => {
                const total = trash.length + trashedDatabases.length;
                const ok = await confirm({
                  title: "Empty trash?",
                  description: `Permanently delete all ${total} item${total === 1 ? "" : "s"}. This cannot be undone.`,
                  variant: "destructive",
                  confirmLabel: "Delete all",
                });
                if (!ok) return;
                trash.forEach((p) => permanentlyDelete(p.id));
                trashedDatabases.forEach((db) => permanentlyDeleteDatabase(db.id));
              }}
              className="h-auto gap-1 rounded-md border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-normal text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Empty trash
            </Button>
          )}
        </div>

        {isEmpty ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <div className="text-4xl mb-2">🧹</div>
            <div className="font-medium">Trash is empty</div>
            <p className="text-sm text-muted-foreground mt-1">Deleted pages and databases will show up here.</p>
          </div>
        ) : (
          <>
            {trash.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  <FileText className="h-3 w-3" /> Pages ({trash.length})
                </h2>
                <ul className="rounded-xl border border-border bg-card divide-y divide-border">
                  {trash.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <DynamicIcon value={p.icon} className="text-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.title || "Untitled"}</div>
                        <div className="text-xs text-muted-foreground">Deleted {formatDateTime(p.updatedAt)}</div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => restorePage(p.id)}
                        className="h-auto gap-1 rounded-md px-2.5 py-1 text-xs font-normal [&_svg]:size-3.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Permanently delete page?",
                            description: "This cannot be undone.",
                            variant: "destructive",
                          });
                          if (ok) permanentlyDelete(p.id);
                        }}
                        className="h-auto gap-1 rounded-md px-2.5 py-1 text-xs font-normal text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3.5"
                      >
                        <X className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {trashedDatabases.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  <Table2 className="h-3 w-3" /> Databases ({trashedDatabases.length})
                </h2>
                <ul className="rounded-xl border border-border bg-card divide-y divide-border">
                  {trashedDatabases.map((db) => (
                    <li key={db.id} className="flex items-center gap-3 px-4 py-3">
                      <DynamicIcon value={db.icon} className="text-lg" fallback={DEFAULT_DATABASE_ICON} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{db.name || "Untitled database"}</div>
                        <div className="text-xs text-muted-foreground">
                          {db.rowIds.length} row{db.rowIds.length === 1 ? "" : "s"} · trashed {formatDateTime(db.updatedAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => restoreDatabase(db.id)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Delete "${db.name || "Untitled database"}"?`,
                            description: `${db.rowIds.length} row${db.rowIds.length === 1 ? "" : "s"} will be permanently deleted. This cannot be undone.`,
                            variant: "destructive",
                          });
                          if (ok) permanentlyDeleteDatabase(db.id);
                        }}
                        className="h-auto gap-1 rounded-md px-2.5 py-1 text-xs font-normal text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3.5"
                      >
                        <X className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
