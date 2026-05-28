/** Quick Capture slice (Phase 2 — capture loop foundation).
 *
 *  STATUS: branch (feat/phase2-quick-capture). Pure core + the
 *  orchestration runner + the React hook are complete + tested; the
 *  QuickCaptureDialog shell renders. The full feature is now a 2-line
 *  mount — see WIRING. NOT pushed to main (awaiting review).
 *
 *  WIRING (the only remaining step — mount + a trigger):
 *    function GlobalCapture() {
 *      const { open, setOpen, capture } = useQuickCapture(prefs);
 *      // bind a Cmd/Ctrl+Shift+N keydown → setOpen(true), and/or add a
 *      // command-palette entry that calls setOpen(true)
 *      return <QuickCaptureDialog open={open} onOpenChange={setOpen} onCapture={capture} />;
 *    }
 *  Mount <GlobalCapture/> once in the dashboard layout.
 *
 *  Later capture paths (web clipper / share-target / email-in) reuse
 *  parseCaptureInput + resolveCaptureTarget + runCapture — same core.
 *  Engine-independent: no formula-engine dependency. */

export type {
  CaptureDestination, CapturePrefs, CaptureInput, CaptureTarget,
} from "./types";
export {
  parseCaptureInput, resolveCaptureTarget, isEmptyCapture, captureTitleOrDefault,
} from "./lib/captureInput";
export { runCapture, type CaptureRunnerDeps } from "./lib/runCapture";
export { useQuickCapture } from "./hooks/useQuickCapture";
export { QuickCaptureDialog, type QuickCaptureDialogProps } from "./components/QuickCaptureDialog";
