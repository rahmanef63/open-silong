"use client";

import * as React from "react";
import { useEditorAdapter } from "@/slices/editor/lib/useEditorAdapter";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { walkBack } from "./mention-typeahead/dom";
import { insertMention, type State, type MentionItem } from "./mention-typeahead/insert";

const MAX_RESULTS = 8;
// `@` opens the picker at start-of-block, after whitespace, OR right after a
// preceding mention chip's `)` — so a second mention typed flush against the
// first chip still triggers.
const TRIGGER_RE = /(?:^|\s|\))@([\w-]{0,40})$/;

/** Inline `@` mention typeahead. Scans backward from the caret on every
 *  input; when it finds `[start-of-string|whitespace]@<word>`, opens a
 *  popover of matching pages. Selection inserts a markdown link
 *  `[icon Page Title](/dashboard/p/<id>)` so the share view renders it
 *  via `inlineMd`. */
export function MentionTypeahead() {
  const { pages, databases } = useEditorAdapter();
  const [state, setState] = React.useState<State | null>(null);
  const [active, setActive] = React.useState(0);

  const matches = React.useMemo<MentionItem[]>(() => {
    if (!state) return [];
    const q = state.query.toLowerCase();
    const candidates: MentionItem[] = [
      ...pages
        .filter((p) => !p.trashed && !p.rowOfDatabaseId)
        .map((p) => ({ id: p.id, title: p.title || "Untitled", icon: p.icon, kind: "page" as const })),
      ...databases
        .filter((d) => !d.trashed)
        .map((d) => ({ id: d.id, title: d.name || "Untitled", icon: d.icon, kind: "db" as const })),
    ];
    if (!q) return candidates.slice(0, MAX_RESULTS);
    return candidates.filter((c) => c.title.toLowerCase().includes(q)).slice(0, MAX_RESULTS);
  }, [pages, databases, state]);

  React.useEffect(() => setActive(0), [state?.query]);

  React.useEffect(() => {
    function onInput(e: Event) {
      const target = e.target as HTMLElement | null;
      if (!target || !target.isContentEditable) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const caret = sel.getRangeAt(0);
      if (!caret.collapsed) return;
      const probe = document.createRange();
      probe.selectNodeContents(target);
      probe.setEnd(caret.endContainer, caret.endOffset);
      const before = probe.toString();
      const m = TRIGGER_RE.exec(before);
      if (!m) {
        setState((s) => (s ? null : s));
        return;
      }
      const query = m[1];
      const start = walkBack(target, caret.endContainer, caret.endOffset, query.length + 1);
      if (!start) return;
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(caret.endContainer, caret.endOffset);
      const rect = range.getBoundingClientRect();
      setState({
        ce: target,
        range,
        query,
        pos: { x: rect.left, y: rect.bottom + 4 },
      });
    }
    function onSelChange() {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed) {
        setState((s) => (s ? null : s));
      }
    }
    document.addEventListener("input", onInput, true);
    document.addEventListener("selectionchange", onSelChange);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("selectionchange", onSelChange);
    };
  }, []);

  React.useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (!state) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, matches.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (matches.length === 0) return;
        e.preventDefault();
        insertMention(state, matches[active]);
        setState(null);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setState(null);
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [state, matches, active]);

  if (!state || matches.length === 0) return null;

  return (
    <div
      role="listbox"
      style={{
        position: "fixed",
        left: state.pos.x,
        top: state.pos.y,
        zIndex: 50,
      }}
      className="w-64 overflow-hidden rounded-md border border-border bg-popover/95 shadow-soft backdrop-blur"
      onMouseDown={(e) => e.preventDefault()}
    >
      {matches.map((c, i) => (
        // shadcn Button skipped: role="option" listbox semantics — shadcn Button erases role context
        <button
          key={`${c.kind}:${c.id}`}
          type="button"
          role="option"
          aria-selected={i === active}
          onClick={() => { insertMention(state, c); setState(null); }}
          onMouseEnter={() => setActive(i)}
          className={cn(
            "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs",
            i === active ? "bg-accent" : "hover:bg-accent",
          )}
        >
          <DynamicIcon value={c.icon} className="text-sm" />
          <span className="flex-1 truncate">{c.title || "Untitled"}</span>
          {c.kind === "db" && (
            <span className="shrink-0 rounded bg-muted px-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/70">
              DB
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
