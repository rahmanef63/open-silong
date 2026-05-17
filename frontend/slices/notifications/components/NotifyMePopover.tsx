import { Bell, BellOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { useSubscription } from "../hooks/useSubscription";
import { SUBSCRIPTION_SCOPE_LABELS, type SubscriptionScope } from "../types";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

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
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded", isSubscribed ? "text-brand" : "text-muted-foreground")}
            aria-label="Notify me"
          >
            {isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
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
              <Button
                variant="ghost"
                key={scope}
                variant="ghost"
                onClick={() => toggleScope(scope)}
                className="h-auto w-full justify-between rounded px-2 py-1.5 text-xs font-normal"
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
              </Button>
            );
          })}
        </div>
        {isSubscribed && (
          <div className="border-t border-border p-1">
            <Button
              variant="ghost"
              onClick={unsubscribe}
              className="h-auto w-full justify-start gap-2 rounded px-2 py-1.5 text-xs font-normal text-destructive hover:text-destructive [&_svg]:size-3.5"
            >
              <BellOff className="h-3.5 w-3.5" /> Unsubscribe from page
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
