/** Quick Capture slice (Phase 2 — capture loop foundation).
 *
 *  STATUS: branch scaffold (feat/phase2-quick-capture). Pure parse +
 *  target-resolution logic is complete + tested; the QuickCaptureDialog
 *  shell renders. NOT yet wired into the app — see WIRING below.
 *
 *  WIRING (consumer's remaining work, ~1 screen):
 *   1. Mount <QuickCaptureDialog open onOpenChange onCapture> somewhere
 *      global (dashboard layout).
 *   2. onCapture(input): call the create-page mutation with
 *      resolveCaptureTarget(prefs).parentId as parent, input.title as
 *      title, markdownToBlocks(input.body) as blocks; then navigate to
 *      the new page (or toast "captured").
 *   3. Open trigger: add a command-palette entry ("Quick capture") +
 *      a global Cmd/Ctrl+Shift+N keybinding that flips `open`.
 *   4. (later) the web clipper / share-target / email-in capture paths
 *      reuse parseCaptureInput + resolveCaptureTarget — same core.
 *
 *  Engine-independent: no formula-engine dependency. */

export type {
  CaptureDestination, CapturePrefs, CaptureInput, CaptureTarget,
} from "./types";
export {
  parseCaptureInput, resolveCaptureTarget, isEmptyCapture, captureTitleOrDefault,
} from "./lib/captureInput";
export { QuickCaptureDialog, type QuickCaptureDialogProps } from "./components/QuickCaptureDialog";
