import { useRouter } from "next/router";
import { useEffect } from "react";
import { DashboardMenu } from "~/components/Admin/DashboardMenu";
import EventTab from "~/components/Admin/EventTab";
import VotesTab from "~/components/Admin/VotesTab";
import { useAdmin } from "~/context/adminContext";

export default function AdminDashboard() {
  const { admin } = useAdmin();
  const { replace, query } = useRouter();
  const { tab } = query;

  useEffect(() => {
    if (!admin) {
      void replace("/profile");
    }
  }, [admin]);

  return (
    <div>
      {admin ? (
        <div className="min-h-screen">
          <div className="p-2">
            <DashboardMenu />
          </div>
          <div>
            {tab === "event" ? <EventTab /> : null}
            {/* {tab === "votes" ? <VotesTab /> : null} */}
          </div>
        </div>
      ) : (
        <div className="text-xl font-bold text-primary">Not Admin</div>
      )}
    </div>
  );
}
