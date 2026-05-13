import { Calendar as DayPicker } from "@/shared/ui/calendar";
import { Switch } from "@/shared/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ChevronRight } from "lucide-react";
import type { Property } from "@/shared/types/domain";
import {
  type DateFormatKind, type TimeFormatKind, type DateValue,
  DATE_FORMAT_LABELS, TIME_FORMAT_LABELS, NOTIFICATION_LABELS,
} from "../../lib/dateFormat";

interface Props {
  value: DateValue;
  prop: Property;
  onChange: (v: DateValue) => void;
  onClear: () => void;
  onPropPatch: (patch: Partial<Property>) => void;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const ymdLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function ymdToDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

export function DateEditor({ value, prop, onChange, onClear, onPropPatch }: Props) {
  const startDate = ymdToDate(value.date);
  const endOn = !!value.end;
  const fmt: DateFormatKind = prop.dateFormat ?? "full";
  const tfmt: TimeFormatKind = prop.timeFormat ?? "12h";
  const includeTime = !!prop.dateIncludeTime;
  const notif = prop.dateNotification ?? "none";

  const setStart = (d: Date | undefined) => {
    if (!d) return onChange({ ...value, date: undefined });
    const ymd = ymdLocal(d);
    let next = { ...value, date: ymd };
    if (next.end && next.end < ymd) next = { ...next, end: ymd };
    onChange(next);
  };

  const setEnd = (d: Date | undefined) => {
    if (!d) return onChange({ ...value, end: undefined });
    onChange({ ...value, end: ymdLocal(d) });
  };

  return (
    <div className="w-[300px] p-2">
      <div className="flex gap-2 mb-2">
        <input
          type="date"
          value={value.date ?? ""}
          onChange={(e) => onChange({ ...value, date: e.target.value || undefined })}
          className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        {includeTime && (
          <input
            type="time"
            value={value.time ?? ""}
            onChange={(e) => onChange({ ...value, time: e.target.value || undefined })}
            className="w-24 h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        )}
      </div>

      <DayPicker
        mode="single"
        selected={startDate}
        onSelect={setStart}
        defaultMonth={startDate}
      />

      {endOn && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-[11px] text-muted-foreground mb-1 px-1">End</div>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={value.end ?? ""}
              min={value.date}
              onChange={(e) => onChange({ ...value, end: e.target.value || undefined })}
              className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {includeTime && (
              <input
                type="time"
                value={value.endTime ?? ""}
                onChange={(e) => onChange({ ...value, endTime: e.target.value || undefined })}
                className="w-24 h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            )}
          </div>
          <DayPicker
            mode="single"
            selected={ymdToDate(value.end)}
            onSelect={setEnd}
            defaultMonth={ymdToDate(value.end) ?? startDate}
            disabled={(d) => !!startDate && d < startDate}
          />
        </div>
      )}

      <div className="mt-2 border-t border-border space-y-0.5 pt-1">
        <Row label="End date" right={<Switch checked={endOn} onCheckedChange={(o) => onChange(o ? { ...value, end: value.date } : { ...value, end: undefined, endTime: undefined })} />} />
        <SubmenuRow label="Date format" value={DATE_FORMAT_LABELS[fmt]}>
          {(Object.keys(DATE_FORMAT_LABELS) as DateFormatKind[]).map((k) => (
            <DropdownMenuItem key={k} onSelect={() => onPropPatch({ dateFormat: k })}>
              {DATE_FORMAT_LABELS[k]}{k === fmt && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}
        </SubmenuRow>
        <Row label="Include time" right={<Switch checked={includeTime} onCheckedChange={(o) => onPropPatch({ dateIncludeTime: o || undefined })} />} />
        {includeTime && (
          <SubmenuRow label="Time format" value={TIME_FORMAT_LABELS[tfmt]}>
            {(Object.keys(TIME_FORMAT_LABELS) as TimeFormatKind[]).map((k) => (
              <DropdownMenuItem key={k} onSelect={() => onPropPatch({ timeFormat: k })}>
                {TIME_FORMAT_LABELS[k]}{k === tfmt && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </SubmenuRow>
        )}
        <SubmenuRow label="Remind" value={NOTIFICATION_LABELS[notif]}>
          {(Object.keys(NOTIFICATION_LABELS) as Array<keyof typeof NOTIFICATION_LABELS>).map((k) => (
            <DropdownMenuItem key={k} onSelect={() => onPropPatch({ dateNotification: k === "none" ? undefined : k })}>
              {NOTIFICATION_LABELS[k]}{k === notif && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}
        </SubmenuRow>
      </div>

      <button onClick={onClear} className="mt-2 w-full text-left px-2 py-1 text-sm text-muted-foreground hover:bg-accent rounded">Clear</button>
    </div>
  );
}

function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 text-sm">
      <span>{label}</span>
      {right}
    </div>
  );
}

function SubmenuRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between px-2 py-1 text-sm hover:bg-accent rounded">
          <span>{label}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">{value}<ChevronRight className="h-3 w-3" /></span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
