import { Votes } from "./Votes";
export interface Voters {
  id?: number;
  userId: string;
  voteFor: Votes;
}
