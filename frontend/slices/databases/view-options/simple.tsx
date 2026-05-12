import { MultiPropChecklist, PropPicker, Row, Section, Segmented, Toggle, isCategorical, isNumeric, useUpdate, type ViewOptionsProps } from "./atoms";

export function TableOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <Section title="Layout">
      <Row label="Wrap cell text" hint="Long text wraps onto multiple lines">
        <Toggle label="" checked={!!view.tableWrapCells} onChange={v => set({ tableWrapCells: v })} />
      </Row>
      <Row label="Row height">
        <Segmented
          value={view.tableRowHeight ?? "medium"}
          onChange={v => set({ tableRowHeight: v })}
          options={[
            { value: "short", label: "Short" },
            { value: "medium", label: "Medium" },
            { value: "tall", label: "Tall" },
          ]}
        />
      </Row>
    </Section>
  );
}

export function ListOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Density">
        <Segmented
          value={view.listDensity ?? "comfortable"}
          onChange={v => set({ listDensity: v })}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
          ]}
        />
      </Section>
      <Section title="Summary properties">
        <MultiPropChecklist
          db={db}
          value={view.listSummaryProps}
          onChange={(ids) => set({ listSummaryProps: ids })}
          filter={(p) => p.type !== "text"}
          max={4}
        />
      </Section>
    </>
  );
}

export function FeedOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Time">
        <Row label="Sort by">
          <Segmented
            value={view.feedTimestamp ?? "updatedAt"}
            onChange={v => set({ feedTimestamp: v })}
            options={[
              { value: "updatedAt", label: "Edited" },
              { value: "createdAt", label: "Created" },
            ]}
          />
        </Row>
      </Section>
      <Section title="Density">
        <Segmented
          value={view.feedDensity ?? "comfortable"}
          onChange={v => set({ feedDensity: v })}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
          ]}
        />
      </Section>
      <Section title="Summary properties">
        <MultiPropChecklist
          db={db}
          value={view.feedSummaryProps}
          onChange={(ids) => set({ feedSummaryProps: ids })}
          filter={(p) => p.type !== "text"}
          max={4}
        />
      </Section>
    </>
  );
}

export function MapOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Coordinates">
        <Row label="Latitude">
          <PropPicker
            value={view.mapLatProp}
            onPick={(id) => set({ mapLatProp: id ?? undefined })}
            props={db.properties.filter(isNumeric)}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
        <Row label="Longitude">
          <PropPicker
            value={view.mapLngProp}
            onPick={(id) => set({ mapLngProp: id ?? undefined })}
            props={db.properties.filter(isNumeric)}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
      </Section>
      <Section title="Pins">
        <Row label="Color pins by">
          <PropPicker
            value={view.mapPinColorProp}
            onPick={(id) => set({ mapPinColorProp: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty emptyLabel="Single color"
          />
        </Row>
        <Toggle
          label="Show list under map"
          checked={view.mapShowList ?? true}
          onChange={v => set({ mapShowList: v })}
        />
      </Section>
    </>
  );
}
