import { defineType, defineField } from "sanity";

export const voteType = defineType({
  title: "Candidate",
  name: "candidate",
  type: "document",
  fields: [
    defineField({
      title: "event",
      name: "event",
      type: "reference",
      to: [{ type: "voteEvent" }],
    }),
    defineField({
      title: "Name",
      name: "name",
      type: "string",
    }),

    defineField({
      title: "Microchip",
      name: "microchip",
      type: "string",
    }),

    defineField({
      title: "Image",
      name: "image",
      type: "string",
    }),
  ],
});
