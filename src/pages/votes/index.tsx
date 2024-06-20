import Link from "next/link";
import { useEffect } from "react";
import Loading1 from "~/components/Shared/Loading1";
import CandidateCard from "~/components/Votes/CandidateCard";
import VotedCard from "~/components/Votes/VotedCard";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";
export default function VotesPage() {
  const { data: voteEvent, isLoading } = api.votes.getAllEvents.useQuery();

  console.log(voteEvent);

  return (
    <div className="min-h-screen text-primary">
      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loading1 />
        </div>
      ) : (
        <div className="p-2">
          {voteEvent?.map((event, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-primary p-2  text-white"
            >
              <div>{event.name}</div>
              <Link className="btn btn-secondary" href={`/votes/${event._id}`}>
                ไปโหวต
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
