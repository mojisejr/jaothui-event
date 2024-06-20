import React from "react";
import { api } from "~/utils/api";
import CandidateCard from "~/components/Votes/CandidateCard";
import VotedCard from "~/components/Votes/VotedCard";
import Loading1 from "~/components/Shared/Loading1";
import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";

const VoteEventDetail = () => {
  const { query } = useRouter();
  const { data: vote, isLoading } = api.votes.getEventById.useQuery({
    eventId: query?.eventId as string,
  });

  return (
    <div>
      {isLoading ? (
        <div className="mt-10 flex h-screen justify-center">
          <Loading1 />
        </div>
      ) : (
        <div>
          {vote == undefined ? (
            <div>No Candidates</div>
          ) : (
            <div className="grid grid-cols-1 gap-2 p-2">
              <div className="p-2 text-white">
                <div className="font-bold">โหวตในงาน {vote.name}</div>
              </div>
              {vote.candidates
                ?.sort((a, b) => a.score! + b.score!)
                .map((candidate, index) => (
                  <CandidateCard
                    key={index}
                    name={candidate.name}
                    eventId={vote._id}
                    candidateId={candidate._id}
                    rank={index + 1}
                    score={candidate.score ?? 0}
                    imageUrl={candidate.image}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoteEventDetail;
