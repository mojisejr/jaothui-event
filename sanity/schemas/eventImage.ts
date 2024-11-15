import { defineType, defineField } from "sanity";

export const eventImageType = defineType({
  title: "EventImage",
  name: "eventImage",
  type: "document",
  fields: [
    defineField({
      title: "For Event",
      name: "event",
      type: "reference",
      to: [{ type: "event" }],
    }),

    defineField({
      title: "Of User",
      name: "user",
      type: "reference",
      to: [{ type: "user" }],
    }),

    defineField({
      title: "Images",
      name: "imageArray",
      type: "array",
      of: [
        {
          type: "object",
          title: "Image",
          name: "imageObject",
          fields: [
            defineField({
              name: "imageTitle",
              title: "Image Title",
              type: "string",
            }),
            defineField({
              name: "imageAsset",
              title: "Image Asset",
              type: "image",
            }),
          ],
        },
      ],
    }),
  ],
});
