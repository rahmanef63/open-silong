import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "./AuthForm";
import { AuthClient } from "./AuthClient";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a Nosion workspace",
  robots: { index: false, follow: false },
};

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 border rounded-xl shadow-sm">
        <Suspense fallback={<AuthForm />}>
          <AuthClient>
            <AuthForm />
          </AuthClient>
        </Suspense>
      </div>
    </div>
  );
}
