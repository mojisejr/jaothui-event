import Link from "next/link";
import { useLine } from "~/context/lineContext";

export default function ProfileMenu() {
  const { logout } = useLine();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-center font-bold">เมนู</h3>
      <Link className="btn btn-primary" href="/my-event">
        การประกวดของคุณ
      </Link>
      <Link className="btn btn-primary" href="/events">
        รายการประกวด
      </Link>

      <button onClick={() => logout()} className="btn btn-primary">
        ออกจากระบบ
      </button>
    </div>
  );
}
