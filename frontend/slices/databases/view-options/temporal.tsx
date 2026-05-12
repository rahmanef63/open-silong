import { PropPicker, Row, Section, Segmented, Toggle, isCategorical, isDate, useUpdate, type ViewOptionsProps } from "./atoms";

export function CalendarOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Date range">
        <Row label="Start date property">
          <PropPicker
            value={view.calendarDateProp}
            onPick={(id) => set({ calendarDateProp: id ?? undefined })}
            props={db.properties.filter(isDate)}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
        <Row label="End date property" hint="Optional, for multi-day events">
          <PropPicker
            value={view.calendarEndProp}
            onPick={(id) => set({ calendarEndProp: id ?? undefined })}
            props={db.properties.filter(isDate)}
            allowEmpty emptyLabel="None"
          />
        </Row>
      </Section>
      <Section title="Display">
        <Row label="View">
          <Segmented
            value={view.calendarMode ?? "month"}
            onChange={v => set({ calendarMode: v })}
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
            ]}
          />
        </Row>
        <Toggle
          label="Show overdue / no-date panel"
          checked={view.calendarShowOverdue ?? true}
          onChange={v => set({ calendarShowOverdue: v })}
        />
        <Row label="Color events by">
          <PropPicker
            value={view.calendarColorByProp}
            onPick={(id) => set({ calendarColorByProp: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty emptyLabel="None"
          />
        </Row>
        <Row label="Week starts on">
          <Segmented
            value={view.calendarWeekStart ?? 0}
            onChange={v => set({ calendarWeekStart: v })}
            options={[
              { value: 0, label: "Sunday" },
              { value: 1, label: "Monday" },
            ]}
          />
        </Row>
        <Toggle
          label="Show weekends"
          checked={view.calendarShowWeekends ?? true}
          onChange={v => set({ calendarShowWeekends: v })}
        />
      </Section>
    </>
  );
}

export function TimelineOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Date range">
        <Row label="Start property">
          <PropPicker
            value={view.timelineStartProp}
            onPick={(id) => set({ timelineStartProp: id ?? undefined })}
            props={db.properties.filter(isDate)}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
        <Row label="End property">
          <PropPicker
            value={view.timelineEndProp}
            onPick={(id) => set({ timelineEndProp: id ?? undefined })}
            props={db.properties.filter(isDate)}
            allowEmpty emptyLabel="Same as start"
          />
        </Row>
      </Section>
      <Section title="Display">
        <Row label="Zoom">
          <Segmented
            value={view.timelineZoom ?? "month"}
            onChange={v => set({ timelineZoom: v })}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "quarter", label: "Quarter" },
            ]}
          />
        </Row>
        <Row label="Color bars by">
          <PropPicker
            value={view.timelineColorByProp}
            onPick={(id) => set({ timelineColorByProp: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty emptyLabel="None"
          />
        </Row>
      </Section>
    </>
  );
}
