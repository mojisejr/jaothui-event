import Link from "next/link";
import { clsx } from "clsx";
import { useRouter } from "next/router";
export function VotesTabMenu() {
  const { query } = useRouter();
  const { menu } = query;

  return (
    <div className="flex w-full gap-2 overflow-scroll">
      <Link
        href="/admin?tab=votes&menu=newVotes"
        className={clsx(`btn btn-ghost btn-sm`, {
          "bg-primary text-primary-content": menu == "newVotes",
        })}
      >
        สร้างการโหวต
      </Link>
      <Link
        href="/admin?tab=votes&menu=newCandidate"
        className={clsx(`btn btn-ghost btn-sm`, {
          "bg-primary text-primary-content": menu == "newCandidate",
        })}
      >
        เพิ่มข้อมูลควาย
      </Link>
      <Link
        href="/admin?tab=votes&menu=control"
        className={clsx(`btn btn-ghost btn-sm`, {
          "bg-primary text-primary-content": menu == "control",
        })}
      >
        ควบคุม
      </Link>
      <Link
        href="/admin?tab=votes&menu=reward"
        className={clsx(`btn btn-ghost btn-sm`, {
          "bg-primary text-primary-content": menu == "reward",
        })}
      >
        reward
      </Link>
    </div>
  );
}
