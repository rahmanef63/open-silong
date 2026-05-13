import type { Database, Page } from "@/shared/types/domain";
import { type StructuralAction } from "./databaseActions/constants";
import { useDbCrud } from "./databaseActions/db";
import { usePropertyActions } from "./databaseActions/properties";
import { useRowActions } from "./databaseActions/rows";
import { useRelationActions } from "./databaseActions/relations";
import { useViewActions } from "./databaseActions/views";

interface Args {
  databaseMap: Map<string, Database>;
  pageMap: Map<string, Page>;
  pushStructuralAction: (a: StructuralAction) => void;
}

export function useDatabaseActions({ databaseMap, pageMap, pushStructuralAction }: Args) {
  const dbCrud = useDbCrud({ databaseMap });
  const props = usePropertyActions({
    databaseMap,
    mutUpdateDatabase: dbCrud.mutUpdateDatabase,
    pushStructuralAction,
  });
  const rows = useRowActions({
    databaseMap,
    pageMap,
    mutUpdateDatabase: dbCrud.mutUpdateDatabase,
    pushStructuralAction,
  });
  const relations = useRelationActions({
    databaseMap,
    mutUpdateDatabase: dbCrud.mutUpdateDatabase,
  });
  const views = useViewActions({
    databaseMap,
    mutUpdateDatabase: dbCrud.mutUpdateDatabase,
  });

  return {
    getDatabase: dbCrud.getDatabase,
    createDatabase: dbCrud.createDatabase,
    updateDatabase: dbCrud.updateDatabase,
    addDatabaseFromTable: dbCrud.addDatabaseFromTable,
    trashDatabase: dbCrud.trashDatabase,
    restoreDatabase: dbCrud.restoreDatabase,
    permanentlyDeleteDatabase: dbCrud.permanentlyDeleteDatabase,
    ...props,
    ...rows,
    ...relations,
    ...views,
  };
}
