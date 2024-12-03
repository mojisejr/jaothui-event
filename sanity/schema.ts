import { type SchemaTypeDefinition } from "sanity";
import { userType } from "./schemas/user";
import { eventType } from "./schemas/event";
import { eventRegisterType } from "./schemas/eventRegister";
import { voteType } from "./schemas/voteCandidates";
import { voteEventType } from "./schemas/voteEvent";
import { voteResultType } from "./schemas/voteResult";
import { eventImageType } from "./schemas/eventImage";
import { eventApprovementType } from "./schemas/eventApprovement";
import { eventAddressType } from "./schemas/eventAddress";
import { nationalType } from "./schemas/eventNationalType";
import { provinceType } from "./schemas/eventProvinceType";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    userType,
    eventType,
    eventRegisterType,
    eventImageType,
    eventApprovementType,
    eventAddressType,
    nationalType,
    provinceType,
    voteType,
    voteEventType,
    voteResultType,
  ],
};
