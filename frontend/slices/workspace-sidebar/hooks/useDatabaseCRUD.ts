"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/shared/lib/store";

const BASE = "/dashboard";

/**
 * Database CRUD orchestrator — adapted from SuperSpace's useWorkspaceCRUD.
 * A "new database" creates a host page with a single database block, mirroring
 * the existing inline flow but with a name+icon dialog up front.
 */
export function useDatabaseCRUD() {
  const { createPage, createDatabase, addBlock, updateBlock } = useStore();
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);

  const handleCreateSubmit = useCallback(
    async (data: { name: string; icon: string }) => {
      const [hostPage, db] = await Promise.all([
        createPage(null, { title: data.name, icon: data.icon }),
        createDatabase(data.name),
      ]);
      const blockId = await addBlock(hostPage.id, 0, "database");
      updateBlock(hostPage.id, blockId, { databaseId: db.id });
      router.push(`${BASE}/p/${hostPage.id}`);
    },
    [createPage, createDatabase, addBlock, updateBlock, router],
  );

  return {
    createOpen,
    setCreateOpen,
    openCreate,
    handleCreateSubmit,
  };
}
