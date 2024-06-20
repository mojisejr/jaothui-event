import { Candidate } from "./Candidate";

export interface VoteEvent {
  _id: string;
  name: string;
  isAcitve: string;
  candidates: Candidate[] | null;
}
