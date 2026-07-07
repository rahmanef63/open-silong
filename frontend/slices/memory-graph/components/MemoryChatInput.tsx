"use client";

/** Bottom "Add a memory" input. Submitting hands the trimmed text to `onSubmit`
 *  — the host decides what to do with it. Theme-token styled (shadcn Textarea +
 *  Button), copy is prop-driven.
 */

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

export function MemoryChatInput({
  onSubmit,
  placeholder = "Add a memory",
  helper = "Memories are saved as pages in this workspace.",
}: {
  onSubmit?: (text: string) => void;
  placeholder?: string;
  helper?: string;
}) {
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
      <div className="rounded-2xl border border-border bg-popover/90 shadow-lg backdrop-blur">
        <div className="flex items-end gap-2 p-2">
          <Textarea
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
            placeholder={placeholder}
            className="min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
            style={{ maxHeight: 160 }}
          />
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Add memory"
            className="shrink-0 rounded-full"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
      {expanded && <p className="mt-1.5 text-center text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
