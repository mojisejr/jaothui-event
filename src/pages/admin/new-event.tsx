import { useRouter } from "next/router";
import { useEffect } from "react";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";

export default function AdminNewEventPage() {
  const { replace } = useRouter();
  const { loggedIn, profile } = useLine();
  const { data: userData } = api.user.getById.useQuery({
    userId: profile ? profile?.userId : "",
  });

  useEffect(() => {
    if (!loggedIn) void replace("/");
    if (userData?.role != "ADMIN") void replace("/");
  }, [loggedIn, userData]);

  return (
    <div>
      Under Construction
      {/* <AdminNewEventPage /> */}
    </div>
  );
}
