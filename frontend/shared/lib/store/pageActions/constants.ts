export const uid = () => Math.random().toString(36).slice(2, 10);

export interface StructuralAction {
  label: string;
  undo: () => void;
  redo: () => void;
}
