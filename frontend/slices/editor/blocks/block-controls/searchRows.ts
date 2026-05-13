import type { ComponentType } from "react";
import type { BlockType } from "@/shared/types/domain";
import { BLOCK_SPECS } from "../../blockSpecs";

export const TURN_INTO_SPECS = BLOCK_SPECS.filter((s) => s.type !== "database");

export interface ActionRow {
  key: string;
  label: string;
  keywords: string[];
  icon: ComponentType<{ className?: string }>;
  run: () => void | Promise<void>;
}

interface BuildDeps {
  pageId: string;
  index: number;
  addBlock: (pageId: string, after: number, type: BlockType) => Promise<string | undefined>;
  convertTo: (t: BlockType) => void;
}

export function buildActionRows({ pageId, index, addBlock, convertTo }: BuildDeps): ActionRow[] {
  const insertItems: ActionRow[] = BLOCK_SPECS.map((s) => ({
    key: `insert:${s.type}`,
    label: `Add ${s.label.toLowerCase()} below`,
    keywords: ["add", "new", "block", "insert", s.label.toLowerCase(), ...s.keywords],
    icon: s.icon,
    run: async () => {
      const id = await addBlock(pageId, index, s.type);
      if (id) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
    },
  }));
  const turnItems: ActionRow[] = TURN_INTO_SPECS.map((s) => ({
    key: `turn:${s.type}`,
    label: `Turn into ${s.label}`,
    keywords: ["turn", "into", "convert", "transform", s.label.toLowerCase(), ...s.keywords],
    icon: s.icon,
    run: () => convertTo(s.type),
  }));
  return [...insertItems, ...turnItems];
}

export function filterActionRows(rows: ActionRow[], q: string): ActionRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return rows
    .filter((r) => r.label.toLowerCase().includes(needle) || r.keywords.some((kw) => kw.includes(needle)))
    .slice(0, 60);
}
