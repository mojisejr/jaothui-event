import { useEffect } from "react";
import CandidateCard from "~/components/Votes/CandidateCard";
import VotedCard from "~/components/Votes/VotedCard";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";
export default function VotesPage() {
  const { data: event } = api.votes.getSelectedEvent.useQuery();
  const { data: candidates } = api.votes.getCandidates.useQuery();
  const { profile } = useLine();
  const {
    data: voted,
    isSuccess: getVotedOK,
    isError: getVotedError,
  } = api.votes.voted.useQuery({
    userId: profile?.userId!,
  });

  return (
    <div className="min-h-screen text-primary">
      {candidates?.length! <= 0 ? (
        <div className="grid-col-1 grid w-full gap-2 px-2 py-6">
          <div className="p-2 font-bold">
            <span className="text-white">ยังไม่มีกิจกรรม</span>
          </div>
        </div>
      ) : (
        <div className="grid-col-1 grid w-full gap-2 px-2 py-6">
          <div className="p-2 font-bold">
            <span className="text-white">โหวตในงานประกวด</span> {'"'}
            {event?.name}
            {'"'}
          </div>
          {voted ? (
            <div className="py-6">
              <VotedCard
                key={voted.id}
                imageUrl={voted.imageUrl!}
                name={voted.name!}
                score={voted.score!}
              />
            </div>
          ) : (
            <>
              {candidates
                ?.sort((a, b) => a.score + b.score)
                .map((candidate, index) => (
                  <CandidateCard
                    key={candidate.id}
                    imageUrl={candidate.imageUrl!}
                    name={candidate.name}
                    score={candidate.score}
                    rank={index + 1}
                    votesId={candidate.id}
                  />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
