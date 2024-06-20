export interface VoteResult {
  _id: string;
  _rev: string;
  _createdAt: string;
  _updatedAt: string;
  _type: string;
  candidate: {
    type: "reference";
    _ref: string;
  };
  event: { type: "referenece"; _ref: string };
  voters?: { _key: string; _ref: string; type: "reference" };
}
