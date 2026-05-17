import { Database, DatabaseViewConfig } from "@/shared/types/domain";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { Sliders } from "lucide-react";
import { TableOptions, ListOptions, FeedOptions, MapOptions } from "./view-options/simple";
import { BoardOptions, GalleryOptions } from "./view-options/cards";
import { CalendarOptions, TimelineOptions } from "./view-options/temporal";
import { ChartOptions } from "./view-options/chart";
import { DashboardOptions, FormOptions } from "./view-options/dashboardForm";
import type { ViewOptionsProps } from "./view-options/atoms";

interface Props { db: Database; view: DatabaseViewConfig }

export function ViewOptions({ db, view }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-auto gap-1 px-2 py-1 text-xs font-normal text-muted-foreground [&_svg]:size-3">
          <Sliders className="h-3 w-3" /> Options
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 space-y-3 max-h-[70vh] overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {view.type} options
        </div>
        <ViewPanel db={db} view={view} />
      </PopoverContent>
    </Popover>
  );
}

function ViewPanel({ db, view }: ViewOptionsProps) {
  switch (view.type) {
    case "table": return <TableOptions db={db} view={view} />;
    case "board": return <BoardOptions db={db} view={view} />;
    case "gallery": return <GalleryOptions db={db} view={view} />;
    case "list": return <ListOptions db={db} view={view} />;
    case "calendar": return <CalendarOptions db={db} view={view} />;
    case "timeline": return <TimelineOptions db={db} view={view} />;
    case "chart": return <ChartOptions db={db} view={view} />;
    case "dashboard": return <DashboardOptions db={db} view={view} />;
    case "feed": return <FeedOptions db={db} view={view} />;
    case "map": return <MapOptions db={db} view={view} />;
    case "form": return <FormOptions db={db} view={view} />;
    default: return null;
  }
}
