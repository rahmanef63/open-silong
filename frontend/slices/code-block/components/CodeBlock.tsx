import { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";
import { Check, Copy, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { CODE_LANGUAGES, normalizeLang } from "../lib/languages";
import type { CodeBlockProps } from "../types";

export function CodeBlock({ text, lang, registerRef, onText, onLang, onKeyDown }: CodeBlockProps) {
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const editRef = useRef<HTMLPreElement | null>(null);
  const language = normalizeLang(lang);
  const langLabel = CODE_LANGUAGES.find((l) => l.value === language)?.label ?? lang ?? "Plain text";

  const highlighted = useMemo(() => {
    if (!text) return "";
    try {
      if (language === "plaintext" || !hljs.getLanguage(language)) {
        return escapeHtml(text);
      }
      return hljs.highlight(text, { language, ignoreIllegals: true }).value;
    } catch {
      return escapeHtml(text);
    }
  }, [text, language]);

  useEffect(() => {
    const el = editRef.current;
    if (focused && el && el.innerText !== text) el.innerText = text;
  }, [focused, text]);

  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 rounded-md bg-[#0d1117] border border-border overflow-hidden font-mono text-sm group/code relative">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-white/5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto gap-1 text-[11px] font-normal text-white/60 hover:text-white/90 rounded px-1.5 py-0.5 hover:bg-white/5 [&_svg]:size-3">
              {langLabel}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            {CODE_LANGUAGES.map((l) => (
              <DropdownMenuItem key={l.value} onClick={() => onLang(l.value)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          onClick={onCopy}
          className="opacity-0 group-hover/code:opacity-100 h-auto gap-1 rounded px-1.5 py-0.5 text-[11px] font-normal text-white/60 hover:text-white hover:bg-white/10 [&_svg]:size-3"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {focused ? (
        <pre
          ref={(el) => { editRef.current = el; registerRef(el); }}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onBlur={() => setFocused(false)}
          onInput={(e) => onText((e.currentTarget as HTMLElement).innerText)}
          onKeyDown={onKeyDown}
          className="hljs px-4 py-3 text-[13px] leading-6 outline-none whitespace-pre-wrap break-words text-white/90 min-h-[2.5em]"
        />
      ) : (
        <pre
          ref={registerRef as any}
          tabIndex={0}
          onFocus={() => setFocused(true)}
          onClick={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFocused(true); }
            else onKeyDown(e);
          }}
          className="hljs px-4 py-3 text-[13px] leading-6 outline-none whitespace-pre-wrap break-words cursor-text min-h-[2.5em]"
          dangerouslySetInnerHTML={{ __html: highlighted || `<span class="text-white/30">// language: ${langLabel}</span>` }}
        />
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
