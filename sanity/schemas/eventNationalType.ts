import { defineField, defineType } from "sanity";

export const nationalType = defineType({
  title: "National Event Type",
  name: "nationalEventType",
  type: "document",
  fields: [
    defineField({
      title: "Event Name",
      name: "eventName",
      type: "string",
    }),

    defineField({
      title: "Type Data",
      name: "data",
      type: "array",
      of: [{ type: "string" }],
    }),

    defineField({
      title: "Of Event",
      name: "event",
      type: "reference",
      to: { type: "event" },
    }),
  ],
});
