"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function AuthForm() {
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
      await signIn("password", {
        email,
        password,
        flow,
        ...(flow === "signUp" && name ? { name } : {}),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="text-center space-y-2">
        <Image
          src="/logo-wordmark-light.svg"
          alt="Nosion"
          width={140}
          height={40}
          className="mx-auto h-10 w-auto dark:hidden"
          priority
        />
        <Image
          src="/logo-wordmark-dark.svg"
          alt="Nosion"
          width={140}
          height={40}
          className="mx-auto hidden h-10 w-auto dark:block"
          priority
        />
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
          onClick={() => {
            setFlow(flow === "signIn" ? "signUp" : "signIn");
            setError("");
          }}
        >
          {flow === "signIn" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </>
  );
}
