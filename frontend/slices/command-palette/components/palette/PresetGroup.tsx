import { Sparkles } from "lucide-react";
import { CommandGroup, CommandItem } from "@/shared/ui/command";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { DATABASE_PRESETS } from "@/slices/database-presets";
import { ROUTES } from "@/shared/lib/routes";

interface Args {
  run: (fn: () => void) => () => void;
  navigate: (url: string) => void;
  createDatabase: (name: string) => Promise<{ id: string }>;
  updateDatabase: (id: string, patch: any) => void | Promise<void>;
  createPage: (parent: string | null, opts?: { title?: string; icon?: string }) => Promise<{ id: string }>;
  addBlock: (pageId: string, after: number, type: string) => Promise<string>;
  updateBlock: (pageId: string, blockId: string, patch: any) => void;
}

export function PresetGroup({
  run, navigate, createDatabase, updateDatabase, createPage, addBlock, updateBlock,
}: Args) {
  return (
    <CommandGroup heading="Create from preset">
      {DATABASE_PRESETS.map((preset) => (
        <CommandItem
          key={preset.id}
          value={`preset:${preset.id}:${preset.name}`}
          onSelect={run(async () => {
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
            const host = await createPage(null, { title: preset.name, icon: preset.icon });
            const blockId = await addBlock(host.id, -1, "database");
            updateBlock(host.id, blockId, { type: "database", databaseId: stub.id, text: "" });
            navigate(ROUTES.page(host.id));
          })}
        >
          <Sparkles className="mr-2 h-3.5 w-3.5 text-brand" />
          <DynamicIcon value={preset.icon} className="mr-2 text-base" />
          <span className="flex-1 truncate">{preset.name} database</span>
          <span className="text-[10px] text-muted-foreground">{preset.description.split(" ").slice(0, 4).join(" ")}…</span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
