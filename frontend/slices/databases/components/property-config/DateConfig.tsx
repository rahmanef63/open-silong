import type { Database, Property } from "@/shared/types/domain";
import { Switch } from "@/shared/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
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
        <Select value={fmt} onValueChange={(v) => patch({ dateFormat: v as DateFormatKind })}>
          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(DATE_FORMAT_LABELS) as DateFormatKind[]).map((k) => (
              <SelectItem key={k} value={k}>{DATE_FORMAT_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Include time</Label>
        <Switch checked={includeTime} onCheckedChange={(o) => patch({ dateIncludeTime: o || undefined })} />
      </div>

      {includeTime && (
        <div>
          <Label>Time format</Label>
          <Select value={tfmt} onValueChange={(v) => patch({ timeFormat: v as TimeFormatKind })}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TIME_FORMAT_LABELS) as TimeFormatKind[]).map((k) => (
                <SelectItem key={k} value={k}>{TIME_FORMAT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Notifications</Label>
        <Select
          value={notif}
          onValueChange={(v) => patch({ dateNotification: (v === "none" ? undefined : v) as Property["dateNotification"] })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(NOTIFICATION_LABELS) as Array<keyof typeof NOTIFICATION_LABELS>).map((k) => (
              <SelectItem key={k} value={k}>{NOTIFICATION_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
