import { Bell, BellOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSubscription } from "../hooks/useSubscription";
import { SUBSCRIPTION_SCOPE_LABELS, type SubscriptionScope } from "../types";
import { cn } from "@/shared/lib/utils";

interface Props {
  pageId: string;
  trigger?: React.ReactNode;
}

const SCOPES: SubscriptionScope[] = ["page", "comments", "edits", "thread"];

export function NotifyMePopover({ pageId, trigger }: Props) {
  const { isSubscribed, scopes, toggleScope, unsubscribe } = useSubscription(pageId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            className={cn("flex h-8 w-8 items-center justify-center rounded hover:bg-accent", isSubscribed ? "text-brand" : "text-muted-foreground")}
            aria-label="Notify me"
          >
            {isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <Bell className="h-3 w-3" /> Notify me when…
        </div>
        <div className="p-1">
          {SCOPES.map((scope) => {
            const on = scopes.includes(scope);
            return (
              <button
                key={scope}
                onClick={() => toggleScope(scope)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-accent text-left"
              >
                <span>{SUBSCRIPTION_SCOPE_LABELS[scope]}</span>
                <span className={cn(
                  "h-3.5 w-7 rounded-full border transition relative",
                  on ? "bg-brand border-brand" : "bg-muted border-border"
                )}>
                  <span
                    className={cn(
                      "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-background transition",
                      on ? "left-3" : "left-0.5"
                    )}
                  />
                </span>
              </button>
            );
          })}
        </div>
        {isSubscribed && (
          <div className="border-t border-border p-1">
            <button
              onClick={unsubscribe}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-destructive hover:bg-accent"
            >
              <BellOff className="h-3.5 w-3.5" /> Unsubscribe from page
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
