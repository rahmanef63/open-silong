export { uid } from "../../uid";

export interface StructuralAction {
  label: string;
  undo: () => void;
  redo: () => void;
}
