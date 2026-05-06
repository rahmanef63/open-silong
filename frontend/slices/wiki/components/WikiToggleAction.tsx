"use client";

import { BookOpen, BookCheck } from "lucide-react";
import { toast } from "sonner";
import { reportError } from "@/shared/lib/error";
import { useWiki } from "../hooks/useWiki";

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
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{enabled ? "Remove wiki" : "Turn into wiki"}</span>
    </button>
  );
}
