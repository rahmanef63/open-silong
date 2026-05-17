import { Sparkles } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import { DATABASE_PRESETS } from "../lib/presets";
import { DynamicIcon } from "@/shared/components/icon-picker";

interface Props {
  onCreated: (databaseId: string) => void;
  trigger?: React.ReactNode;
}

export function DatabasePresetPicker({ onCreated, trigger }: Props) {
  const { createDatabase, updateDatabase } = useStore();

  const apply = async (presetId: string) => {
    const preset = DATABASE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const seed = preset.build();
    const stub = await createDatabase(seed.name);
    await updateDatabase(stub.id, {
      name: seed.name,
      icon: seed.icon,
      properties: seed.properties as any,
      views: seed.views as any,
      activeViewId: seed.activeViewId,
      templates: seed.templates ?? ([] as any),
      defaultTemplateId: seed.defaultTemplateId ?? null,
    } as any);
    onCreated(stub.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="h-auto gap-1 rounded px-2 py-1 text-xs font-normal [&_svg]:size-3">
            <Sparkles className="h-3 w-3" /> From preset
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">Database presets</DropdownMenuLabel>
        {DATABASE_PRESETS.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => apply(p.id)} className="flex items-start gap-2 py-2">
            <DynamicIcon value={p.icon} className="text-base mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2">{p.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
