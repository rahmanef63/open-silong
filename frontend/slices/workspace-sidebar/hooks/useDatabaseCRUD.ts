"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/shared/lib/store";
import { ROUTES_ABS } from "@/shared/lib/routes";

/**
 * Database CRUD orchestrator — sidebar "+ Database" trigger.
 *
 * Creates a STANDALONE full-page database at /dashboard/db/<id>. This
 * is the Notion split: databases are first-class entities with their
 * own dedicated route + no surrounding page blocks. Inline databases
 * (embedded inside an existing page's block stream) come from the
 * editor slash menu `/database` instead — see slashHandler.
 *
 * Pre-2026-05-25 this also created a host page wrapping a database
 * block; that hybrid is deprecated — see DatabasePage doc.
 */
export function useDatabaseCRUD() {
  const { createDatabase } = useStore();
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);

  const handleCreateSubmit = useCallback(
    async (data: { name: string; icon: string }) => {
      const db = await createDatabase(data.name, data.icon);
      router.push(ROUTES_ABS.database(db.id));
    },
    [createDatabase, router],
  );

  return {
    createOpen,
    setCreateOpen,
    openCreate,
    handleCreateSubmit,
  };
}
