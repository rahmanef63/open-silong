import type { Database, Property } from "@/shared/types/domain";
import { Switch } from "@/shared/ui/switch";
import { Label } from "./atoms";
import {
  DATE_FORMAT_LABELS, TIME_FORMAT_LABELS, NOTIFICATION_LABELS,
  type DateFormatKind, type TimeFormatKind,
} from "../../lib/dateFormat";

interface Props {
  db: Database;
  prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}

export function DateConfig({ db, prop, updateProperty }: Props) {
  const patch = (p: Partial<Property>) => updateProperty(db.id, prop.id, p);
  const fmt = prop.dateFormat ?? "full";
  const tfmt = prop.timeFormat ?? "12h";
  const includeTime = !!prop.dateIncludeTime;
  const notif = prop.dateNotification ?? "none";

  return (
    <div className="space-y-3">
      <div>
        <Label>Date format</Label>
        <select
          value={fmt}
          onChange={(e) => patch({ dateFormat: e.target.value as DateFormatKind })}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
        >
          {(Object.keys(DATE_FORMAT_LABELS) as DateFormatKind[]).map((k) => (
            <option key={k} value={k}>{DATE_FORMAT_LABELS[k]}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Include time</Label>
        <Switch checked={includeTime} onCheckedChange={(o) => patch({ dateIncludeTime: o || undefined })} />
      </div>

      {includeTime && (
        <div>
          <Label>Time format</Label>
          <select
            value={tfmt}
            onChange={(e) => patch({ timeFormat: e.target.value as TimeFormatKind })}
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
          >
            {(Object.keys(TIME_FORMAT_LABELS) as TimeFormatKind[]).map((k) => (
              <option key={k} value={k}>{TIME_FORMAT_LABELS[k]}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label>Notifications</Label>
        <select
          value={notif}
          onChange={(e) => patch({ dateNotification: (e.target.value === "none" ? undefined : e.target.value) as Property["dateNotification"] })}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
        >
          {(Object.keys(NOTIFICATION_LABELS) as Array<keyof typeof NOTIFICATION_LABELS>).map((k) => (
            <option key={k} value={k}>{NOTIFICATION_LABELS[k]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
