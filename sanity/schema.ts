import { type SchemaTypeDefinition } from "sanity";
import { userType } from "./schemas/user";
import { eventType } from "./schemas/event";
import { eventRegisterType } from "./schemas/eventRegister";
import { voteType } from "./schemas/voteCandidates";
import { voteEventType } from "./schemas/voteEvent";
import { voteResultType } from "./schemas/voteResult";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    userType,
    eventType,
    eventRegisterType,
    voteType,
    voteEventType,
    voteResultType,
  ],
};
