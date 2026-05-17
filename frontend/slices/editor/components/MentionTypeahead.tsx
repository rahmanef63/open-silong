"use client";

import * as React from "react";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { walkBack } from "./mention-typeahead/dom";
import { insertMention, type State } from "./mention-typeahead/insert";

const MAX_RESULTS = 6;
const TRIGGER_RE = /(?:^|\s)@([\w-]{0,40})$/;

/** Inline `@` mention typeahead. Scans backward from the caret on every
 *  input; when it finds `[start-of-string|whitespace]@<word>`, opens a
 *  popover of matching pages. Selection inserts a markdown link
 *  `[icon Page Title](/dashboard/p/<id>)` so the share view renders it
 *  via `inlineMd`. */
export function MentionTypeahead() {
  const { pages } = useStore();
  const [state, setState] = React.useState<State | null>(null);
  const [active, setActive] = React.useState(0);

  const matches = React.useMemo(() => {
    if (!state) return [];
    const q = state.query.toLowerCase();
    const live = pages.filter((p) => !p.trashed && !p.rowOfDatabaseId);
    if (!q) return live.slice(0, MAX_RESULTS);
    return live
      .filter((p) => (p.title || "Untitled").toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [pages, state]);

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
      {matches.map((p, i) => (
        // shadcn Button skipped: role="option" listbox semantics
        <button
          key={p.id}
          type="button"
          role="option"
          aria-selected={i === active}
          onClick={() => { insertMention(state, p); setState(null); }}
          onMouseEnter={() => setActive(i)}
          className={cn(
            "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs",
            i === active ? "bg-accent" : "hover:bg-accent",
          )}
        >
          <DynamicIcon value={p.icon} className="text-sm" />
          <span className="flex-1 truncate">{p.title || "Untitled"}</span>
        </button>
      ))}
    </div>
  );
}
