import Link from "next/link";
import { useEffect } from "react";
import { useLine } from "~/context/lineContext";
import { useRouter } from "next/router";
import { api } from "~/utils/api";

export default function ProfileMenu() {
  const { logout, loggedIn, profile } = useLine();
  const { data: userData } = api.user.getById.useQuery({
    userId: profile ? profile.userId : "",
  });
  const { replace } = useRouter();

  console.log(profile);

  useEffect(() => {
    if (!loggedIn) {
      void replace("/");
    }
  }, [loggedIn]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-center font-bold">เมนู</h3>
      <Link className="btn btn-primary" href="/profile/my-events">
        การประกวดของคุณ
      </Link>
      <Link className="btn btn-primary" href="/events">
        รายการประกวด
      </Link>
      {userData?.role === "ADMIN" ? (
        <>
          <Link href="/admin/new-event" className="btn btn-primary">
            สร้างงานประกวด
          </Link>
        </>
      ) : null}

      <button onClick={() => logout()} className="btn btn-primary">
        ออกจากระบบ
      </button>
    </div>
  );
}
