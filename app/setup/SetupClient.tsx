"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Circle, Crown, Database, LogIn, Rocket, UserPlus } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { useAdminRole } from "@/slices/admin-panel";

/** First-run onboarding wizard — same flow as the rest of the template
 *  fleet: the first visitor creates an account, claims ownership
 *  (superadmin), seeds the demo data, and lands in the workspace. Once a
 *  superadmin exists the wizard collapses into a plain sign-in pointer. */
export function SetupClient() {
  const router = useRouter();
  const { signedIn, loading, isSuperAdmin, claimableSuperAdmin, claim } = useAdminRole();
  const setupStatus = useQuery(api.setup.status);
  const seedAll = useMutation(api.setup.seedAll);
  const [claiming, setClaiming] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedNote, setSeedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step1Done = signedIn;
  const step2Done = isSuperAdmin;
  const step3Done = !!setupStatus?.seeded;
  const claimedByOther = signedIn && !isSuperAdmin && !claimableSuperAdmin;

  const onClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      await claim();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Klaim gagal — coba lagi.");
    } finally {
      setClaiming(false);
    }
  };

  const onSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const res = await seedAll({});
      setSeedNote(
        res.alreadySeeded
          ? `Galeri template di-sync ulang (${res.gallery.updated} template).`
          : `${res.gallery.inserted} template + workspace contoh (${res.showcase?.insertedPages ?? 0} halaman, ${res.showcase?.insertedDatabases ?? 0} database) terpasang.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed gagal — coba lagi.");
    } finally {
      setSeeding(false);
    }
  };

  if (loading || setupStatus === undefined) {
    return <div className="h-40 animate-pulse rounded-xl border bg-muted/30" />;
  }

  return (
    <div className="space-y-6">
      {setupStatus?.authReady === false && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">Kunci login belum terpasang</p>
          <p className="mt-1 text-muted-foreground">
            Deploy key kamu tidak punya izin menulis env Convex
            (<code>WriteEnvironmentVariables</code>) — pendaftaran akan gagal
            sampai ini dibereskan:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              <a className="underline" href="https://dashboard.convex.dev" target="_blank" rel="noreferrer">dashboard.convex.dev</a>{" "}
              → project kamu → <b>Production</b> → Settings → Deploy Keys →
              generate key dengan capability <b>deploy + env:view + env:write</b>{" "}
              (atau full access), pakai akun admin team.
            </li>
            <li>Vercel → Settings → Environment Variables → ganti <b>CONVEX_DEPLOY_KEY</b>.</li>
            <li><b>Redeploy</b> — kunci login dibuat otomatis saat build.</li>
          </ol>
        </div>
      )}
      <ol className="space-y-4">
        <Step done={step1Done} title="1. Buat akun">
          <p className="text-sm text-muted-foreground">
            Daftar dengan email + password (atau Google bila dikonfigurasi).
          </p>
          {!step1Done && (
            <Button asChild size="sm" className="mt-1 gap-2">
              <Link href="/auth"><UserPlus className="size-4" /> Daftar / Masuk</Link>
            </Button>
          )}
        </Step>

        <Step done={step2Done} title="2. Klaim jadi pemilik">
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
        </Step>

        <Step done={step3Done} title="3. Isi data contoh">
          <p className="text-sm text-muted-foreground">
            Galeri 26+ template (CRM, sprint, budget, …) + workspace contoh
            lengkap — halaman, database, semua tipe view. Sekali klik.
          </p>
          {step2Done && !step3Done && (
            <Button size="sm" onClick={onSeed} disabled={seeding} className="mt-1 gap-2">
              <Database className="size-4" />
              {seeding ? "Mengisi data…" : "Isi data contoh"}
            </Button>
          )}
          {!step2Done && !step3Done && (
            <p className="text-xs text-muted-foreground">
              Klaim kepemilikan dulu — hanya pemilik/admin yang bisa seed.
            </p>
          )}
          {seedNote && <p className="text-sm text-green-600">{seedNote}</p>}
        </Step>

        <Step done={step2Done && step3Done} title="4. Masuk workspace">
          <p className="text-sm text-muted-foreground">
            Block editor, database, sharing — semua siap dipakai.
          </p>
        </Step>
      </ol>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 border-t pt-4">
        <Button
          variant={step2Done ? "default" : "outline"}
          className="gap-2"
          onClick={() => router.push(step2Done ? "/dashboard/admin" : "/dashboard")}
        >
          <Rocket className="size-4" /> Buka workspace
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

function Step({ done, title, children }: { done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      {done
        ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
        : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}
