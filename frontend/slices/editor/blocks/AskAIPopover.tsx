import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Sparkles, Wand2, FileText, ListChecks, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/shared/lib/store";
import type { Block } from "@/shared/types/domain";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { Button } from "@/shared/ui/button";

interface Props {
  pageId: string;
  block: Block;
  index: number;
  onClose: () => void;
}

interface AskCtx { pageText: string; blockText: string }

interface Preset {
  key: string;
  label: string;
  icon: typeof Sparkles;
  build: (ctx: AskCtx) => { system?: string; prompt: string };
}

const PRESETS: Preset[] = [
  {
    key: "summarise",
    label: "Summarise this page",
    icon: FileText,
    build: ({ pageText }) => ({
      system: "Summarise the page in 3-5 markdown bullets. Keep names verbatim.",
      prompt: pageText || "(empty page)",
    }),
  },
  {
    key: "explain",
    label: "Explain this block",
    icon: Wand2,
    build: ({ blockText }) => ({
      system: "Explain the user's text clearly and concisely. Reply in markdown.",
      prompt: blockText || "(empty block)",
    }),
  },
  {
    key: "continue",
    label: "Continue writing",
    icon: ArrowRight,
    build: ({ blockText, pageText }) => ({
      system: "Continue the user's writing in the same voice. Add 1-2 paragraphs of plain prose. No headings.",
      prompt: blockText || pageText || "(empty)",
    }),
  },
  {
    key: "brainstorm",
    label: "Brainstorm ideas",
    icon: ListChecks,
    build: ({ blockText, pageText }) => ({
      system: "Brainstorm 5-7 concrete ideas as a markdown bullet list.",
      prompt: blockText || pageText || "Open brainstorm",
    }),
  },
];

export function collectPageText(blocks: Block[]): string {
  const out: string[] = [];
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      if (b.text) out.push(b.text);
      if (b.children) walk(b.children);
      if (b.columns) for (const col of b.columns) walk(col);
    }
  };
  walk(blocks);
  return out.join("\n").slice(0, 8000);
}

export function AskAIPanel({ pageId, block, index, onClose }: Props) {
  const { getPage, addBlock } = useStore();
  const complete = useAction(api.ai.chat.complete);
  const ask = useAsyncError("AskAIPopover.run");
  const [draft, setDraft] = useState("");

  const run = async (preset?: Preset) => {
    if (ask.pending) return;
    const page = getPage(pageId);
    const ctx: AskCtx = {
      pageText: collectPageText(page?.blocks ?? []),
      blockText: block.text ?? "",
    };
    let built: { system?: string; prompt: string };
    if (preset) {
      built = preset.build(ctx);
    } else {
      const q = draft.trim();
      if (!q) return;
      built = {
        system: "Answer the user concisely. Use the page context if relevant. Reply in markdown.",
        prompt: ctx.pageText
          ? `Context:\n${ctx.pageText}\n\n---\nQuestion: ${q}`
          : q,
      };
    }
    const text = await ask.execute(async () => {
      const r = await complete({
        messages: [{ role: "user", content: built.prompt }],
        system: built.system,
      });
      return r.text;
    });
    if (typeof text !== "string") return;
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("AI returned empty reply");
      return;
    }
    await addBlock(pageId, index, "paragraph", { text: trimmed });
    toast.success("AI reply added below");
    setDraft("");
    onClose();
  };

  return (
    <div className="w-80">
      <div className="flex items-center gap-2 px-2 pt-1">
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void run(); }
            if (e.key === "Escape") { e.preventDefault(); onClose(); }
            e.stopPropagation();
          }}
          placeholder="Ask AI…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          disabled={ask.pending}
        />
        {ask.pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div className="mt-2 border-t border-border pt-1">
        <div className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Quick actions
        </div>
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            type="button"
            variant="ghost"
            size="sm"
            disabled={ask.pending}
            onClick={() => void run(p)}
            className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left text-sm font-normal"
          >
            <p.icon className="h-3.5 w-3.5 text-muted-foreground" /> {p.label}
          </Button>
        ))}
      </div>
      {ask.error && (
        <div className="mt-1 px-2 py-1 text-xs text-destructive">{ask.error.message}</div>
      )}
    </div>
  );
}
