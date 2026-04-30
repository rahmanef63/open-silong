export interface DensityConfig {
  header: string;
  avatar: string;
  action: string;
  actionIcon: string;
  pageLink: string;
  toggle: string;
  section: string;
  sectionTitle: string;
  footer: string;
  indent: number;
  showWorkspaceMeta: boolean;
  showActionMeta: boolean;
}

export const DENSITY: Record<"comfortable" | "compact", DensityConfig> = {
  comfortable: {
    header: "px-3 py-3",
    avatar: "h-8 w-8 text-base",
    action: "min-h-8 gap-2 px-2 py-1.5 text-sm",
    actionIcon: "h-4 w-4",
    pageLink: "min-h-8 gap-1.5 py-1.5 text-sm",
    toggle: "h-6 w-6",
    section: "mb-4",
    sectionTitle: "text-[11px]",
    footer: "px-3 py-2 text-sm",
    indent: 12,
    showWorkspaceMeta: true,
    showActionMeta: true,
  },
  compact: {
    header: "px-2 py-2",
    avatar: "h-7 w-7 text-sm",
    action: "min-h-7 gap-1.5 px-2 py-1 text-xs",
    actionIcon: "h-3.5 w-3.5",
    pageLink: "min-h-7 gap-1 py-1 text-xs",
    toggle: "h-5 w-5",
    section: "mb-2",
    sectionTitle: "text-[10px]",
    footer: "px-2 py-1.5 text-xs",
    indent: 10,
    showWorkspaceMeta: false,
    showActionMeta: false,
  },
};
