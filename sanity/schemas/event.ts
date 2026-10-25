import { defineDocumentFieldAction, defineField, defineType } from "sanity";

export const eventType = defineType({
  title: "Event",
  name: "event",
  type: "document",
  fields: [
    defineField({
      name: "competitionRegistrationCount",
      title: "Competition Registration Count",
      type: "number",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "competitionWriteFence",
      title: "Competition Write Fence",
      type: "number",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "competitionAudit",
      title: "Competition Audit",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "competitionRegistrationCount",
              title: "Competition Registration Count",
              type: "number",
              hidden: true,
              readOnly: true,
            }),
            { name: "at", type: "datetime" },
            { name: "actor", type: "string" },
            { name: "action", type: "string" },
            { name: "reason", type: "text" },
            { name: "operationId", type: "string" },
          ],
        },
      ],
    }),
    defineField({
      name: "competitionState",
      title: "Competition State",
      type: "string",
      options: { list: ["draft", "published", "closed"] },
      description:
        "Absent means legacy event; new dashboard events use explicit publication state.",
    }),
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
      title: "Registration Active",
      name: "registrationActive",
      type: "boolean",
      description:
        "Controls whether registration is currently open for this event",
      initialValue: true,
    }),

    defineField({
      title: "Registration Start At",
      name: "registrationStartAt",
      type: "date",
      description: "When registration opens for this event",
      options: {
        dateFormat: "DD-MM-YYYY",
      },
    }),

    defineField({
      title: "Registration Deadline",
      name: "registrationDeadline",
      type: "date",
      description:
        "When registration closes for this event (separate from event deadline)",
      options: {
        dateFormat: "DD-MM-YYYY",
      },
    }),

    defineField({
      title: "Event Type",
      name: "eventType",
      type: "string",
      options: {
        list: [
          { title: "Normal Event", value: "normal" },
          { title: "Royal Event", value: "royal" },
        ],
      },
      initialValue: "normal",
      description: "Select event type for routing to appropriate form",
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
