import { useState } from "react";
import { ChevronDown, Plus, FileText, Settings2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import type { Database } from "@/lib/types";
import { TemplatesDialog } from "./TemplatesDialog";

interface Props {
  db: Database;
  onCreated: (rowId: string) => void;
}

export function NewRowMenu({ db, onCreated }: Props) {
  const { addRow } = useStore();
  const [manageOpen, setManageOpen] = useState(false);
  const templates = db.templates ?? [];

  const create = async (templateId?: string) => {
    const row = await addRow(db.id, {}, templateId);
    onCreated(row.id);
  };

  return (
    <>
      <div className="flex items-stretch overflow-hidden rounded-md bg-foreground text-background">
        <button
          onClick={() => create(db.defaultTemplateId ?? undefined)}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:opacity-90"
        >
          <Plus className="h-3 w-3" /> New
        </button>
        <div className="w-px bg-background/30" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center px-1.5 hover:opacity-90"
              aria-label="Pick template"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">New row</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => create()}>
              <FileText className="mr-2 h-3.5 w-3.5" /> Empty row
            </DropdownMenuItem>
            {templates.length > 0 && <DropdownMenuSeparator />}
            {templates.length > 0 && (
              <DropdownMenuLabel className="text-xs text-muted-foreground">Templates</DropdownMenuLabel>
            )}
            {templates.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => create(t.id)}>
                <span className="mr-2 text-base leading-none">{t.icon ?? "📋"}</span>
                <span className="flex-1 truncate">{t.name}</span>
                {db.defaultTemplateId === t.id && (
                  <span className="text-[10px] text-muted-foreground">default</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setManageOpen(true)}>
              <Settings2 className="mr-2 h-3.5 w-3.5" /> Manage templates
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TemplatesDialog db={db} open={manageOpen} onOpenChange={setManageOpen} />
    </>
  );
}
