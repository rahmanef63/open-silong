export type RowSelectionState = {
  ids: Set<string>;
  anchor: string | null;
};

export type RowSelectionApi = {
  state: RowSelectionState;
  isSelected: (id: string) => boolean;
  selectOne: (id: string) => void;
  toggle: (id: string) => void;
  setIds: (ids: string[]) => void;
  clear: () => void;
  count: number;
};
