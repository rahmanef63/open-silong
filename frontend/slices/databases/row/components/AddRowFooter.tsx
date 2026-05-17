import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface Props {
  onAdd: () => void;
}

export function AddRowFooter({ onAdd }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onAdd}
      className="flex w-full h-auto items-center gap-2 px-3 py-2 text-xs font-normal text-muted-foreground border-t border-border rounded-none justify-start [&_svg]:size-3"
    >
      <Plus className="h-3 w-3" /> New row
    </Button>
  );
}
