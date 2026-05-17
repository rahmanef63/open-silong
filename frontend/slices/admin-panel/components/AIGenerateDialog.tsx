"use client";

import { useState } from "react";
import { Sparkles, Copy, ExternalLink, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { AI_PROVIDERS, buildAiPrompt, extractJson } from "../lib/aiTemplatePrompt";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the JSON string the user pastes back. The parent
   *  decides what to do with it (typically: stuff into the JSON
   *  textarea + auto-derive name/icon/category from the parsed obj). */
  onAccept: (json: string) => void;
}

const SAMPLE_INTENTS = [
  "A book club: members, books, and meetings; meetings have an attendees relation to members.",
  "A simple bug tracker w/ severity, status board, calendar of fix ETAs, and a dashboard of bugs by component.",
  "Personal finance: income vs expenses, budget by category, monthly KPIs.",
  "Vacation planner w/ destinations, daily itinerary calendar, and packing checklist.",
];

export function AIGenerateDialog({ open, onOpenChange, onAccept }: Props) {
  const [intent, setIntent] = useState("");
  const [pasted, setPasted] = useState("");

  const prompt = buildAiPrompt(intent);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied to clipboard");
    } catch {
      toast.error("Couldn't copy — select the prompt and copy manually");
    }
  }

  function openAi(url: string) {
    void copyPrompt();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function accept() {
    const json = extractJson(pasted);
    try {
      JSON.parse(json);
    } catch (e) {
      toast.error("Pasted text isn't valid JSON: " + (e as Error).message);
      return;
    }
    onAccept(json);
    onOpenChange(false);
    setPasted("");
    setIntent("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            Generate template with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want. Pick a top-tier AI to generate the JSON.
            Paste the result back below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1 — describe intent */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground">
              1. What template do you want?
            </Label>
            <Textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. A CRM for podcast guests w/ outreach pipeline + episode calendar."
              className="mt-1 h-24 resize-y"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SAMPLE_INTENTS.map((s, i) => (
                <Button
                  key={i}
                  type="button"
                  variant="outline"
                  onClick={() => setIntent(s)}
                  className="h-auto rounded-full bg-card px-2.5 py-0.5 text-[11px] font-normal text-muted-foreground"
                >
                  {s.slice(0, 60)}{s.length > 60 ? "…" : ""}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 2 — pick AI */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground">
              2. Send to your favorite AI
            </Label>
            <p className="mt-1 mb-2 text-xs text-muted-foreground">
              Clicking an AI button copies the full prompt to your clipboard and opens its web UI in a new tab. Paste, run, then copy the JSON it returns.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AI_PROVIDERS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant="outline"
                  onClick={() => openAi(p.url)}
                  className="group flex h-auto flex-col items-start gap-1 rounded-lg bg-card px-3 py-2 text-left font-normal [&_svg]:size-3"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base">{p.emoji} {p.label}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{p.hint}</span>
                </Button>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={copyPrompt}>
                <Copy className="mr-1.5 h-3 w-3" />
                Copy prompt only
              </Button>
            </div>
          </div>

          {/* Step 3 — paste result */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground">
              3. Paste the JSON
            </Label>
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder='{"version": 1, "name": "...", ...}'
              className="mt-1 h-40 resize-y font-mono text-xs"
              spellCheck={false}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Code fences, preamble, trailing prose — all stripped automatically.
              Validation runs when you click Apply.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={accept} disabled={!pasted.trim()}>
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
            Apply to editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
