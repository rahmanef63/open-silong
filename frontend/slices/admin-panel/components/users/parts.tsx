import Image from "next/image";
import { Badge } from "@/shared/ui/badge";
import type { User } from "./types";

export function Avatar({ user, large }: { user: User; large?: boolean }) {
  const size = large ? "h-10 w-10" : "h-6 w-6";
  const px = large ? 40 : 24;
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={px}
        height={px}
        unoptimized
        className={`${size} rounded-full shrink-0 object-cover`}
      />
    );
  }
  return (
    <div className={`${size} shrink-0 grid place-items-center rounded-full bg-muted text-xs uppercase`}>
      {(user.name ?? user.email ?? "?").slice(0, 1)}
    </div>
  );
}

export function RoleBadge({ role }: { role: User["role"] }) {
  const cls =
    role === "superadmin"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : role === "admin"
        ? "border-brand/50 bg-brand/10 text-foreground"
        : "border-border bg-muted/40 text-muted-foreground";
  return (
    <Badge variant="outline" className={`${cls} text-[10px] px-1.5 py-0 h-4 font-normal`}>{role}</Badge>
  );
}
