"use client";

/** Bottom "Add a memory" input. Collapsed = a rounded pill; on focus (or once
 *  it has text) it expands into a box with a helper line. Submitting hands the
 *  trimmed text to `onSubmit` — the host turns it into a page.
 *  ponytail: this just creates a page titled with the text — no LLM/AI memory
 *  extraction. The "memory/chat" framing is purely visual. Add extraction later.
 */

import { useRef, useState } from "react";
import { ArrowUp, Plus, Paperclip } from "lucide-react";
import { MEM } from "../lib/memoryTheme";

export function MemoryChatInput({ onSubmit }: { onSubmit?: (text: string) => void }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const expanded = focused || value.trim().length > 0;

  const submit = () => {
    const t = value.trim();
    if (!t) return;
    onSubmit?.(t);
    setValue("");
    ref.current?.focus();
  };

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-xl px-4">
      <div
        className="rounded-2xl border shadow-lg backdrop-blur"
        style={{
          borderColor: MEM.chipBorder,
          background: "rgba(20,20,22,0.85)",
        }}
      >
        <div className={expanded ? "flex flex-col gap-2 p-3" : "flex items-center gap-2 px-3 py-2"}>
          {!expanded && <Plus className="size-4 shrink-0" style={{ color: MEM.muted }} />}
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Add a memory"
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:opacity-60"
            style={{ color: MEM.text, minHeight: expanded ? 44 : 20, maxHeight: 160 }}
          />
          {expanded ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5" style={{ color: MEM.muted }}>
                <button type="button" className="rounded-md p-1 hover:bg-white/5" aria-label="Add">
                  <Plus className="size-4" />
                </button>
                <button type="button" className="rounded-md p-1 hover:bg-white/5" aria-label="Attach">
                  <Paperclip className="size-4" />
                </button>
              </div>
              <SendButton onClick={submit} disabled={!value.trim()} />
            </div>
          ) : (
            <SendButton onClick={submit} disabled={!value.trim()} />
          )}
        </div>
      </div>
      {expanded && (
        <p className="mt-1.5 text-center text-[11px]" style={{ color: MEM.muted }}>
          Memories are saved as pages in this workspace.
        </p>
      )}
    </div>
  );
}

function SendButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Add memory"
      className="flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
      style={{ background: MEM.accent, color: MEM.accentInk }}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
