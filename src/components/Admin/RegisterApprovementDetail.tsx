import React from "react";
import { api } from "~/utils/api";

interface RegisterApprovementDetailProps {
  userId: string;
  eventRegisterId: string;
}

export default function RegisterApprovementDetail({
  userId,
  eventRegisterId,
}: RegisterApprovementDetailProps) {
  const { data, isLoading } = api.royal.getApprovement.useQuery({
    userId: userId,
    targetId: eventRegisterId,
  });

  if (isLoading) {
    return <div className="loading loading-spinner"></div>;
  }

  if (!data) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border p-2">
      <h2>ผลการอนุมัติ</h2>
      <>
        {data.approvementResult == null ? (
          <div>รอการอนุมัติ</div>
        ) : (
          <div>
            {!data.approvementResult ? (
              <div className="rounded-md bg-white p-2 font-bold text-red-500">
                ไม่อนุมัติ
              </div>
            ) : (
              <div className="rounded-md bg-white p-2 font-bold text-green-500">
                อนุมัติเรียบร้อย
              </div>
            )}
          </div>
        )}
        {data.approvementResult != null ? (
          <div className="flex gap-2">
            <button className="btn btn-primary">อนุมัติ</button>
            <button className="btn btn-error">ไม่อนุมัติ</button>
          </div>
        ) : null}
      </>
    </div>
  );
}
