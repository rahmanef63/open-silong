import { cn } from "@/shared/lib/utils";
import {
  previewTweakcnPreset, tweakcnSwatches,
  type TweakcnPresetGroup, type TweakcnPresetItem,
} from "../../lib/tweakcn";

export function PresetList({
  groups, presetName, onPreview, onRestore, onCommit,
}: {
  groups: TweakcnPresetGroup<TweakcnPresetItem>[];
  presetName: string | null;
  onPreview: (name: string) => void;
  onRestore: () => void;
  onCommit: (name: string) => void;
}) {
  void onPreview;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {groups.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          Loading presets…
        </p>
      )}
      {groups.map((grp) => (
        <div key={grp.id}>
          <div className="sticky top-0 z-10 border-b border-border/30 bg-popover/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            {grp.label}
          </div>
          {grp.items.map((p) => {
            const selected = p.name === presetName;
            const swatches = tweakcnSwatches(p);
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onCommit(p.name)}
                onMouseEnter={() => previewTweakcnPreset(p.name)}
                onFocus={() => previewTweakcnPreset(p.name)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  selected && "bg-accent text-accent-foreground",
                )}
                aria-pressed={selected}
              >
                <span className="flex shrink-0 items-center gap-0.5">
                  {swatches.map((c, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="block h-3 w-3 rounded-full border border-border/60"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="flex-1 truncate">{p.title}</span>
                {selected && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
