import { defineField, defineType } from "sanity";

export const eventApprovementType = defineType({
  title: "Approvement",
  name: "approvment",
  type: "document",
  fields: [
    defineField({
      title: "Title",
      name: "title",
      type: "string",
    }),

    defineField({
      title: "Of Event",
      name: "event",
      type: "reference",
      to: [{ type: "event" }],
    }),

    defineField({
      title: "Of Event Register",
      name: "eventRegister",
      type: "reference",
      to: [{ type: "eventRegister" }],
    }),

    defineField({
      title: "Image Details",
      name: "eventImage",
      type: "reference",
      to: [{ type: "eventImage" }],
    }),

    defineField({
      title: "Approvement Comment",
      name: "comment",
      type: "string",
    }),

    defineField({
      title: "Approvement Result",
      name: "approvementResult",
      type: "boolean",
      initialValue: false,
    }),
  ],
});
