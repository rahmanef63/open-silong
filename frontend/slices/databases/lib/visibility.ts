import type { Database, DatabaseViewConfig, Property } from "@/shared/types/domain";

/** Effective visible properties for a given view.
 *  Per-view `hiddenPropIds` is the source of truth; global `Property.hidden`
 *  is ignored so hiding a column in one view can't bleed into other views. */
export function getVisibleProps(db: Database, view: DatabaseViewConfig | undefined): Property[] {
  const hidden = new Set(view?.hiddenPropIds ?? []);
  return db.properties.filter((p) => !hidden.has(p.id));
}

export function isHiddenInView(view: DatabaseViewConfig | undefined, propId: string): boolean {
  return !!view?.hiddenPropIds?.includes(propId);
}

export function isVisibleInView(view: DatabaseViewConfig | undefined, prop: Property): boolean {
  return !isHiddenInView(view, prop.id);
}
