import { defineType, defineField } from "sanity";

export const voteEventType = defineType({
  title: "Vote Event",
  name: "voteEvent",
  type: "document",
  fields: [
    //Event of Competition Name
    defineField({
      title: "Name",
      name: "name",
      type: "string",
    }),

    //Active / Deactive
    defineField({
      title: "isActive",
      name: "isActive",
      type: "boolean",
      initialValue: true,
    }),

    //Start Voting Date
    defineField({
      title: "Start Date",
      name: "startAt",
      type: "date",
    }),

    //End Voting Date
    defineField({
      title: "End Date",
      name: "endAt",
      type: "date",
    }),

    //Event or Competition type
    defineField({
      title: "Event or Competition",
      name: "eventType",
      type: "string",
      options: {
        list: [
          { title: "Event", value: "EVENT" },
          { title: "Competition", value: "COMPETITION" },
        ],
        layout: "radio",
      },
      initialValue: "EVENT",
    }),

    //Vote for all buffalo in the platform ? (available only for Event)
    defineField({
      title: "For All Buffalo ?",
      name: "isForAll",
      type: "boolean",
      initialValue: false,
    }),

    //Candidate when set the isForAll to true this field will be ignored
    defineField({
      title: "Candidates",
      name: "candidates",
      type: "array",
      of: [{ type: "reference", to: [{ type: "candidate" }] }],
    }),
  ],
});
