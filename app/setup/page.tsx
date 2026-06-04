import type { Metadata } from "next";
import { SetupClient } from "./SetupClient";

export const metadata: Metadata = {
  title: "Setup — Silong",
  description: "First-run setup: create the owner account for this workspace.",
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <div className="space-y-2 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Setup workspace</h1>
          <p className="text-sm text-muted-foreground">
            Instance Silong baru. Tiga langkah dan workspace ini milikmu.
          </p>
        </div>
        <SetupClient />
      </div>
    </main>
  );
}
