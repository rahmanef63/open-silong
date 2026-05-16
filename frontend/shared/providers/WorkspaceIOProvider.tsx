/** @deprecated — provider migrated into the owning slice to satisfy
 *  the "shared never imports slices" rule. Import from
 *  `@/slices/workspace-io` instead. This file is a thin re-export so
 *  existing call-sites keep working. */
export {
  WorkspaceIOProvider,
  useWorkspaceIO,
} from "@/slices/workspace-io/components/WorkspaceIOProvider";
