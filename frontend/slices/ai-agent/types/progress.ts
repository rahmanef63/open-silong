/** Progress timeline returned by the chat action. Each step records
 *  one event in the agent's run: resolving the model, calling a tool,
 *  finalizing. Tool steps carry the skillId so the UI can label them. */

export type ProgressStepKind = "resolve" | "tool" | "finalize";

export interface ProgressStep {
  kind: ProgressStepKind;
  label: string;
  skillId?: string;
  ms?: number;
  ok?: boolean;
}

export interface CompleteResult {
  text: string;
  usage: { input_tokens: number; output_tokens: number } | null;
  model: string;
  source: string;
  progress?: ProgressStep[];
}
