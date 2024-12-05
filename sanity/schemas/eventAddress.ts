import { defineType, defineField } from "sanity";

export const eventAddressType = defineType({
  title: "Event Address",
  name: "eventAddress",
  type: "document",
  fields: [
    defineField({
      title: "Title",
      name: "title",
      type: "string",
    }),

    defineField({
      title: "Of User",
      name: "user",
      type: "reference",
      to: [{ type: "user" }],
    }),

    defineField({
      title: "Of Event",
      name: "event",
      type: "reference",
      to: [{ type: "event" }],
    }),

    defineField({
      title: "Of Register Event",
      name: "eventRegister",
      type: "reference",
      to: [{ type: "eventRegister" }],
    }),

    defineField({
      title: "Address",
      name: "address",
      type: "string",
    }),

    defineField({
      title: "District",
      name: "district",
      type: "string",
    }),

    defineField({
      title: "Amphoe",
      name: "amphoe",
      type: "string",
    }),

    defineField({
      title: "Province",
      name: "province",
      type: "string",
    }),

    defineField({
      title: "Zipcode",
      name: "zipcode",
      type: "string",
    }),
  ],
});
