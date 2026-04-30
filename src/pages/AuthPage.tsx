import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow, name: flow === "signUp" ? name : undefined });
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 border rounded-xl shadow-sm">
        <div className="text-center space-y-1">
          <div className="text-3xl">📝</div>
          <h1 className="text-xl font-semibold">Notiony</h1>
          <p className="text-sm text-muted-foreground">
            {flow === "signIn" ? "Sign in to your workspace" : "Create your workspace"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {flow === "signUp" && (
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : flow === "signIn" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {flow === "signIn" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="underline text-foreground"
            onClick={() => { setFlow(flow === "signIn" ? "signUp" : "signIn"); setError(""); }}
          >
            {flow === "signIn" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
