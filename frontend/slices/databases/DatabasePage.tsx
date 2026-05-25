"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { useDbAdapter } from "./lib/useDbAdapter";
import { DatabaseBlock } from "./DatabaseBlock";
import { DatabaseSkeleton } from "@/shared/components/RouteSkeleton";
import { PageHeaderSlot } from "@/shared/components/PageHeaderSlot";
import { DynamicIcon, IconPickerPopover, DEFAULT_DATABASE_ICON } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useDebouncedCommit } from "@/shared/hooks/useDebouncedCommit";
import type { Block } from "@/shared/types/domain";

/**
 * Full-page database route. Renders a database as a first-class entity
 * — NOT inside a host page. The legacy "host page" concept (a regular
 * page whose only block was a database, marked via databaseHostFor) is
 * deprecated as of 2026-05-12. Databases live at /dashboard/db/[id].
 *
 * Why split: pages have blocks, databases have rows. They're different
 * shapes that don't compose. Putting a database inside a page-as-block
 * created edge cases where the host page's blocks could be deleted,
 * leaving the marker pointing at an empty page — exactly the bug that
 * triggered this refactor.
 *
 * Distinct from inline databases: a `database` block inside a page's
 * block stream IS editable as a mini DB (see DatabaseBlock). The
 * full-page route is the dedicated home that has no surrounding
 * blocks, no "+ Add block" affordance, no Subpages list — just the
 * database surface with editable icon + title chrome.
 */
export function DatabasePage() {
  const { id } = useParams<{ id: string }>();
  const { getDatabase, updateDatabase } = useDbAdapter();
  const navigate = useNavigate();
  const db = id ? getDatabase(id) : undefined;

  // Synthetic block — DatabaseBlock's prop shape is page-block-oriented,
  // but here we have a dbId directly. The block is never written to
  // anything; it's a render-time vehicle only.
  const block: Block = useMemo(
    () => ({ id: `__fullpage_${id}__`, type: "database", text: "", databaseId: id ?? "" }),
    [id],
  );

  if (!id) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No database id.
      </div>
    );
  }

  if (db === undefined) return <DatabaseSkeleton />;

  if (db === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <div>Database not found.</div>
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate(ROUTES.dashboard)}
          className="h-auto rounded-md px-3 py-1.5 text-sm font-normal"
        >
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (db.trashed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm">
        <div className="font-medium text-warning">
          Database is in Trash
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate(ROUTES.trash)}
          className="h-auto rounded-md px-3 py-1.5 text-sm font-normal"
        >
          Open Trash
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeaderSlot
        left={
          <FullPageHeaderChrome
            dbId={db.id}
            icon={db.icon}
            name={db.name}
            onChange={(patch) => updateDatabase(db.id, patch)}
          />
        }
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-none px-4 sm:px-6 md:px-12 pt-6 pb-12">
          <DatabaseBodyHeader
            icon={db.icon}
            name={db.name}
            onChange={(patch) => updateDatabase(db.id, patch)}
          />
          <DatabaseBlock pageId="" block={block} fullPage />
        </div>
      </div>
    </div>
  );
}

/** Body-level icon + name shown at top of the database surface, mirroring
 *  PageTitle's hero header but smaller (databases are dense, pages are
 *  hero-shaped). Icon size = 24px, my-[2.4rem] spacing per Notion-ish
 *  density. The topbar chrome (FullPageHeaderChrome) stays compact so the
 *  user keeps the icon+name visible while scrolling the database. */
function DatabaseBodyHeader({
  icon, name, onChange,
}: {
  icon: string | undefined;
  name: string;
  onChange: (patch: { name?: string; icon?: string }) => void;
}) {
  const [draftName, setDraftName, flush] = useDebouncedCommit(
    name,
    (v) => onChange({ name: v.trim() || "Untitled database" }),
  );
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraftName(name);
  }, [name, editing, setDraftName]);

  return (
    <div className="my-[2.4rem] flex items-center gap-3 min-w-0">
      <IconPickerPopover
        value={icon ?? DEFAULT_DATABASE_ICON}
        onChange={(next) => onChange({ icon: next })}
        onClear={() => onChange({ icon: DEFAULT_DATABASE_ICON })}
      >
        <Button
          type="button"
          variant="ghost"
          className="h-auto rounded-md p-1 text-[24px] font-normal leading-none [&_svg]:size-[24px]"
          aria-label="Change database icon"
        >
          <DynamicIcon
            value={icon}
            fallback={DEFAULT_DATABASE_ICON}
            className="text-[24px] shrink-0"
          />
        </Button>
      </IconPickerPopover>
      {editing ? (
        <Input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => { flush(); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { flush(); setEditing(false); }
            if (e.key === "Escape") { setDraftName(name); setEditing(false); }
          }}
          maxLength={120}
          className="h-9 flex-1 max-w-xl bg-transparent px-2 text-2xl font-bold"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="truncate text-2xl font-bold tracking-tight hover:text-muted-foreground transition"
          title="Click to rename"
        >
          {name || "Untitled database"}
        </button>
      )}
    </div>
  );
}

function FullPageHeaderChrome({
  dbId, icon, name, onChange,
}: {
  dbId: string;
  icon: string | undefined;
  name: string;
  onChange: (patch: { name?: string; icon?: string }) => void;
}) {
  void dbId;
  const [draftName, setDraftName, flush] = useDebouncedCommit(
    name,
    (v) => onChange({ name: v.trim() || "Untitled database" }),
  );
  const [editing, setEditing] = useState(false);

  // External name updates (e.g. another tab) should sync into the
  // debounced draft without clobbering local typing.
  useEffect(() => {
    if (!editing) setDraftName(name);
  }, [name, editing, setDraftName]);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <IconPickerPopover
        value={icon ?? DEFAULT_DATABASE_ICON}
        onChange={(next) => onChange({ icon: next })}
        onClear={() => onChange({ icon: DEFAULT_DATABASE_ICON })}
      >
        <Button
          type="button"
          variant="ghost"
          className="h-6 w-6 p-0 text-base"
          aria-label="Change database icon"
        >
          <DynamicIcon
            value={icon}
            fallback={DEFAULT_DATABASE_ICON}
            className="text-base shrink-0"
          />
        </Button>
      </IconPickerPopover>
      {editing ? (
        <Input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => { flush(); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { flush(); setEditing(false); }
            if (e.key === "Escape") { setDraftName(name); setEditing(false); }
          }}
          maxLength={120}
          className="h-6 w-56 px-1 text-sm font-medium"
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setEditing(true)}
          className="h-6 truncate px-1 text-sm font-medium"
          title="Click to rename"
        >
          {name || "Untitled database"}
        </Button>
      )}
    </div>
  );
}
