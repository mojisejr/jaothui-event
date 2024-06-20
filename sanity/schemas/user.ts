import { defineType, defineField } from "sanity";

export const userType = defineType({
  title: "User",
  name: "user",
  type: "document",
  fields: [
    defineField({
      title: "LineId",
      name: "lineId",
      type: "string",
    }),

    defineField({
      title: "Email",
      name: "email",
      type: "string",
    }),

    defineField({
      title: "Tel",
      name: "tel",
      type: "string",
    }),

    defineField({
      title: "Role",
      name: "role",
      type: "string",
      options: {
        list: [
          {
            _key: "0",
            title: "User",
            value: "USER",
          },
          {
            _key: "1",
            title: "Admin",
            value: "ADMIN",
          },
        ],
        layout: "dropdown",
      },
    }),
  ],
});
