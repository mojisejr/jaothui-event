import { useRouter } from "next/router";
import React, { useEffect, useRef } from "react";
import { api } from "~/utils/api";

interface RegisterApprovementDetailProps {
  userId: string;
  eventRegisterId: string;
  targetId: string;
}

export default function RegisterApprovementDetail({
  userId,
  eventRegisterId,
  targetId,
}: RegisterApprovementDetailProps) {
  const { replace } = useRouter();
  const commentRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = api.royal.getApprovement.useQuery({
    userId: userId,
    targetId: eventRegisterId,
  });

  const { data: userData, isLoading: userLoading } =
    api.registerEvent.getById.useQuery({
      id: eventRegisterId,
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

    approve({
      targetId,
      userId,
      docId: data?._id,
      result: true,
      ownerName: userData?.ownerName ?? "ไม่พบข้อมูล",
      microchip: userData?.microchip ?? "ไม่พบข้อมูล",
      buffaloName: userData?.name ?? "ไม่พบข้อมูล",
      comment: "",
    });
  };

  const handleRejection = () => {
    if (!data?._id) {
      alert("ไม่พบ _id ของเอกสารยืนยัน");
      return;
    }
    if (!commentRef.current?.value) {
      alert("กรุณาใส่เหตุผล");
      return;
    }
    approve({
      targetId,
      userId,
      docId: data?._id,
      result: false,
      ownerName: userData?.ownerName ?? "ไม่พบข้อมูล",
      microchip: userData?.microchip ?? "ไม่พบข้อมูล",
      buffaloName: userData?.name ?? "ไม่พบข้อมูล",
      comment: commentRef.current?.value,
    });
  };

  useEffect(() => {
    if (approved) {
      void replace("/success");
    }
    if (approveError) {
      void replace("/error");
    }
  }, [approved, approveError]);

  if (isLoading || userLoading) {
    return <div className="loading loading-spinner"></div>;
  }

  if (!data || !userData) return null;

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
              <div className="flex flex-col gap-2">
                <div className="form-control">
                  <input
                    ref={commentRef}
                    type="text"
                    className="input text-black"
                    placeholder="ถ้าไม่อนุมัติกรุณาใส่เหตุผล"
                  />
                </div>
                <button onClick={handleApprovement} className="btn btn-primary">
                  อนุมัติ
                </button>
                <button onClick={handleRejection} className="btn btn-error">
                  ไม่อนุมัติ
                </button>
              </div>
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
