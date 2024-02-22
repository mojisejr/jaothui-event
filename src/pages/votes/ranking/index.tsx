import clsx from "clsx";
import { api } from "~/utils/api";
export default function Ranking() {
  const { data: candidates } = api.votes.getCandidates.useQuery();
  return (
    <div className="min-h-screen px-2 py-6">
      <div className="flex flex-col gap-2">
        {candidates
          ?.sort((a, b) => a.score + b.score)
          .map((candidates, index) => (
            <RankingCard
              key={index}
              imageUrl={candidates.imageUrl!}
              name={candidates.name}
              score={candidates.score}
              rank={index + 1}
            />
          ))}
      </div>
    </div>
  );
}

interface RankingCardProps {
  imageUrl: string;
  name: string;
  score: number;
  rank: number;
}

function RankingCard({ imageUrl, name, score, rank }: RankingCardProps) {
  return (
    <div
      className={clsx("table grid grid-cols-4 place-items-center  p-2", {
        "bg-gradient-to-br from-primary to-yellow-300": rank === 1,
        "bg-gradient-to-br from-slate-400 to-yellow-300": rank === 2,
        "bg-gradient-to-br from-slate-500 to-yellow-300": rank === 3,
      })}
    >
      <div
        className={clsx("text-[60px] font-bold text-white", {
          "text-[35px]": rank !== 1,
        })}
      >
        {rank}
      </div>
      <div className="avatar">
        <div
          className={clsx("w-24 rounded-xl", {
            "w-14": rank !== 1,
          })}
        >
          <img src={imageUrl} />
        </div>
      </div>
      <div className="text-2xl">{name}</div>
      <div className="block text-2xl md:hidden">{score}.</div>
      <div className="hidden text-2xl md:block ">{score} คะแนน</div>
    </div>
  );
}
