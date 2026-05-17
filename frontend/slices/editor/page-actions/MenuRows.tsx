import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Switch } from "@/shared/ui/switch";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export function RowButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Button variant="ghost" className="h-auto w-full justify-start gap-2 rounded-none px-3 py-1.5 text-sm font-normal [&_svg]:size-3.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{label}</span>
    </Button>
  );
}

export function Row({
  icon: Icon, label, shortcut, onClick, destructive = false,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto w-full justify-start gap-2 rounded-none px-3 py-1.5 text-sm font-normal [&_svg]:size-3.5",
        destructive && "text-destructive hover:text-destructive",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", destructive ? "text-destructive" : "text-muted-foreground")} />
      <span className="flex-1 truncate">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-muted-foreground rounded bg-muted/60 px-1 py-0.5 border border-border">
          {shortcut}
        </span>
      )}
    </Button>
  );
}

export function ToggleRow({
  icon: Icon, label, checked, onChange,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
      {children}
    </div>
  );
}
