"use client";

import { BookOpen, BookCheck } from "lucide-react";
import { toast } from "sonner";
import { reportError } from "@/shared/lib/error";
import { useWiki } from "../hooks/useWiki";
import { Button } from "@/shared/ui/button";

interface Props {
  pageId: string;
  onClose?: () => void;
}

export function WikiToggleAction({ pageId, onClose }: Props) {
  const { meta, enable, disable } = useWiki(pageId);
  const enabled = !!meta;

  const onClick = async () => {
    try {
      if (enabled) {
        await disable();
        toast.success("Wiki mode disabled");
      } else {
        await enable();
        toast.success("Wiki mode enabled");
      }
    } catch (err) {
      const safe = reportError("WikiToggleAction", err);
      toast.error(safe.message);
    }
    onClose?.();
  };

  const Icon = enabled ? BookCheck : BookOpen;
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="flex w-full h-auto items-center gap-2 px-3 py-1.5 text-sm font-normal justify-start rounded-none [&_svg]:size-3.5"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{enabled ? "Remove wiki" : "Turn into wiki"}</span>
    </Button>
  );
}
