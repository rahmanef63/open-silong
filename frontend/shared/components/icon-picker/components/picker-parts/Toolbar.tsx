import { Smile, Shapes, Trash2, Shuffle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function PickerToolbar({
  iconStyle, onToggleStyle, onRandom, onClear,
}: {
  iconStyle: "twemoji" | "native";
  onToggleStyle: () => void;
  onRandom: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <TabsList className="h-8">
        <TabsTrigger value="emoji" className="h-7 text-xs gap-1">
          <Smile className="h-3.5 w-3.5" /> Emoji
        </TabsTrigger>
        <TabsTrigger value="lucide" className="h-7 text-xs gap-1">
          <Shapes className="h-3.5 w-3.5" /> Icons
        </TabsTrigger>
      </TabsList>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onToggleStyle}
          title={iconStyle === "twemoji" ? "Switch to native emoji" : "Switch to Twemoji (Notion-style)"}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="ml-1 hidden sm:inline">{iconStyle === "twemoji" ? "Twemoji" : "Native"}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onRandom}
          title="Random"
        >
          <Shuffle className="h-3.5 w-3.5" />
        </Button>
        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onClear}
            title="Remove icon"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
