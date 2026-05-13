import type { Preferences, UserProfile, Workspace } from "@/shared/types/domain";

export const seedWorkspace: Workspace = {
  id: "ws_demo",
  name: "Acme Studio",
  emoji: "🪐",
};

export const seedUser: UserProfile = {
  id: "user_me",
  name: "Alex Rivera",
  email: "alex@acme.studio",
  bio: "Designer & maker. Likes long walks and short meetings.",
  icon: "🦊",
  color: "24 90% 56%",
};

export const seedPreferences: Preferences = {
  theme: "light",
  sidebarDensity: "comfortable",
  defaultPageSort: "manual",
  editorBehavior: "default",
  landingView: "dashboard",
  lastOpenedPageId: null,
};

export const NOW = Date.now();
export const idSeed = (n: string) => `seed_${n}`;
