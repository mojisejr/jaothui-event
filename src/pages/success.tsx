import Link from "next/link";
import { FaCheckCircle } from "react-icons/fa";
import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";
import { PushInvitation } from "~/components/MyEvents/PushInvitation";

export default function ProfileSuccessPage() {
  const { query } = useRouter();
  const { authReady, loggedIn, profile } = useLine();
  return (
    <div className="mt-10 flex h-screen w-full justify-center">
      <div className="flex flex-col items-center gap-6">
        <FaCheckCircle size={120} className="text-success" />
        <div className="text-2xl font-bold text-success">สำเร็จ</div>
        {query.registration === "royal" && (
          <PushInvitation
            ownerKey={authReady && loggedIn ? profile?.userId : undefined}
            eligible={authReady && loggedIn}
          />
        )}
        <Link className="btn btn-outline text-primary" href="/profile">
          กลับหน้าโปรไฟล์
        </Link>
      </div>
    </div>
  );
}
