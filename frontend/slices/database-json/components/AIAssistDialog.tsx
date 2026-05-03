import { getErrorMessage } from "@/shared/lib/error";
import { useState } from "react";
import { AlertCircle, Check, Key, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import type { Database } from "@/shared/types/domain";
import {
  generateDatabase, generateRows, getApiKey, setApiKey, getModel, setModel,
} from "../lib/ai";
import { applyAIRows, applyImport, type AIRowDraft, type DatabaseExportV1 } from "../lib/serialize";

interface Props {
  /** Optional: when present, "Generate rows" mode appends to this database. */
  db?: Database;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (dbId: string) => void;
}

type Mode = "database" | "rows";

export function AIAssistDialog({ db, open, onOpenChange, onImported }: Props) {
  const { createDatabase, updateDatabase, addRow, setRowValue, updatePage } = useStore();
  const [mode, setMode] = useState<Mode>(db ? "rows" : "database");
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(5);
  const [apiKey, setLocalApiKey] = useState(getApiKey());
  const [model, setLocalModel] = useState(getModel());
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genDb, setGenDb] = useState<DatabaseExportV1 | null>(null);
  const [genRows, setGenRows] = useState<AIRowDraft[] | null>(null);
  const [done, setDone] = useState<{ kind: "db"; dbId: string } | { kind: "rows"; count: number } | null>(null);

  const reset = () => {
    setPrompt(""); setBusy(false); setError(null); setGenDb(null); setGenRows(null); setDone(null);
  };

  const persistKey = () => {
    setApiKey(apiKey); setModel(model);
  };

  const onGenerate = async () => {
    setError(null);
    setGenDb(null); setGenRows(null); setDone(null);
    if (!apiKey) { setError("Add your Anthropic API key first."); setShowKey(true); return; }
    if (!prompt.trim()) { setError("Describe what you want."); return; }
    setBusy(true);
    persistKey();
    try {
      if (mode === "database") {
        const j = await generateDatabase(prompt, apiKey);
        setGenDb(j);
      } else if (db) {
        const rows = await generateRows(prompt, db, apiKey, count);
        setGenRows(rows);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "AI request failed."));
    } finally {
      setBusy(false);
    }
  };

  const onApply = async () => {
    setBusy(true);
    setError(null);
    try {
      if (genDb) {
        const { dbId } = await applyImport(genDb, { createDatabase, updateDatabase, addRow, setRowValue, updatePage });
        setDone({ kind: "db", dbId });
        onImported?.(dbId);
      } else if (genRows && db) {
        const { count: c } = await applyAIRows(genRows, db, { addRow, setRowValue });
        setDone({ kind: "rows", count: c });
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Apply failed."));
    } finally {
      setBusy(false);
    }
  };

  const placeholder = mode === "database"
    ? "e.g. Project tracker with status, priority, due date, owner, and a formula for days remaining."
    : "e.g. 5 sample tasks for Q1 sprint about onboarding redesign.";

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" /> AI assist
          </DialogTitle>
          <DialogDescription>
            Describe a database or rows in plain language. Claude generates the schema (formulas included)
            — preview it, then apply.
          </DialogDescription>
        </DialogHeader>

        {/* Mode switcher */}
        <div className="flex items-center gap-1 rounded-md bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("database")}
            className={`flex-1 rounded px-2 py-1 ${mode === "database" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Generate database
          </button>
          <button
            type="button"
            onClick={() => setMode("rows")}
            disabled={!db}
            className={`flex-1 rounded px-2 py-1 disabled:opacity-40 ${mode === "rows" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            title={db ? "" : "Open a database first to generate rows"}
          >
            Generate rows{db ? ` for ${db.name}` : ""}
          </button>
        </div>

        {/* Prompt */}
        {!done && (
          <div className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {mode === "rows" && (
              <div className="flex items-center gap-2 text-xs">
                <label className="text-muted-foreground">Rows:</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 5)))}
                  className="h-7 w-16 rounded border border-border bg-background px-1.5"
                />
              </div>
            )}
          </div>
        )}

        {/* API key */}
        {!done && (
          <div className="rounded-md border border-border p-2 text-xs">
            <button
              type="button"
              onClick={() => setShowKey((x) => !x)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Key className="h-3 w-3" />
              {apiKey ? "Anthropic API key set · click to edit" : "Add Anthropic API key"}
            </button>
            {showKey && (
              <div className="mt-2 space-y-1.5">
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs"
                />
                <input
                  type="text"
                  placeholder="claude-sonnet-4-6"
                  value={model}
                  onChange={(e) => setLocalModel(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-[11px]"
                />
                <div className="text-[10px] text-muted-foreground">
                  Stored only in this browser (localStorage). Calls go directly to Anthropic.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {genDb && !done && (
          <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs">
            <div className="mb-1 text-sm font-medium">{genDb.database.icon} {genDb.database.name}</div>
            <div className="text-muted-foreground">
              {genDb.database.properties.length} properties · {genDb.database.views.length} views · {genDb.rows.length} rows
            </div>
            <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              {genDb.database.properties.slice(0, 12).map((p) => (
                <li key={p.id}>· {p.name} <span className="opacity-60">({p.type}{p.type === "formula" && p.formulaExpression ? ` = ${p.formulaExpression}` : ""})</span></li>
              ))}
            </ul>
          </div>
        )}
        {genRows && !done && (
          <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs">
            <div className="mb-1 text-sm font-medium">{genRows.length} rows generated</div>
            <ul className="space-y-0.5 text-[11px] text-muted-foreground">
              {genRows.slice(0, 8).map((r, i) => (
                <li key={i}>· {r.icon ?? "📄"} {r.title}</li>
              ))}
              {genRows.length > 8 && <li className="opacity-60">… +{genRows.length - 8} more</li>}
            </ul>
          </div>
        )}

        {/* Result */}
        {done && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-center text-sm">
            <Check className="mx-auto h-6 w-6 text-green-600 mb-2" />
            {done.kind === "db" ? "Database imported." : `Added ${done.count} rows.`}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          {!genDb && !genRows && !done && (
            <Button onClick={onGenerate} disabled={busy || !prompt.trim() || !apiKey}>
              {busy ? "Asking Claude…" : "Generate"}
            </Button>
          )}
          {(genDb || genRows) && !done && (
            <>
              <Button variant="outline" onClick={() => { setGenDb(null); setGenRows(null); }}>
                Discard & retry
              </Button>
              <Button onClick={onApply} disabled={busy}>
                {busy ? "Applying…" : "Apply"}
              </Button>
            </>
          )}
          {done && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
