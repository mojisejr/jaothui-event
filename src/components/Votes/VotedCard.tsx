interface VotedCardProps {
  imageUrl: string;
  name: string;
  score: number;
}

export default function VotedCard({ imageUrl, name, score }: VotedCardProps) {
  return (
    <div className="w-84 card card-compact relative bg-secondary">
      <figure>
        <img src={imageUrl} alt={name} width={1000} height={700} />
      </figure>
      <div className="card-body">
        <h2 className="card-title">
          <div>
            คุนโหวตให้กับ {'"'}
            {name}
            {'"'} เรียบร้อยแล้ว
          </div>
        </h2>
        <div className="text-2xl font-bold">{score} คะแนน</div>
        <p className="text-slate-600">สมาชิก 1 คนเท่ากับ 1 เสียง</p>
      </div>
    </div>
  );
}
