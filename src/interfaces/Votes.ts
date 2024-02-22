import { Voters } from "@prisma/client";
import { VoteEvent } from "./VoteEvent";

export interface Votes {
  id?: number;
  name: string;
  microchip: string;
  imageUrl?: string;
  eventId?: number;
  event?: VoteEvent;
  voters?: Voters[];
}
