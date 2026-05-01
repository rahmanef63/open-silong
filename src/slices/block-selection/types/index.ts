export type SelectionState = {
  ids: Set<string>;
  anchor: string | null;
};

export type SelectionApi = {
  state: SelectionState;
  isSelected: (id: string) => boolean;
  selectOne: (id: string) => void;
  toggle: (id: string) => void;
  range: (id: string) => void;
  clear: () => void;
  count: number;
};
