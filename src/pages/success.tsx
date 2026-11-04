import Link from "next/link";
import { FaCheckCircle } from "react-icons/fa";

export default function ProfileSuccessPage() {
  return (
    <div className="mt-10 flex h-screen w-full justify-center">
      <div className="flex flex-col items-center gap-6">
        <FaCheckCircle size={120} className="text-success" />
        <div className="text-2xl font-bold text-success">สำเร็จ</div>
        <Link className="btn btn-outline text-primary" href="/profile">
          กลับหน้าโปรไฟล์
        </Link>
      </div>
    </div>
  );
}
