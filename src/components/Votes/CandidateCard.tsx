import { useEffect } from "react";
import { api } from "~/utils/api";
import { useLine } from "~/context/lineContext";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
interface CandidateCardProps {
  votesId: number;
  imageUrl: string;
  name: string;
  rank: number;
  score: number;
}

export default function CandidateCard({
  votesId,
  imageUrl,
  name,
  rank,
  score,
}: CandidateCardProps) {
  const { replace } = useRouter();
  const {
    mutate: voteFor,
    isLoading,
    isSuccess,
    isError,
    error,
  } = api.votes.voteFor.useMutation();

  const { profile } = useLine();

  useEffect(() => {
    if (isSuccess) {
      toast.success("โหวตสำเร็จ!");
      void replace("/success");
    }

    if (isError) {
      toast.error(error.message);
    }
  }, [isSuccess, isError]);
  return (
    <div className="w-84 card card-compact relative bg-secondary">
      <figure>
        <img src={imageUrl} alt={name} width={1000} height={700} />
      </figure>
      <div className="card-body">
        <h2 className="card-title">
          <div>{name}</div>
          <div className="badge badge-primary">อันดับที่ {rank}</div>
        </h2>
        <div className="text-2xl font-bold">{score} คะแนน</div>
        <div className="card-actions justify-end">
          <button
            onClick={() =>
              void voteFor({
                userId: profile == undefined ? "" : profile.userId,
                votesId,
              })
            }
            className="btn btn-circle btn-primary"
          >
            {isLoading ? (
              <div className="loading loading-spinner"></div>
            ) : (
              "โหวด"
            )}{" "}
          </button>
        </div>
      </div>
    </div>
  );
}
