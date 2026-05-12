import { Input } from "@/shared/ui/input";
import { MultiPropChecklist, Row, Section, isCategorical, useUpdate, type ViewOptionsProps } from "./atoms";

export function DashboardOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="KPI cards">
        <div className="text-[10px] text-muted-foreground -mt-1">Numeric or checkbox properties to feature</div>
        <MultiPropChecklist
          db={db}
          value={view.dashboardKPIs}
          onChange={(ids) => set({ dashboardKPIs: ids })}
          filter={(p) => p.type === "number" || p.type === "checkbox"}
          max={6}
        />
      </Section>
      <Section title="Group breakdowns">
        <div className="text-[10px] text-muted-foreground -mt-1">Select / Status properties</div>
        <MultiPropChecklist
          db={db}
          value={view.dashboardBreakdowns}
          onChange={(ids) => set({ dashboardBreakdowns: ids })}
          filter={isCategorical}
          max={6}
        />
      </Section>
      <Section title="Recent activity">
        <Row label="Limit">
          <Input
            type="number" min={1} max={20}
            value={view.dashboardRecentLimit ?? 5}
            onChange={(e) => set({ dashboardRecentLimit: Math.max(1, Math.min(20, Number(e.target.value) || 5)) })}
            className="h-7 text-xs"
          />
        </Row>
      </Section>
    </>
  );
}

export function FormOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Header">
        <Row label="Title">
          <Input
            value={view.formTitle ?? ""}
            placeholder={db.name}
            onChange={(e) => set({ formTitle: e.target.value })}
            className="h-7 text-xs"
          />
        </Row>
        <Row label="Description">
          <textarea
            value={view.formDescription ?? ""}
            placeholder="Fill the form to add a new row."
            onChange={(e) => set({ formDescription: e.target.value })}
            rows={2}
            className="w-full text-xs rounded-md border border-border bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </Row>
        <Row label="Success message">
          <Input
            value={view.formSuccessMessage ?? ""}
            placeholder="Submitted!"
            onChange={(e) => set({ formSuccessMessage: e.target.value })}
            className="h-7 text-xs"
          />
        </Row>
      </Section>
      <Section title="Fields">
        <div className="text-[10px] text-muted-foreground -mt-1">
          Fields shown in the form (use the form page's pencil button to set required).
        </div>
        <MultiPropChecklist
          db={db}
          value={view.formShownProps}
          onChange={(ids) => set({ formShownProps: ids })}
          filter={(p) => !["rollup", "formula", "created_time", "created_by", "last_edited_time", "last_edited_by", "unique_id", "relation", "files"].includes(p.type)}
        />
      </Section>
    </>
  );
}
