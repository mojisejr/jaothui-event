import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { api } from "~/utils/api";

function PublicEventStatus() {
  const { query } = useRouter();
  const { docId } = query;
  const { data, isLoading, refetch } = api.royal.getStatus.useQuery(
    docId as string,
    {
      enabled: false,
    },
  );

  useEffect(() => {
    if (docId) {
      refetch();
    }
  }, [docId]);

  if (isLoading) {
    return <div className="loading loading-spinner"></div>;
  }

  if (!data) return null;

  return (
    <div className="h-screen text-white">
      <div className="flex w-full justify-center">
        <div className="mt-[100px] flex max-w-md flex-col items-center">
          <h1 className="text-xl">สถานะการสมัคร</h1>
          <div className="rounded-md border p-3">
            {data.approvementResult == null ? (
              <div className="text-xl text-blue-500">รอการอนุมัติ</div>
            ) : (
              <div>
                {data.approvementResult == true ? (
                  <div className="text-xl text-green-500">
                    อนุมัติเรียบร้อยแล้ว
                  </div>
                ) : (
                  <>
                    <div className="text-xl text-red-400">ไม่อนุมัติ</div>
                    <p className="text-white">{data.comment}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicEventStatus;
