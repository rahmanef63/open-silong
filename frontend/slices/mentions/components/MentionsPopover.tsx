import { AtSign } from "lucide-react";
import { useNavigate } from "@/shared/lib/router-compat";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { useStore } from "@/shared/lib/store";
import { useMentions } from "../hooks/useMentions";

interface Props {
  /** Restrict to one user's handle. Defaults to current user. */
  handle?: string;
  trigger?: React.ReactNode;
}

export function MentionsPopover({ handle, trigger }: Props) {
  const { user } = useStore();
  const target = (handle ?? user.name).replace(/\s+/g, "_").toLowerCase();
  const mentions = useMentions(target);
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-muted-foreground" aria-label="Mentions">
            <AtSign className="h-4 w-4" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <AtSign className="h-3 w-3" /> Mentions of @{target}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {mentions.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No mentions of @{target} yet. Type <code className="bg-muted px-1 rounded">@{target}</code> in any page.
            </div>
          )}
          {mentions.map((m, i) => (
            <button
              key={`${m.blockId}-${i}`}
              onClick={() => navigate(`/p/${m.pageId}`)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent border-b border-border last:border-0"
            >
              <span className="mt-0.5 text-base shrink-0">{m.pageIcon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{m.pageTitle}</div>
                <div className="line-clamp-2 text-[11px] text-muted-foreground">
                  …{m.excerpt}…
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
