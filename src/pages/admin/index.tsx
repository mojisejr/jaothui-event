import {
  competitionAdminPage,
  type CompetitionCutoverProps,
} from "~/server/admin/legacy-competition-cutover";
import CompetitionAdminUnavailable from "~/components/Admin/CompetitionAdminUnavailable";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { DashboardMenu } from "~/components/Admin/DashboardMenu";
import EventManagement from "~/components/Admin/EventManagement";
import VotesTab from "~/components/Admin/VotesTab";
import AdminRegistrationForm from "~/components/Admin/AdminRegistrationForm";
import { useAdmin } from "~/context/adminContext";

export const getServerSideProps = competitionAdminPage("index");

export default function AdminDashboard({
  competitionAdminUnavailable,
}: CompetitionCutoverProps) {
  return competitionAdminUnavailable ? (
    <CompetitionAdminUnavailable />
  ) : (
    <LegacyAdminDashboard />
  );
}

function LegacyAdminDashboard() {
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
          <div className="h-full w-full">
            {tab == "event" ? <EventManagement /> : null}
            {tab == "registration" ? <AdminRegistrationForm /> : null}
          </div>
        </div>
      ) : (
        <div className="text-xl font-bold text-primary">Not Admin</div>
      )}
    </div>
  );
}
