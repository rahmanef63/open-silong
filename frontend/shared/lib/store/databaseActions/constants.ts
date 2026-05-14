export { uid } from "../../uid";

const SELECT_COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
export const pickColor = (i: number) => SELECT_COLORS[i % SELECT_COLORS.length];

export interface StructuralAction {
  label: string;
  undo: () => void;
  redo: () => void;
}
