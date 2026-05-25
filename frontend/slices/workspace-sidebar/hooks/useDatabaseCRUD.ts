"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/shared/lib/store";
import { ROUTES_ABS } from "@/shared/lib/routes";

/**
 * Database CRUD orchestrator
 * A "new database" creates a host page with a single database block, mirroring
 * the existing inline flow but with a name+icon dialog up front.
 */
export function useDatabaseCRUD() {
  const { createPage, createDatabase, addBlock } = useStore();
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);

  const handleCreateSubmit = useCallback(
    async (data: { name: string; icon: string }) => {
      const [hostPage, db] = await Promise.all([
        createPage(null, { title: data.name, icon: data.icon }),
        createDatabase(data.name),
      ]);
      // Single mutation — addBlock takes `init` which is spread onto
      // the new block. The previous addBlock(type) + fire-and-forget
      // updateBlock(databaseId) raced the route push: the page
      // sometimes opened with a database block whose databaseId was
      // still undefined when the editor first rendered.
      await addBlock(hostPage.id, 0, "database", { databaseId: db.id });
      router.push(ROUTES_ABS.page(hostPage.id));
    },
    [createPage, createDatabase, addBlock, router],
  );

  return {
    createOpen,
    setCreateOpen,
    openCreate,
    handleCreateSubmit,
  };
}
