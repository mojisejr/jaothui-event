import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { useLine } from "~/context/lineContext";
import { useAdmin } from "~/context/adminContext";
import RegisterGeneralDetail from "~/components/Admin/RegisterGeneralDetail";
import RegisterAddressDetail from "~/components/Admin/RegisterAddressDetail";
import RegisterImagesDetail from "~/components/Admin/RegisterImagesDetail";
import RegisterApprovementDetail from "~/components/Admin/RegisterApprovementDetail";

export default function RegisterDetailPage() {
  const { query, replace } = useRouter();
  const { profile } = useLine();
  const { admin } = useAdmin();

  const { info } = query;

  useEffect(() => {
    if (!admin) {
      void replace("/profile");
    }
  }, [admin]);

  if (!info) {
    return <div>ไม่พอบข้อมูล</div>;
  }

  const registerId = info![0] ?? null;
  const targetId = info![1] ?? null;

  if (!targetId || !registerId) {
    return <div>ไม่พบข้อมูล</div>;
  }

  if (!profile) {
    return <div className="loading loading-spinner"></div>;
  }

  return (
    <div className="h-screen w-full overflow-y-scroll text-white">
      <div className="flex flex-col gap-2 p-2">
        <RegisterGeneralDetail userId={registerId} />
        <RegisterAddressDetail userId={profile?.userId} targetId={targetId} />
        <RegisterImagesDetail userId={profile?.userId} targetId={targetId} />
        <RegisterApprovementDetail
          userId={profile?.userId}
          eventRegisterId={registerId}
        />
      </div>
    </div>
  );
}
