import { Key } from "lucide-react";

export function ApiKeyPanel({
  apiKey, onApiKeyChange, model, onModelChange, showKey, onToggleShow,
}: {
  apiKey: string;
  onApiKeyChange: (k: string) => void;
  model: string;
  onModelChange: (m: string) => void;
  showKey: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="rounded-md border border-border p-2 text-xs">
      <button
        type="button"
        onClick={onToggleShow}
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
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs"
          />
          <input
            type="text"
            placeholder="claude-sonnet-4-6"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-[11px]"
          />
          <div className="text-[10px] text-muted-foreground">
            Stored only in this browser (localStorage). Calls go directly to Anthropic.
          </div>
        </div>
      )}
    </div>
  );
}
