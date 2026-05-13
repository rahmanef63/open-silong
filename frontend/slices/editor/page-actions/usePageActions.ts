import { useEffect } from "react";
import { useNavigate } from "@/shared/lib/router";
import { useStore } from "@/shared/lib/store";
import type { Page, PageFont } from "@/shared/types/domain";
import { toast } from "sonner";
import {
  pageToMarkdown, pageToPlainText, markdownToBlocks,
  downloadFile, pickFile,
} from "@/shared/lib/markdown";
import { useWorkspaceIO } from "@/shared/providers";

export function usePageActions(page: Page, close: () => void) {
  const { updatePage, duplicatePage, deletePage, addBlock } = useStore();
  const navigate = useNavigate();
  const workspaceIO = useWorkspaceIO();

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

  const copyContents = async () => {
    try {
      await navigator.clipboard.writeText(pageToPlainText(page));
      toast.success("Page contents copied");
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

  const onExportMd = () => {
    const md = pageToMarkdown(page);
    const safeTitle = (page.title || "untitled").replace(/[^a-z0-9-_ ]/gi, "_").trim() || "untitled";
    downloadFile(`${safeTitle}.md`, md);
    toast.success("Exported as markdown");
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
    stub,
  };
}
