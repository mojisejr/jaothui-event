export interface CandidateScore {
  candidate: {
    _id: string;
    candidateId: string;
  };
  voters: [{ _id: string }];
}
