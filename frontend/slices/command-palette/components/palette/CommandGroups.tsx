import {
  CommandGroup as CmdGroup,
  CommandItem as CmdItem,
} from "@/shared/ui/command";
import type { CommandGroup, CommandItem } from "../../lib/types";

interface GroupListProps {
  groups: CommandGroup[];
  query: string;
  /** Wrap a select handler with the palette's close + history tracker. */
  run: (fn: () => void | Promise<void>, track?: { id: string; label: string }) => () => void;
}

/** Renderless group list. Renders any consumer-supplied `CommandGroup[]`.
 *
 *  Filters per-group `hideOnQuery` / `showOnQueryOnly` flags so consumers
 *  can declare visibility without inline conditionals at the call site.
 */
export function CommandGroupList({ groups, query, run }: GroupListProps) {
  const hasQuery = query.trim().length > 0;
  return (
    <>
      {groups
        .filter((g) => {
          if (g.items.length === 0) return false;
          if (hasQuery && g.hideOnQuery) return false;
          if (!hasQuery && g.showOnQueryOnly) return false;
          return true;
        })
        .map((group) => (
          <CmdGroup key={group.id} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItemRenderer key={item.id} item={item} run={run} />
            ))}
          </CmdGroup>
        ))}
    </>
  );
}

function CommandItemRenderer({
  item,
  run,
}: {
  item: CommandItem;
  run: (fn: () => void | Promise<void>, track?: { id: string; label: string }) => () => void;
}) {
  return (
    <CmdItem value={item.value} onSelect={run(() => item.onSelect(), item.track)}>
      {item.icon}
      <span className="flex-1 truncate">{item.label}</span>
      {item.trailing}
    </CmdItem>
  );
}
