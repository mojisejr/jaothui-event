import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { useLine } from "~/context/lineContext";
import { useAdmin } from "~/context/adminContext";
import { EventRegister } from "~/interfaces/EventRegister";
import Link from "next/link";

export default function EventMemberList() {
  const { profile } = useLine();
  const { admin } = useAdmin();
  const { query, replace } = useRouter();
  const filterInput = useRef<HTMLInputElement>(null);
  const [currentData, setCurrentData] = useState<EventRegister[]>([]);

  const { eventId } = query;

  const {
    data: eventRegister,
    isLoading: loadingEventRegister,
    refetch: loadEventRegister,
  } = api.registerEvent.getAllRegisterByEvent.useQuery(
    {
      userId: profile?.userId!,
      eventId: eventId as string,
    },
    { enabled: false },
  );

  const handleFilter = () => {
    const input = filterInput.current?.value;

    if (!input || input.length <= 0) {
      alert("กรุณากรอกข้อมูล");
      return;
    }

    const filtered = currentData.filter((f) => f.name.includes(input));
    setCurrentData(filtered);
  };

  const handleReset = () => {
    const input = filterInput.current?.value;

    if (!input || input.length <= 0) {
      setCurrentData(eventRegister!);
    }
  };

  useEffect(() => {
    if (eventId != null && profile?.userId! != null) {
      loadEventRegister();
    }
  }, [eventId]);

  useEffect(() => {
    if (eventRegister && currentData.length <= 0) {
      setCurrentData(eventRegister);
    }
  }, [eventRegister]);

  useEffect(() => {
    if (!admin) {
      void replace("/profile");
    }
  }, [admin]);

  if (loadingEventRegister) {
    return (
      <div className="h-full w-full">
        <div className="loading loading-spinner text-white"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-2 text-white">
        จำนวนผู้สมัคร {eventRegister?.length}
      </div>
      <div className="space-x-2 px-2">
        <input
          onChange={() => handleReset()}
          ref={filterInput}
          type="text"
          className="input input-sm"
          placeholder="ชื่อควาย"
        ></input>
        <button onClick={handleFilter} className="btn btn-primary btn-sm">
          ค้นหา
        </button>
      </div>
      <div className="mb-10 h-screen overflow-y-scroll">
        <table className="table table-sm text-white">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อผู้สมัคร</th>
              <th>ชื่อควาย</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {currentData?.map((e, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{e.ownerName}</td>
                <td>{e.name}</td>
                <td>
                  <Link
                    href={`/admin/event-manage/${eventId}/register/${e._id}/${e.user._id}`}
                    className="btn btn-sm"
                  >
                    ดู
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
