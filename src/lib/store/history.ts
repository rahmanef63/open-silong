import { useCallback, useEffect, useRef, useState } from "react";
import { isTextInputTarget } from "@/shared/lib/keyboard";

export interface StructuralAction {
  label: string;
  undo: () => void;
  redo: () => void;
}

export function useHistoryStack() {
  const undoStackRef = useRef<StructuralAction[]>([]);
  const redoStackRef = useRef<StructuralAction[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  const pushStructuralAction = useCallback((action: StructuralAction) => {
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > 80) undoStackRef.current.shift();
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  const undo = useCallback(() => {
    const action = undoStackRef.current.pop();
    if (!action) return;
    action.undo();
    redoStackRef.current.push(action);
    setHistoryVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    const action = redoStackRef.current.pop();
    if (!action) return;
    action.redo();
    undoStackRef.current.push(action);
    setHistoryVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (isTextInputTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const canUndo = historyVersion >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;

  return { pushStructuralAction, undo, redo, canUndo, canRedo };
}
