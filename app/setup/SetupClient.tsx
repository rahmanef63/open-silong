"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Circle, Crown, LogIn, Rocket, UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAdminRole } from "@/slices/admin-panel";

/** First-run onboarding wizard — same flow as the rest of the template
 *  fleet: the first visitor creates an account, claims ownership
 *  (superadmin), and lands in the workspace. Once a superadmin exists
 *  the wizard collapses into a plain sign-in pointer. */
export function SetupClient() {
  const router = useRouter();
  const { signedIn, loading, isSuperAdmin, claimableSuperAdmin, claim } = useAdminRole();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step1Done = signedIn;
  const step2Done = isSuperAdmin;
  const claimedByOther = signedIn && !isSuperAdmin && !claimableSuperAdmin;

  const onClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      await claim();
      router.push("/dashboard/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Klaim gagal — coba lagi.");
      setClaiming(false);
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border bg-muted/30" />;
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-4">
        <li className="flex items-start gap-3">
          {step1Done
            ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
            : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
          <div className="space-y-1">
            <p className="font-medium">1. Buat akun</p>
            <p className="text-sm text-muted-foreground">
              Daftar dengan email + password (atau Google bila dikonfigurasi).
            </p>
            {!step1Done && (
              <Button asChild size="sm" className="mt-1 gap-2">
                <Link href="/auth"><UserPlus className="size-4" /> Daftar / Masuk</Link>
              </Button>
            )}
          </div>
        </li>
        <li className="flex items-start gap-3">
          {step2Done
            ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
            : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
          <div className="space-y-1">
            <p className="font-medium">2. Klaim jadi pemilik</p>
            <p className="text-sm text-muted-foreground">
              Pengunjung pertama jadi superadmin — kontrol penuh workspace ini.
            </p>
            {signedIn && claimableSuperAdmin && (
              <Button size="sm" onClick={onClaim} disabled={claiming} className="mt-1 gap-2">
                <Crown className="size-4" />
                {claiming ? "Mengklaim…" : "Klaim sekarang"}
              </Button>
            )}
            {claimedByOther && (
              <p className="text-sm text-amber-600">
                Workspace ini sudah ada pemiliknya — minta akses dari superadmin.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </li>
        <li className="flex items-start gap-3">
          {step2Done
            ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
            : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
          <div className="space-y-1">
            <p className="font-medium">3. Masuk workspace</p>
            <p className="text-sm text-muted-foreground">
              Block editor, database, sharing — semua siap dipakai.
            </p>
          </div>
        </li>
      </ol>
      <div className="flex gap-2 border-t pt-4">
        <Button asChild variant={step2Done ? "default" : "outline"} className="gap-2">
          <Link href="/dashboard"><Rocket className="size-4" /> Buka workspace</Link>
        </Button>
        {!signedIn && (
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/auth"><LogIn className="size-4" /> Sudah punya akun</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
