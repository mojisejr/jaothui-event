import { defineField, defineType } from "sanity";

export const provinceType = defineType({
  title: "Province Event Type",
  name: "provinceEventType",
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
