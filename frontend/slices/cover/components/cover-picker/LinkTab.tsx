"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { CoverData } from "@/shared/types/domain";

interface Props {
  onPick: (cover: CoverData) => void;
}

const URL_RX = /^https?:\/\/[^\s]+/i;

export function LinkTab({ onPick }: Props) {
  const [url, setUrl] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function submit() {
    const v = url.trim();
    if (!URL_RX.test(v)) {
      toast.error("Paste a full https:// URL");
      return;
    }
    // Best-effort probe — Image() respects CORS for natural dimensions
    // even when the host blocks XHR. Failure here just falls back to
    // "set anyway" since broken URLs are recoverable from the editor.
    setVerifying(true);
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = v;
    });
    setVerifying(false);
    onPick({ type: "link", value: v, positionY: 50 });
  }

  return (
    <div className="space-y-4 p-2">
      <p className="text-xs text-muted-foreground">
        Paste a direct image URL (jpg / png / webp / gif).
      </p>
      <Input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="https://images.example.com/cover.jpg"
        className="text-xs font-mono"
      />
      <div className="flex justify-end">
        <Button onClick={submit} disabled={!url.trim() || verifying}>
          {verifying ? "Checking…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
