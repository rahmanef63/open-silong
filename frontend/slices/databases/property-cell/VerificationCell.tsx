import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { PropertyValue } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { useStore } from "@/shared/lib/store";
import { formatRelTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";

interface Props {
  value: PropertyValue;
  onSet: (v: PropertyValue) => void;
  cellClass: string;
}

function isVerification(v: PropertyValue): v is { verified: boolean; by?: string; at?: number } {
  return !!v && typeof v === "object" && !Array.isArray(v) && "verified" in v;
}

/** Wiki-style row verification — Notion's `verification` property type.
 *  Click toggles verified flag; on flip-to-true, stamps current user +
 *  timestamp. Audit shown on hover via title attribute. */
export function VerificationCell({ value, onSet, cellClass }: Props) {
  const { user } = useStore();
  const v = isVerification(value) ? value : null;
  const verified = !!v?.verified;
  const flip = () => {
    if (verified) onSet({ verified: false });
    else onSet({ verified: true, by: user.id, at: Date.now() });
  };
  const Icon = verified ? ShieldCheck : ShieldAlert;
  const audit = verified && v?.at
    ? `Verified by ${user.name === user.id ? user.id : user.name} · ${formatRelTime(v.at)}`
    : "Not verified — click to verify";
  return (
    <Button
      variant="ghost"
      type="button"
      variant="ghost"
      onClick={flip}
      title={audit}
      className={cn(
        cellClass,
        "inline-flex h-auto items-center gap-1.5 rounded px-2 py-1 font-normal transition hover:bg-accent/50 [&_svg]:size-3.5",
        verified ? "text-emerald-600 hover:text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs">{verified ? "Verified" : "Verify"}</span>
    </Button>
  );
}
