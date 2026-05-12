import type { PropertyType } from "@/shared/types/domain";
import { MultiPropChecklist, PropPicker, Row, Section, Segmented, Toggle, isCategorical, useUpdate, type ViewOptionsProps } from "./atoms";

export function BoardOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Group">
        <Row label="Group by">
          <PropPicker
            value={view.groupBy}
            onPick={(id) => set({ groupBy: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty
            emptyLabel="No grouping (auto)"
          />
        </Row>
        <Toggle
          label="Hide empty groups"
          checked={!!view.boardHideEmptyGroups}
          onChange={v => set({ boardHideEmptyGroups: v })}
        />
      </Section>
      <Section title="Cards">
        <Row label="Card size">
          <Segmented
            value={view.boardCardSize ?? "medium"}
            onChange={v => set({ boardCardSize: v })}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
        </Row>
        <Row label="Color cards by">
          <PropPicker
            value={view.boardColorByProp}
            onPick={(id) => set({ boardColorByProp: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty emptyLabel="None"
          />
        </Row>
        <Row label="Card properties" hint="Shown under title">
          <MultiPropChecklist
            db={db}
            value={view.boardCardProps}
            onChange={(ids) => set({ boardCardProps: ids })}
            filter={(p) => p.type !== "text"}
            max={6}
          />
        </Row>
      </Section>
    </>
  );
}

export function GalleryOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  const imageTypes: PropertyType[] = ["files", "url"];
  return (
    <>
      <Section title="Cover">
        <Row label="Source">
          <Segmented
            value={view.galleryCoverSource ?? "cover"}
            onChange={v => set({ galleryCoverSource: v })}
            options={[
              { value: "cover", label: "Page cover" },
              { value: "property", label: "Property" },
              { value: "none", label: "None" },
            ]}
          />
        </Row>
        {view.galleryCoverSource === "property" && (
          <Row label="Cover property">
            <PropPicker
              value={view.galleryCoverProp}
              onPick={(id) => set({ galleryCoverProp: id ?? undefined })}
              props={db.properties.filter(p => imageTypes.includes(p.type))}
              allowEmpty emptyLabel="—"
            />
          </Row>
        )}
        <Row label="Aspect">
          <Segmented
            value={view.galleryAspect ?? "video"}
            onChange={v => set({ galleryAspect: v })}
            options={[
              { value: "square", label: "1:1" },
              { value: "video", label: "16:9" },
              { value: "portrait", label: "3:4" },
            ]}
          />
        </Row>
        <Row label="Fit">
          <Segmented
            value={view.galleryCoverFit ?? "cover"}
            onChange={v => set({ galleryCoverFit: v })}
            options={[
              { value: "cover", label: "Fill" },
              { value: "contain", label: "Fit" },
            ]}
          />
        </Row>
      </Section>
      <Section title="Cards">
        <Row label="Size">
          <Segmented
            value={view.gallerySize ?? "medium"}
            onChange={v => set({ gallerySize: v })}
            options={[
              { value: "small", label: "S" },
              { value: "medium", label: "M" },
              { value: "large", label: "L" },
            ]}
          />
        </Row>
        <Row label="Properties shown">
          <MultiPropChecklist
            db={db}
            value={view.galleryCardProps}
            onChange={(ids) => set({ galleryCardProps: ids })}
            filter={(p) => p.type !== "text"}
            max={4}
          />
        </Row>
      </Section>
    </>
  );
}
