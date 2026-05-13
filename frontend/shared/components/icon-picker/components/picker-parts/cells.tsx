import { cn } from "@/shared/lib/utils";
import { lucideValue } from "../../lib/parse";
import { DynamicIcon } from "../DynamicIcon";

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-8 gap-1">{children}</div>;
}

export function EmojiCell({ emoji, active, onClick }: { emoji: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded text-lg leading-none transition",
        active ? "bg-brand/15 ring-1 ring-brand" : "hover:bg-accent",
      )}
      title={emoji}
    >
      <DynamicIcon value={emoji} className="text-lg" />
    </button>
  );
}

export function LucideCell({ name, color, active, onClick }: { name: string; color: string | undefined; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded transition",
        active ? "bg-brand/15 ring-1 ring-brand" : "hover:bg-accent",
      )}
      title={name}
    >
      <DynamicIcon value={lucideValue(name, color)} className="text-base" />
    </button>
  );
}

export function Empty() {
  return (
    <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
      No matches.
    </div>
  );
}
