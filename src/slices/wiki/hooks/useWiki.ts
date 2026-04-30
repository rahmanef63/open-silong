import type { WikiMeta } from "../types";

/**
 * Wiki bindings. Backend is not yet implemented; this hook returns an
 * inert shape so consumers can render the UI without conditionals.
 * Replace with Convex queries when the wiki feature is fully built.
 */
export function useWiki(pageId: string | undefined): {
  isLoading: boolean;
  meta: WikiMeta | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  verify: () => Promise<void>;
} {
  return {
    isLoading: false,
    meta: pageId ? null : null,
    enable: async () => { /* TODO: convex mutation */ },
    disable: async () => { /* TODO: convex mutation */ },
    verify: async () => { /* TODO: convex mutation */ },
  };
}
