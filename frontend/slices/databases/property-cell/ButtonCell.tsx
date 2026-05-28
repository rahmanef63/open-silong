import type { Page, Property } from "@/shared/types/domain";
import { Button } from "@/shared/ui/button";
import { ROUTES_ABS } from "@/shared/lib/routes";
import { useDbAdapter } from "../lib/useDbAdapter";
import { runButtonActions } from "./buttonActions";

export function ButtonCell({ prop, row }: { prop: Property; row: Page }) {
  const { setRowValue } = useDbAdapter();
  const label = prop.buttonLabel || "Run";
  const actions = prop.buttonActions ?? [];

  const onClick = () => {
    runButtonActions(actions, {
      openUrl: (url) => {
        if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
      },
      openPage: (pageId) => {
        if (typeof window !== "undefined") window.location.href = ROUTES_ABS.page(pageId);
      },
      confirm: (message) => (typeof window === "undefined" ? true : window.confirm(message)),
      editProperty: (propId, value) => {
        // edit_property targets THIS row's property. Needs the row's home
        // database; rows outside a database (no rowOfDatabaseId) no-op.
        if (row.rowOfDatabaseId) {
          void setRowValue(row.rowOfDatabaseId, row.id, propId, value);
        }
      },
    });
  };

  return (
    <Button
      variant="outline"
      type="button"
      onClick={onClick}
      disabled={actions.length === 0}
      className="m-1 inline-flex h-auto items-center gap-1 rounded-md bg-card px-2 py-0.5 text-xs font-normal"
      title={actions.length === 0 ? "Configure actions in Edit property" : label}
    >
      {label}
    </Button>
  );
}
