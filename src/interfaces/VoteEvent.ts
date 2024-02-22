import { Votes } from "./Votes";

export interface VoteEvent {
  id: number;
  name: string;
  votes?: Votes[];
}
