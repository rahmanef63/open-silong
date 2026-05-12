export type WorkspaceIOTab = "export" | "import-json" | "import-zip";

export interface ZipSummary {
  pages: number;
  databases: number;
  files: number;
  skipped: number;
  errors: { path: string; reason: string }[];
  diagnostics?: {
    blobBytes: number;
    firstBytesHex: string;
    wasGzipWrapped: boolean;
    entryCount: number;
  };
}

export type DepthLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const DEPTH_OPTIONS: ReadonlyArray<{ value: DepthLevel; label: string; hint: string }> = [
  { value: 0, label: "None",     hint: "Just the selected pages" },
  { value: 1, label: "1 level",  hint: "Direct children" },
  { value: 2, label: "2 levels", hint: "Up to grandchildren" },
  { value: 3, label: "3 levels", hint: "Three levels deep" },
  { value: 4, label: "4 levels", hint: "Four levels deep" },
  { value: 5, label: "5 levels", hint: "Whole subtree (max)" },
];
