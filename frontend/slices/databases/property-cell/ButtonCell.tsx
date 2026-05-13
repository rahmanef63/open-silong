import type { Page, Property } from "@/shared/types/domain";

export function ButtonCell({ prop, row }: { prop: Property; row: Page }) {
  const label = prop.buttonLabel || "Run";
  const actions = prop.buttonActions ?? [];
  const onClick = () => {
    for (const a of actions) {
      if (a.kind === "open_url") {
        if (typeof window !== "undefined") window.open(a.url, "_blank", "noopener,noreferrer");
      } else if (a.kind === "open_page") {
        if (typeof window !== "undefined") window.location.href = `/dashboard/p/${a.pageId}`;
      } else if (a.kind === "show_confirmation") {
        if (typeof window !== "undefined") window.alert(a.message);
      }
      // edit_property action runner: requires store ref; deferred.
      void row;
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={actions.length === 0}
      className="m-1 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs hover:bg-accent disabled:opacity-50"
      title={actions.length === 0 ? "Configure actions in Edit property" : label}
    >
      {label}
    </button>
  );
}
