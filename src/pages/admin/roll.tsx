import { useRouter } from "next/router";
import { useEffect } from "react";
import SlotMachine from "~/components/Admin/SlotMachine";
import { useAdmin } from "~/context/adminContext";

export default function AdminDashboard() {
  const { admin } = useAdmin();
  const { replace } = useRouter();

  useEffect(() => {
    if (!admin) {
      void replace("/profile");
    }
  }, [admin]);

  return (
    <div>
      {admin ? (
        <div className="min-h-screen w-full px-4">
          <SlotMachine />
        </div>
      ) : (
        <div className="text-xl font-bold text-primary">Not Admin</div>
      )}
    </div>
  );
}
