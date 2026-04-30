export interface EquationBlockProps {
  text: string;
  onText: (next: string) => void;
  registerRef: (el: HTMLElement | null) => void;
}
