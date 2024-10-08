import { defineType, defineField } from "sanity";

export const eventRegisterType = defineType({
  title: "Event Register",
  name: "eventRegister",
  type: "document",
  fields: [
    defineField({
      title: "Type",
      name: "type",
      type: "string",
    }),

    defineField({
      title: "Level",
      name: "level",
      type: "string",
    }),

    defineField({
      title: "Name",
      name: "name",
      type: "string",
    }),

    defineField({
      title: "Sex",
      name: "sex",
      type: "string",
    }),

    defineField({
      title: "Color",
      name: "color",
      type: "string",
    }),

    defineField({
      title: "Birthday",
      name: "birthday",
      type: "string",
    }),

    defineField({
      title: "Microchip",
      name: "microchip",
      type: "string",
    }),

    defineField({
      title: "Owner Name",
      name: "ownerName",
      type: "string",
    }),

    defineField({
      title: "Buffalo Age (Month)",
      name: "buffaloAge",
      type: "number",
    }),

    defineField({
      title: "Owner Tel",
      name: "ownerTel",
      type: "string",
    }),

    defineField({
      title: "User",
      name: "user",
      type: "reference",
      to: [
        {
          type: "user",
        },
      ],
    }),

    defineField({
      title: "event",
      name: "event",
      type: "reference",
      to: [{ type: "event" }],
    }),
  ],
});
