import { Votes } from "./Votes";
export interface Voters {
  id?: number;
  userId: String;
  voteFor: Votes;
}
