import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
    return <DefaultFallback error={this.state.error} reset={this.reset} />;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">{error.message || "Unknown error"}</p>
        <div className="flex justify-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-sm hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
