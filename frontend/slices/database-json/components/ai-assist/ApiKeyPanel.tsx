import { Key } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

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
      <Button
        type="button"
        variant="ghost"
        onClick={onToggleShow}
        className="flex h-auto p-0 items-center gap-1.5 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-3"
      >
        <Key className="h-3 w-3" />
        {apiKey ? "Anthropic API key set · click to edit" : "Add Anthropic API key"}
      </Button>
      {showKey && (
        <div className="mt-2 space-y-1.5">
          <Input
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="h-8 font-mono text-xs"
          />
          <Input
            type="text"
            placeholder="claude-sonnet-4-6"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="h-8 font-mono text-[11px]"
          />
          <div className="text-[10px] text-muted-foreground">
            Stored only in this browser (localStorage). Calls go directly to Anthropic.
          </div>
        </div>
      )}
    </div>
  );
}
