import { defineDocumentFieldAction, defineField, defineType } from "sanity";

export const eventType = defineType({
  title: "Event",
  name: "event",
  type: "document",
  fields: [
    defineField({
      title: "Event Title",
      name: "title",
      type: "string",
    }),

    defineField({
      title: "Descroption",
      name: "description",
      type: "text",
    }),

    defineField({
      title: "Start At",
      name: "startAt",
      type: "date",
      options: {
        dateFormat: "DD-MM-YYYY",
      },
    }),

    defineField({
      title: "End At",
      name: "endAt",
      type: "date",
      options: {
        dateFormat: "DD-MM-YYYY",
      },
    }),

    defineField({
      title: "Buffalo Age Deadline",
      name: "buffaloAgeDeadline",
      type: "date",
      options: {
        dateFormat: "DD-MM-YYYY",
      },
    }),

    defineField({
      title: "Location",
      name: "location",
      type: "string",
    }),

    defineField({
      title: "Facebook Page Url",
      name: "facebook",
      type: "string",
    }),

    defineField({
      title: "Twitter Url",
      name: "twitter",
      type: "string",
    }),

    defineField({
      title: "Website Url",
      name: "website",
      type: "string",
    }),

    defineField({
      title: "isActive",
      name: "isActive",
      type: "boolean",
      initialValue: true,
    }),

    defineField({
      title: "Event Image",
      name: "image",
      type: "image",
    }),

    defineField({
      title: "Metadata",
      name: "metadata",
      type: "array",
      of: [{ type: "string" }],
    }),
  ],
});
