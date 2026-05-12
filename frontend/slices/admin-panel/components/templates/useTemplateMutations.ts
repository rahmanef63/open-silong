"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Template } from "./types";

export function useTemplateMutations() {
  const seedDefaults = useMutation(api.templates.mutations.seedDefaults);
  const upsert = useMutation(api.templates.mutations.upsertTemplate);
  const deleteTpl = useMutation(api.templates.mutations.deleteTemplate);
  const [seeding, setSeeding] = useState(false);

  async function togglePublish(t: Template) {
    try {
      await upsert({
        id: t._id,
        name: t.name,
        icon: t.icon,
        category: t.category,
        description: t.description ?? undefined,
        json: t.json,
        isPublished: !t.isPublished,
      });
      toast.success(t.isPublished ? "Unpublished" : "Published");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function duplicate(t: Template) {
    try {
      await upsert({
        name: `${t.name} (copy)`,
        icon: t.icon,
        category: t.category,
        description: t.description ?? undefined,
        json: t.json,
        isPublished: false,
      });
      toast.success(`Duplicated "${t.name}"`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function doDelete(t: Template) {
    try {
      await deleteTpl({ id: t._id });
      toast.success(`Deleted "${t.name}"`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function reseed() {
    setSeeding(true);
    try {
      const r = await seedDefaults({});
      toast.success(`Seeded · ${r.inserted} new · ${r.updated} updated`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  return { togglePublish, duplicate, doDelete, reseed, seeding };
}
