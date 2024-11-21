import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { api } from "~/utils/api";

interface RegisterApprovementDetailProps {
  userId: string;
  eventRegisterId: string;
}

export default function RegisterApprovementDetail({
  userId,
  eventRegisterId,
}: RegisterApprovementDetailProps) {
  const { replace } = useRouter();

  const { data, isLoading } = api.royal.getApprovement.useQuery({
    userId: userId,
    targetId: eventRegisterId,
  });

  const {
    mutate: approve,
    isLoading: approving,
    isSuccess: approved,
    isError: approveError,
  } = api.royal.approve.useMutation();

  const handleApprovement = () => {
    if (!data?._id) {
      alert("ไม่พบ _id ของเอกสารยืนยัน");
      return;
    }

    approve({ userId, docId: data?._id, result: true });
  };

  const handleRejection = () => {
    if (!data?._id) {
      alert("ไม่พบ _id ของเอกสารยืนยัน");
      return;
    }
    approve({ userId, docId: data?._id, result: false });
  };

  useEffect(() => {
    if (approved) {
      void replace("/success");
    }
    if (approveError) {
      void replace("/error");
    }
  }, [approved, approveError]);

  if (isLoading) {
    return <div className="loading loading-spinner"></div>;
  }

  if (!data) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border p-2">
      <h2>ผลการอนุมัติ</h2>
      <>
        {data.approvementResult == null ? (
          <div className="rounded-md bg-white p-2 font-bold text-blue-500">
            รอการอนุมัติ
          </div>
        ) : (
          <div>
            {!data.approvementResult ? (
              <div className="rounded-md bg-white p-2 font-bold text-red-500">
                ไม่อนุมัติ
              </div>
            ) : (
              <div className="rounded-md bg-green-500 p-2 font-bold text-white">
                อนุมัติเรียบร้อย
              </div>
            )}
          </div>
        )}
        {data.approvementResult == null ? (
          <div className="flex gap-2">
            {!approving ? (
              <>
                <button onClick={handleApprovement} className="btn btn-primary">
                  อนุมัติ
                </button>
                <button onClick={handleRejection} className="btn btn-error">
                  ไม่อนุมัติ
                </button>
              </>
            ) : (
              <>
                <div className="loading loading-spinner"></div>
                <div className="text-white">กำลังยืนยัน...</div>
              </>
            )}
          </div>
        ) : null}
      </>
    </div>
  );
}
