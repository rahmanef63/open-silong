import type { BlockRendererProps } from "@/shared/types";

export type SimpleTableBlockProps = Pick<BlockRendererProps, "block" | "onUpdate" | "onReplace">;
