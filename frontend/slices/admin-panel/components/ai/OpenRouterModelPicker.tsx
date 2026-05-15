"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Loader2, Database, Search } from "lucide-react";

interface ModelEntry {
  id: string;
  name: string;
  promptUsd: number;
  completionUsd: number;
  context: number;
}

interface Props {
  onPick: (modelId: string) => void;
  currentModel?: string;
}

/** Live OpenRouter model catalog. Fetches on demand (button click) so we
 *  don't hammer the OR endpoint on every panel mount — admin changes the
 *  model rarely. Filterable by id substring. */
export function OpenRouterModelPicker({ onPick, currentModel }: Props) {
  const fetchModels = useAction(api.ai.chat.listOpenRouterModels);
  const [models, setModels] = useState<ModelEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const list = await fetchModels({});
      setModels(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  }

  const filtered = models
    ? models.filter((m) =>
        filter.trim().length === 0
          ? true
          : `${m.id} ${m.name}`.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  return (
    <section className="rounded-lg border border-border p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">OpenRouter live catalog</h3>
          <p className="text-xs text-muted-foreground">
            Browse all models with current pricing. Click a row to set as default.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Database className="h-3.5 w-3.5 mr-1.5" />}
          {models ? "Refresh" : "Load catalog"}
        </Button>
      </div>

      {models && (
        <>
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter (e.g. claude, gemini, llama)"
              className="h-8 text-sm"
            />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {filtered.length} / {models.length}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-1.5">Model</th>
                  <th className="text-right px-2 py-1.5">Prompt $/M</th>
                  <th className="text-right px-2 py-1.5">Completion $/M</th>
                  <th className="text-right px-2 py-1.5">Context</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const active = m.id === currentModel;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => onPick(m.id)}
                      className={
                        "cursor-pointer border-t border-border hover:bg-accent " +
                        (active ? "bg-accent/60" : "")
                      }
                    >
                      <td className="px-2 py-1.5">
                        <div className="font-mono">{m.id}</div>
                        <div className="text-muted-foreground">{m.name}</div>
                      </td>
                      <td className="text-right px-2 py-1.5 font-mono">
                        ${m.promptUsd.toFixed(2)}
                      </td>
                      <td className="text-right px-2 py-1.5 font-mono">
                        ${m.completionUsd.toFixed(2)}
                      </td>
                      <td className="text-right px-2 py-1.5 font-mono">
                        {(m.context / 1000).toFixed(0)}k
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
