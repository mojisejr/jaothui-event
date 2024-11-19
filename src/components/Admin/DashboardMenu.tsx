import Link from "next/link";
import { clsx } from "clsx";
import { useRouter } from "next/router";

export function DashboardMenu() {
  const { query } = useRouter();
  const { tab } = query;
  return (
    <div className="flex w-full gap-2 overflow-scroll">
      <Link
        href="/admin?tab=event"
        className={clsx("btn-bordered btn text-white", {
          "bg-primary text-primary-content": tab == "event",
        })}
      >
        จัดการงานประกวด
      </Link>
      {/* <Link
        href="/admin?tab=votes&menu=newVotes"
        className={clsx("btn-bordered btn text-white", {
          "bg-primary text-primary-content": tab == "votes",
        })}
      >
        Votes
      </Link> */}
    </div>
  );
}
