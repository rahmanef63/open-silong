import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { ChevronDown, MapPin, MoreHorizontal, Trash2 } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import type { Property } from "@/shared/types/domain";
import type { Pin } from "./MapSvg";

export function PropPicker({ label, value, props, onPick }: {
  label: string;
  value: string;
  props: Property[];
  onPick: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-auto gap-1 bg-card px-2 py-1 text-xs font-normal [&_svg]:size-3">
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-medium">{value}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        {props.length === 0 ? (
          <DropdownMenuItem disabled>Add a number property first</DropdownMenuItem>
        ) : props.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => onPick(p.id)}>{p.name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PinList({
  pins, onOpenRow, onDeleteRow,
}: {
  pins: Pin[];
  onOpenRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-48 overflow-y-auto">
      {pins.map((p) => (
        <div key={p.row.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 text-xs group">
          <Button variant="ghost" onClick={() => onOpenRow(p.row.id)} className="flex flex-1 h-auto items-center gap-2 text-left min-w-0 font-normal justify-start px-0 py-0 hover:bg-transparent [&_svg]:size-3">
            <MapPin className="h-3 w-3 shrink-0" style={{ color: p.color }} />
            <span className="flex-1 truncate">
              <DynamicIcon value={p.row.icon} className="text-sm mr-1 inline-flex" />
              {p.row.title || "Untitled"}
            </span>
            <span className="text-muted-foreground tabular-nums">{p.lat.toFixed(2)}, {p.lng.toFixed(2)}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-auto w-auto p-0.5 text-muted-foreground [&_svg]:size-3" aria-label="Row actions">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenRow(p.row.id)}>Open</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRow(p.row.id)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
