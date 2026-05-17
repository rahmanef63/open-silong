import type { TplDatabaseT } from "../../../lib/validate";

/** Places — map + table + form. Demos place property + form view. */
export const locationsDb: TplDatabaseT = {
  ref: "locations",
  name: "Places",
  icon: "📍",
  properties: [
    { id: "name", name: "Name", type: "text" },
    { id: "address", name: "Address", type: "place" },
    {
      id: "city", name: "City", type: "select",
      options: [
        { id: "jkt", name: "Jakarta", color: "red" },
        { id: "bdg", name: "Bandung", color: "blue" },
        { id: "yog", name: "Yogyakarta", color: "purple" },
        { id: "sby", name: "Surabaya", color: "green" },
      ],
    },
    {
      id: "category", name: "Category", type: "select",
      options: [
        { id: "cafe", name: "Cafe", color: "yellow" },
        { id: "restaurant", name: "Restaurant", color: "orange" },
        { id: "hotel", name: "Hotel", color: "blue" },
        { id: "office", name: "Office", color: "gray" },
        { id: "landmark", name: "Landmark", color: "green" },
      ],
    },
    { id: "visited", name: "Visited", type: "checkbox" },
    { id: "rating", name: "Rating", type: "number" },
  ],
  views: [
    { id: "v1", type: "map", name: "Map", isDefault: true },
    { id: "v2", type: "table", name: "All places" },
    { id: "v3", type: "form", name: "Add new place", payload: { formIsPublic: false, formTitle: "Submit a new place", formShownProps: ["name", "address", "city", "category"] } },
  ],
};
