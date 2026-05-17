import { ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{msg}</div>
  );
}

export function Picker({ label, icon: Icon, value, items }: {
  label: string; icon?: any; value: string;
  items: { id: string; label: string; icon?: any; onClick: () => void }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-auto gap-1 bg-card px-2 py-1 text-xs font-normal [&_svg]:size-3">
          <span className="text-muted-foreground">{label}:</span>
          {Icon && <Icon className="h-3 w-3" />}
          <span className="font-medium">{value}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map(it => (
          <DropdownMenuItem key={it.id} onClick={it.onClick}>
            {it.icon && <it.icon className="mr-2 h-3.5 w-3.5" />}
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
