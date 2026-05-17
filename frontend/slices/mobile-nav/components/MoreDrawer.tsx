"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/shared/ui/drawer";
import { FileBox, Settings, User, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { ROUTES, ROUTES_ABS } from "@/shared/lib/routes";
import { Button } from "@/shared/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onNavigate: (href: string, isExternal?: boolean) => void;
  onOpenTemplates: () => void;
}

interface Tile {
  id: string;
  icon: typeof FileBox;
  label: string;
  hint: string;
  hue: string;
  onClick: () => void;
}

export function MoreDrawer({ open, onOpenChange, isAdmin, onNavigate, onOpenTemplates }: Props) {
  const tiles: Tile[] = [
    { id: "templates", icon: FileBox, label: "Templates", hint: "Spin up a starter page", hue: "from-violet-500 to-fuchsia-600", onClick: onOpenTemplates },
    { id: "profile", icon: User, label: "Profile", hint: "Your account", hue: "from-sky-500 to-blue-600", onClick: () => onNavigate(ROUTES.profile) },
    { id: "settings", icon: Settings, label: "Settings", hint: "Theme · density · behaviour", hue: "from-zinc-500 to-zinc-700", onClick: () => onNavigate(ROUTES.settings) },
    { id: "trash", icon: Trash2, label: "Trash", hint: "Restore or empty", hue: "from-amber-500 to-orange-600", onClick: () => onNavigate(ROUTES.trash) },
  ];
  if (isAdmin) {
    tiles.push({
      id: "admin",
      icon: ShieldAlert,
      label: "Admin",
      hint: "Operational control",
      hue: "from-red-500 to-rose-700",
      // Uses absolute path because MobileBottomNav routes this branch through next/navigation's router (the `isExternal` path).
      onClick: () => onNavigate(ROUTES_ABS.admin, true),
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-base">More</DrawerTitle>
          <DrawerDescription className="text-xs">Templates, profile, settings, and more.</DrawerDescription>
        </DrawerHeader>
        <div className="px-3 pb-4 grid grid-cols-2 gap-2">
          {tiles.map((t) => (
            <Button
              variant="outline"
              key={t.id}
              type="button"
              variant="outline"
              onClick={(e) => { e.currentTarget.blur(); t.onClick(); }}
              className="h-auto flex-col items-start rounded-xl bg-card p-3 text-left font-normal transition hover:bg-accent active:scale-[0.98]"
            >
              <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br grid place-items-center text-white mb-2", t.hue)}>
                <t.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs text-muted-foreground truncate">{t.hint}</div>
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
