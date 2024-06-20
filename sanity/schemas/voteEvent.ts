import { defineType, defineField } from "sanity";

export const voteEventType = defineType({
  title: "Vote Event",
  name: "voteEvent",
  type: "document",
  fields: [
    defineField({
      title: "Name",
      name: "name",
      type: "string",
    }),

    defineField({
      title: "isActive",
      name: "isActive",
      type: "boolean",
      initialValue: true,
    }),

    defineField({
      title: "Start Date",
      name: "startAt",
      type: "date",
    }),

    defineField({
      title: "End Date",
      name: "endAt",
      type: "date",
    }),

    defineField({
      title: "Candidates",
      name: "candidates",
      type: "array",
      of: [{ type: "reference", to: [{ type: "candidate" }] }],
    }),
  ],
});
