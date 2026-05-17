import type { TplDatabaseT } from "../../../lib/validate";

/** Calendar events — calendar + timeline + table.
 *  Relation: attendees → contacts. */
export const eventsDb: TplDatabaseT = {
  ref: "events",
  name: "Calendar Events",
  icon: "📅",
  properties: [
    { id: "name", name: "Event", type: "text" },
    { id: "start", name: "Start", type: "date" },
    { id: "end", name: "End", type: "date" },
    { id: "location", name: "Location", type: "place" },
    { id: "attendees", name: "Attendees", type: "relation", relationDatabaseRef: "contacts" },
    {
      id: "category", name: "Type", type: "select",
      options: [
        { id: "meeting", name: "Meeting", color: "blue" },
        { id: "deadline", name: "Deadline", color: "red" },
        { id: "social", name: "Social", color: "green" },
        { id: "personal", name: "Personal", color: "purple" },
      ],
    },
    { id: "reminder", name: "Reminder", type: "checkbox" },
    { id: "url", name: "Meeting link", type: "url" },
  ],
  views: [
    { id: "v1", type: "calendar", name: "Calendar", isDefault: true, payload: { calendarDateProp: "start" } },
    { id: "v2", type: "timeline", name: "Timeline", payload: { timelineStartProp: "start", timelineEndProp: "end", timelineColorByProp: "category" } },
    { id: "v3", type: "table", name: "All events" },
  ],
};
