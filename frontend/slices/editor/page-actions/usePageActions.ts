import { useEffect } from "react";
import { useNavigate } from "@/shared/lib/router";
import { useStore } from "@/shared/lib/store";
import type { Page, PageFont } from "@/shared/types/domain";
import { toast } from "sonner";
import {
  pageToMarkdown, pageToPlainText, markdownToBlocks,
  downloadFile, pickFile,
} from "@/shared/lib/markdown";
import { pageToHtml, pageToHtmlFragment } from "@/shared/lib/html";
import { buildExportContext } from "@/shared/lib/exportContext";
import { useWorkspaceIO } from "@/slices/workspace-io";

export function usePageActions(page: Page, close: () => void) {
  const { updatePage, duplicatePage, deletePage, addBlock, pages, databases } = useStore();
  const navigate = useNavigate();
  const workspaceIO = useWorkspaceIO();
  const exportCtx = buildExportContext(databases, pages);

  const setFont = (font: PageFont) => updatePage(page.id, { font });
  const toggleSmall = () => updatePage(page.id, { smallText: !page.smallText });
  const toggleFull = () => updatePage(page.id, { fullWidth: !page.fullWidth });
  const toggleLock = () => {
    updatePage(page.id, { locked: !page.locked });
    toast.success(page.locked ? "Page unlocked" : "Page locked");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
    close();
  };

  /** Multi-format clipboard. Writes text/plain + text/html via
   *  ClipboardItem so paste targets pick the richest representation
   *  they support — Notion picks text/html (preserves headings, lists,
   *  links), terminal-class targets fall through to text/plain. Old
   *  browsers without ClipboardItem get plain text only. */
  const copyContents = async () => {
    const plain = pageToPlainText(page);
    const html = pageToHtmlFragment(page, exportCtx);
    try {
      if (typeof window !== "undefined" && "ClipboardItem" in window) {
        const item = new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      toast.success("Page contents copied (plain + HTML for Notion paste)");
    } catch {
      toast.error("Failed to copy contents");
    }
    close();
  };

  const onDuplicate = async () => {
    close();
    const c = await duplicatePage(page.id);
    if (c) navigate(`/p/${c.id}`);
  };

  const onTrash = () => {
    close();
    deletePage(page.id);
    navigate("/");
    toast.success("Moved to trash");
  };

  const safeTitle = (page.title || "untitled").replace(/[^a-z0-9-_ ]/gi, "_").trim() || "untitled";

  const onExportMd = () => {
    downloadFile(`${safeTitle}.md`, pageToMarkdown(page, exportCtx));
    toast.success("Exported as Markdown");
    close();
  };

  const onExportHtml = () => {
    downloadFile(`${safeTitle}.html`, pageToHtml(page, true, exportCtx), "text/html");
    toast.success("Exported as HTML");
    close();
  };

  const onExportTxt = () => {
    downloadFile(`${safeTitle}.txt`, pageToPlainText(page), "text/plain");
    toast.success("Exported as plain text");
    close();
  };

  const onImportMd = async () => {
    close();
    const file = await pickFile(".md,.markdown,text/markdown,text/plain");
    if (!file) return;
    const text = await file.text();
    const blocks = markdownToBlocks(text);
    for (const b of blocks) {
      await addBlock(page.id, page.blocks.length, b.type, {
        text: b.text,
        checked: b.checked,
        lang: b.lang,
      });
    }
    toast.success(`Imported ${blocks.length} blocks`);
  };

  const onExportJson = () => { close(); workspaceIO.open({ tab: "export", preselectPageId: page.id }); };
  const onImportJson = () => { close(); workspaceIO.open({ tab: "import-json", zipParentId: page.id }); };
  const onImportZip = () => { close(); workspaceIO.open({ tab: "import-zip", zipParentId: page.id }); };

  /** Browser-native PDF export — print stylesheet hides chrome (sidebar/
   *  header), leaving a clean reading layout. User picks "Save as PDF"
   *  from the system print dialog. Zero dep, works in every browser. */
  const onExportPdf = () => {
    close();
    setTimeout(() => window.print(), 50);
  };

  const stub = (label: string) => () => {
    toast.info(`${label} — coming soon`);
    close();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        copyLink();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  return {
    setFont, toggleSmall, toggleFull, toggleLock,
    copyLink, copyContents, onDuplicate, onTrash,
    onExportMd, onImportMd, onExportJson, onImportJson, onImportZip,
    onExportPdf, onExportHtml, onExportTxt,
    stub,
  };
}
