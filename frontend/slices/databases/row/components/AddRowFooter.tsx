import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface Props {
  onAdd: () => void;
}

export function AddRowFooter({ onAdd }: Props) {
  return (
    <Button
      variant="ghost"
      type="button"
      variant="ghost"
      onClick={onAdd}
      className="h-auto w-full justify-start gap-2 rounded-none border-t border-border px-3 py-2 text-xs font-normal text-muted-foreground transition [&_svg]:size-3"
    >
      <Plus className="h-3 w-3" /> New row
    </Button>
  );
}
