"use client";

import { useState } from "react";
import { CommandPalette as CommandPaletteCore } from "../components/CommandPalette";
import { useNosionCommandGroups } from "./nosion";

export function NosionCommandPalette() {
  const [query, setQuery] = useState("");
  const { groups, onHistorySelect } = useNosionCommandGroups(query);
  return (
    <CommandPaletteCore
      groups={groups}
      query={query}
      onQueryChange={setQuery}
      onHistorySelect={onHistorySelect}
    />
  );
}
