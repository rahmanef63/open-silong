import { Button } from "@/shared/ui/button";

export function Btn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
    >
      {children}
    </Button>
  );
}
