import { renderInline } from "@/shared/lib/inlineMd";

export function renderInlineOrPlaceholder(text: string | undefined): React.ReactNode {
  if (!text || !text.trim()) {
    return <span className="text-muted-foreground/40 italic">(empty)</span>;
  }
  return renderInline(text);
}
