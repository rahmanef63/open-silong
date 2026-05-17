import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface Props {
  onSubmit: (text: string) => void;
  placeholder?: string;
}

export function CommentComposer({ onSubmit, placeholder = "Write a comment…" }: Props) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="flex items-end gap-1 rounded-md border border-border bg-background p-1.5"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={1}
        className="flex-1 bg-transparent text-xs outline-none resize-none max-h-24"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
        }}
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={!text.trim()}
        aria-label="Send"
        className="h-auto w-auto p-1 text-muted-foreground disabled:opacity-40 [&_svg]:size-3.5"
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
