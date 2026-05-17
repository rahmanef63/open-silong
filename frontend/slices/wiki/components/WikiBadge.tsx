"use client";

import { BookCheck, BookOpen, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { reportError } from "@/shared/lib/error";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import { useWiki } from "../hooks/useWiki";

interface Props {
  pageId: string;
  /** Owner sees verify/disable controls; non-owners see read-only. */
  isOwner?: boolean;
}

export function WikiBadge({ pageId, isOwner = true }: Props) {
  const { meta, verify, disable } = useWiki(pageId);
  if (!meta) return null;

  const onToggleVerify = async () => {
    try {
      await verify(!meta.verified);
      toast.success(meta.verified ? "Verification removed" : "Wiki verified");
    } catch (err) {
      const safe = reportError("WikiBadge.verify", err);
      toast.error(safe.message);
    }
  };

  const onDisable = async () => {
    try {
      await disable();
      toast.success("Wiki mode removed");
    } catch (err) {
      const safe = reportError("WikiBadge.disable", err);
      toast.error(safe.message);
    }
  };

  const Icon = meta.verified ? ShieldCheck : BookOpen;
  const tone = meta.verified
    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
    : "bg-muted border-border text-muted-foreground";

  return (
    <div className={cn("mt-3 flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs", tone)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium">
        {meta.verified ? "Verified wiki" : "Wiki"}
      </span>
      <span className="opacity-60">·</span>
      <DynamicIcon value={meta.ownerIcon} className="text-sm" />
      <span className="truncate">{meta.ownerName}</span>
      {isOwner && (
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onToggleVerify}
            className="h-auto rounded px-2 py-0.5 text-xs font-normal hover:bg-background/40"
          >
            {meta.verified ? "Unverify" : "Verify"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDisable}
            className="h-auto w-auto rounded px-2 py-0.5 hover:bg-background/40 [&_svg]:size-3"
            aria-label="Remove wiki mode"
          >
            <BookCheck className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
