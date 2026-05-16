"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/shared/lib/store";
import { ROUTE_BASE, ROUTES_ABS } from "@/shared/lib/routes";

/**
 * Page CRUD orchestrator — adapted from SuperSpace's useWorkspaceCRUD.
 * Manages dialog state for create + delete; rename stays inline because Notion
 * UX favours typing-to-rename over a modal. Caller drives navigation.
 */
export function usePageCRUD() {
  const { createPage, deletePage, getPage } = useStore();
  const router = useRouter();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  // Delete (move-to-trash) confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const openCreate = useCallback((parentId: string | null = null) => {
    setCreateParentId(parentId);
    setCreateOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(
    async (data: { parentId: string | null; title: string; icon: string }) => {
      const page = await createPage(data.parentId, {
        title: data.title || undefined,
        icon: data.icon,
      });
      router.push(ROUTES_ABS.page(page.id));
    },
    [createPage, router],
  );

  const openDelete = useCallback((pageId: string) => {
    setDeleteTargetId(pageId);
    setDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(
    async (pageId: string) => {
      await deletePage(pageId);
      // If user was viewing the trashed page, fall back to dashboard root.
      if (typeof window !== "undefined" && window.location.pathname.startsWith(ROUTES_ABS.page(pageId))) {
        router.push(ROUTE_BASE);
      }
    },
    [deletePage, router],
  );

  const deleteTarget = deleteTargetId ? (() => {
    const p = getPage(deleteTargetId);
    return p ? { id: p.id, title: p.title, icon: p.icon } : null;
  })() : null;

  return {
    // create
    createOpen,
    setCreateOpen,
    createParentId,
    openCreate,
    handleCreateSubmit,

    // delete
    deleteOpen,
    setDeleteOpen,
    deleteTarget,
    openDelete,
    handleDeleteConfirm,
  };
}
