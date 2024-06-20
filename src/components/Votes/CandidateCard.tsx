import { useEffect } from "react";
import { api } from "~/utils/api";
import { useLine } from "~/context/lineContext";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
interface CandidateCardProps {
  eventId: string;
  candidateId: string;
  imageUrl: string;
  name: string;
  rank: number;
  score: number;
}

export default function CandidateCard({
  eventId,
  candidateId,
  imageUrl,
  name,
  rank,
  score,
}: CandidateCardProps) {
  const { replace } = useRouter();

  const { profile } = useLine();

  const { data: canVote, isLoading: voterLoading } = api.votes.canVote.useQuery(
    {
      eventId: eventId as string,
      voterId: profile?.userId! as string,
    },
  );

  const {
    isLoading: voting,
    isSuccess: voted,
    isError: voteError,
    error,
    mutate: voteFor,
  } = api.votes.voteFor.useMutation();

  const handleVoteFor = (
    eventId: string,
    candidateId: string,
    voterId: string,
  ) => {
    voteFor({ eventId, candidateId, voterId });
  };

  useEffect(() => {
    if (voted) {
      toast.success("โหวตสำเร็จ!");
      void replace("/success");
    }

    if (voteError) {
      toast.error(error.message);
    }
  }, [voted, voteError]);
  return (
    <div className="w-84 card card-compact relative bg-secondary">
      <figure>
        <img src={imageUrl} alt={name} width={1000} height={700} />
      </figure>
      <div className="card-body">
        <h2 className="card-title">
          <div>{name}</div>
          <div className="badge badge-primary">อันดับที่ {rank}</div>
          {canVote?.candidateId == candidateId ? (
            <div className="badge bg-red-300">คุณโหวต</div>
          ) : null}
        </h2>
        <div className="text-2xl font-bold">{score} คะแนน</div>
        <div className="card-actions justify-end">
          <button
            disabled={!canVote?.canVote || voting}
            onClick={() =>
              handleVoteFor(eventId, candidateId, profile?.userId!)
            }
            className="btn btn-circle btn-primary disabled:bg-slate-200"
          >
            {voterLoading || voting ? (
              <div className="loading loading-spinner"></div>
            ) : (
              "โหวด"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
