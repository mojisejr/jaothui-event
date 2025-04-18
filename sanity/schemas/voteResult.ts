import { defineType, defineField } from "sanity";

export const voteResultType = defineType({
  title: "Vote Result",
  name: "voteResult",
  type: "document",
  fields: [
    defineField({
      title: "Event",
      name: "event",
      type: "reference",
      to: [{ type: "voteEvent" }],
    }),

    //If event is
    defineField({
      title: "Candidate",
      name: "candidate",
      type: "reference",
      to: [{ type: "candidate" }],
    }),

    defineField({
      title: "Voters",
      name: "voters",
      type: "array",
      of: [{ type: "reference", to: [{ type: "user" }] }],
    }),

    defineField({
      title: "Voters From Bitkub",
      name: "wallets",
      type: "array",
      of: [{ type: "string" }],
    }),
  ],
});
