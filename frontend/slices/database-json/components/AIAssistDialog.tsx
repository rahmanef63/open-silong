import { getErrorMessage } from "@/shared/lib/error";
import { useState } from "react";
import { AlertCircle, Check, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { useStore } from "@/shared/lib/store";
import type { Database } from "@/shared/types/domain";
import {
  generateDatabase, generateRows, getApiKey, setApiKey, getModel, setModel,
} from "../lib/ai";
import { applyAIRows, applyImport, type AIRowDraft, type DatabaseExportV1 } from "../lib/serialize";
import { ApiKeyPanel } from "./ai-assist/ApiKeyPanel";
import { DbPreview, RowsPreview } from "./ai-assist/Preview";

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

  const onGenerate = async () => {
    setError(null);
    setGenDb(null); setGenRows(null); setDone(null);
    if (!apiKey) { setError("Add your Anthropic API key first."); setShowKey(true); return; }
    if (!prompt.trim()) { setError("Describe what you want."); return; }
    setBusy(true);
    setApiKey(apiKey); setModel(model);
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

        <div className="flex items-center gap-1 rounded-md bg-muted p-1 text-xs">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode("database")}
            className={`flex-1 h-auto px-2 py-1 text-xs font-normal ${mode === "database" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-transparent"}`}
          >
            Generate database
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode("rows")}
            disabled={!db}
            className={`flex-1 h-auto px-2 py-1 text-xs font-normal disabled:opacity-40 ${mode === "rows" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-transparent"}`}
            title={db ? "" : "Open a database first to generate rows"}
          >
            Generate rows{db ? ` for ${db.name}` : ""}
          </Button>
        </div>

        {!done && (
          <div className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="min-h-0 px-2 py-1.5 text-sm"
            />
            {mode === "rows" && (
              <div className="flex items-center gap-2 text-xs">
                <label className="text-muted-foreground">Rows:</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 5)))}
                  className="h-7 w-16 px-1.5 text-xs"
                />
              </div>
            )}
          </div>
        )}

        {!done && (
          <ApiKeyPanel
            apiKey={apiKey}
            onApiKeyChange={setLocalApiKey}
            model={model}
            onModelChange={setLocalModel}
            showKey={showKey}
            onToggleShow={() => setShowKey((x) => !x)}
          />
        )}

        {genDb && !done && <DbPreview genDb={genDb} />}
        {genRows && !done && <RowsPreview genRows={genRows} />}

        {done && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-center text-sm">
            <Check className="mx-auto h-6 w-6 text-green-600 mb-2" />
            {done.kind === "db" ? "Database imported." : `Added ${done.count} rows.`}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
