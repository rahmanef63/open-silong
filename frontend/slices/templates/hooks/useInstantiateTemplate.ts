import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export function useInstantiateTemplate() {
  const m = useMutation(api.templates.mutations.instantiate);
  return async (templateId: Id<"pageTemplates">, parentPageId: string | null = null) => {
    return await m({ templateId, parentPageId: parentPageId ? (parentPageId as Id<"pages">) : null });
  };
}
