import { useCallback } from "react";
import type { Database, Property } from "@/shared/types/domain";
import { uid } from "./constants";

interface Args {
  databaseMap: Map<string, Database>;
  mutUpdateDatabase: (args: { dbId: string; patch: Partial<Database> }) => void;
}

/** Toggle two-way mirroring on a relation property. Creates an
 *  inverse `relation` prop on the target db on enable; clears the
 *  inverse pointer on disable (does NOT delete the inverse prop —
 *  data is kept intact, future re-enable wires the same id back).
 *
 *  Returns the inverse prop id (newly created or existing) on
 *  enable; undefined on disable / no-op. */
export function useRelationActions({ databaseMap, mutUpdateDatabase }: Args) {
  const setRelationTwoWay = useCallback(
    (dbId: string, propId: string, on: boolean, inverseName?: string): string | undefined => {
      const srcDb = databaseMap.get(dbId);
      if (!srcDb) return undefined;
      const srcProp = srcDb.properties.find((p) => p.id === propId);
      if (!srcProp || srcProp.type !== "relation") return undefined;
      if (!on) {
        const properties = srcDb.properties.map((p) =>
          p.id === propId ? { ...p, relationTwoWay: false } : p,
        );
        mutUpdateDatabase({ dbId, patch: { properties } });
        return undefined;
      }
      if (!srcProp.relationDatabaseId) return undefined;
      const targetDb = databaseMap.get(srcProp.relationDatabaseId);
      if (!targetDb) return undefined;

      let inverseId = srcProp.relationInversePropertyId;
      const existingInverse = inverseId
        ? targetDb.properties.find((p) => p.id === inverseId)
        : undefined;

      if (!existingInverse) {
        const newInverse: Property = {
          id: uid(),
          name: inverseName ?? `Related ${srcDb.name}`,
          type: "relation",
          relationDatabaseId: srcDb.id,
          relationTwoWay: true,
          relationInversePropertyId: srcProp.id,
        };
        inverseId = newInverse.id;
        mutUpdateDatabase({
          dbId: targetDb.id,
          patch: { properties: [...targetDb.properties, newInverse] },
        });
      } else if (existingInverse.relationInversePropertyId !== srcProp.id) {
        // Repair pointer drift.
        const properties = targetDb.properties.map((p) =>
          p.id === existingInverse.id
            ? { ...p, relationInversePropertyId: srcProp.id, relationTwoWay: true }
            : p,
        );
        mutUpdateDatabase({ dbId: targetDb.id, patch: { properties } });
      }

      const properties = srcDb.properties.map((p) =>
        p.id === propId
          ? { ...p, relationTwoWay: true, relationInversePropertyId: inverseId }
          : p,
      );
      mutUpdateDatabase({ dbId, patch: { properties } });
      return inverseId;
    },
    [databaseMap, mutUpdateDatabase],
  );

  return { setRelationTwoWay };
}
