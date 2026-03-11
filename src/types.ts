export type CompareMode =
  | { kind: "uncommitted" }
  | { kind: "staged" }
  | { kind: "base"; base: string }
  | { kind: "commit"; commit: string }
  | { kind: "range"; range: string };

export type ChangedFile = {
  status: string;
  path: string;
  previousPath?: string;
  existsInWorktree: boolean;
};

export type FileRange = {
  start_line: number;
  end_line: number;
  description: string;
};

export type FileSelection =
  | {
      path: string;
      rationale: string;
      include_mode: "full";
      ranges?: never;
    }
  | {
      path: string;
      rationale: string;
      include_mode: "slice";
      ranges: FileRange[];
    };

export type BuilderResponse = {
  summary: string;
  comparison_scope: string;
  review_focus: string[];
  notes_for_final_reviewer: string[];
  warnings: string[];
  selected_files: Array<{
    path: string;
    rationale: string;
    include_mode: "full" | "slice";
    ranges: FileRange[];
  }>;
};

export type Options = {
  compare: string;
  output?: string;
};
