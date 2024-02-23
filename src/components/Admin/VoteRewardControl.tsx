import Link from "next/link";

export function VotesRewardControl() {
  return (
    <div className="flex w-full flex-col gap-6">
      <Link href="/admin/roll" className="btn btn-secondary">
        ROLL
      </Link>
    </div>
  );
}
