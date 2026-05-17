import type { TplDatabaseT } from "../../../lib/validate";

/** Contacts / mini CRM — table + gallery roster. */
export const contactsDb: TplDatabaseT = {
  ref: "contacts",
  name: "Contacts",
  icon: "👥",
  properties: [
    { id: "name", name: "Name", type: "text" },
    { id: "email", name: "Email", type: "email" },
    { id: "phone", name: "Phone", type: "phone" },
    { id: "company", name: "Company", type: "text" },
    { id: "role", name: "Role", type: "text" },
    { id: "lastContact", name: "Last contact", type: "date" },
    {
      id: "tags", name: "Tags", type: "multi_select",
      options: [
        { id: "client", name: "Client", color: "green" },
        { id: "vendor", name: "Vendor", color: "blue" },
        { id: "team", name: "Team", color: "purple" },
        { id: "friend", name: "Friend", color: "pink" },
      ],
    },
    { id: "avatar", name: "Photo", type: "files" },
  ],
  views: [
    { id: "v1", type: "table", name: "All contacts", isDefault: true },
    { id: "v2", type: "gallery", name: "Roster" },
  ],
};
