import { BookOpen } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pageId: string;
  onClose?: () => void;
}

export function WikiToggleAction({ pageId, onClose }: Props) {
  const onClick = () => {
    void pageId;
    toast.info("Wiki mode", {
      description: "Marks a page as the verified source for a topic. Convex schema pending.",
    });
    onClose?.();
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
    >
      <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">Turn into wiki</span>
    </button>
  );
}
