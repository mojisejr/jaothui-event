import Link from "next/link";
import { useEffect } from "react";
import { useLine } from "~/context/lineContext";
import { useRouter } from "next/router";
import AdminMenu from "../Admin/AdminMenu";
import { useAdmin } from "~/context/adminContext";

export default function ProfileMenu() {
  const { logout, loggedIn } = useLine();
  const { replace } = useRouter();
  const { admin } = useAdmin();

  useEffect(() => {
    if (!loggedIn) {
      void replace("/");
    }
  }, [loggedIn]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-center font-bold">เมนู</h3>
      <Link className="btn btn-primary rounded-full" href="/profile/my-events">
        ประวัติลงประกวด
      </Link>
      <Link className="btn btn-primary rounded-full" href="/events">
        รายการประกวดควาย
      </Link>
      {/* <Link className="btn btn-primary rounded-full" href="/votes">
        กิจกรรมการโหวด
      </Link> */}
      {admin ? (
        <>
          <AdminMenu />
          {/* <Link href="/admin/new-event" className="btn btn-primary">
            สร้างงานประกวด
          </Link> */}
        </>
      ) : null}

      <button onClick={() => logout()} className="btn btn-ghost text-secondary">
        ออกจากระบบ
      </button>
    </div>
  );
}
