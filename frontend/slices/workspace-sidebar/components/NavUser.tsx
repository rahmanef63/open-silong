import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  ChevronsUpDown,
  LogOut,
  Settings as SettingsIcon,
  User as UserIcon,
  Palette,
  MessageSquarePlus,
} from "lucide-react";
import { FeedbackDialog } from "@/slices/feedback";
import { useStore } from "@/shared/lib/store";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui/sidebar";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const BASE = "/dashboard";

export function NavUser() {
  const { user } = useStore();
  const { isMobile } = useSidebar();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const go = (p: string) => router.push(`${BASE}${p}`);
  const [signingOut, setSigningOut] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const fallback = (user.name?.trim().charAt(0) || user.email?.charAt(0) || "?").toUpperCase();

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // proxy.ts re-redirects if cookies stale; force a hard nav so the
      // legacy SPA tears down and the landing layout takes over.
      window.location.replace("/auth");
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback
                  className="rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: user.color, color: "#fff" }}
                >
                  {user.icon || fallback}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name || "You"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email || "no-email"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-60" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="end"
            side={isMobile ? "bottom" : "top"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback
                    className="rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: user.color, color: "#fff" }}
                  >
                    {user.icon || fallback}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{user.name || "You"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email || "no-email"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => go("/profile")}>
                <UserIcon className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => go("/settings")}>
                <SettingsIcon className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => go("/settings#theme")}>
                <Palette className="mr-2 size-4" />
                Theme presets
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
                <MessageSquarePlus className="mr-2 size-4" />
                Send feedback
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleSignOut}
              disabled={signingOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              {signingOut ? "Signing out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </SidebarMenu>
  );
}
