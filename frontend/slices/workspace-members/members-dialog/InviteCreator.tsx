import { Plus, Check, Copy, Link2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface Props {
  draftRole: "editor" | "viewer";
  onRoleChange: (r: "editor" | "viewer") => void;
  pending: boolean;
  lastCode: string | null;
  onCreate: () => void;
  onCopy: (code: string) => void;
}

export function InviteCreator({
  draftRole, onRoleChange, pending, lastCode, onCreate, onCopy,
}: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Invite link
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7">
              Role: {draftRole}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRoleChange("editor")}>
              {draftRole === "editor" && <Check className="mr-2 h-3.5 w-3.5" />}
              Editor — can read + write
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRoleChange("viewer")}>
              {draftRole === "viewer" && <Check className="mr-2 h-3.5 w-3.5" />}
              Viewer — read-only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button onClick={onCreate} disabled={pending} className="w-full" size="sm">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {pending ? "Creating…" : "Create new invite link"}
      </Button>
      {lastCode && (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs">
          <div className="mb-1.5 flex items-center gap-1.5 font-medium text-success">
            <Link2 className="h-3.5 w-3.5" /> Invite link ready (copy now)
          </div>
          <div className="break-all rounded bg-background p-2 font-mono text-[10px]">
            {`${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/invite/${lastCode}`}
          </div>
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onCopy(lastCode)}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
          </Button>
        </div>
      )}
    </section>
  );
}
