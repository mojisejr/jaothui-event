import React from "react";
import { api } from "~/utils/api";

interface HistoryTableProps {
  userId: string;
}

function HistoryTable({ userId }: HistoryTableProps) {
  const { data: events, isLoading } =
    api.registerEvent.getAllRegisteredBy.useQuery({
      userId: userId,
    });

  if (!userId) {
    return <div>ไม่มีข้อมูล</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-xs text-white md:table-md">
        <thead>
          <tr>
            <th>รายการ</th>
            <th>ประเภท</th>
            <th>รุ่น</th>
            <th>ชื่อควาย</th>
            <th>เลขไมโครชิบ</th>
            <th>วันเดือนปีเกิด</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td>
                <div className="loading loading-spinner loading-lg"></div>
              </td>
            </tr>
          ) : (
            <>
              {!events ? (
                <div>ไม่มีข้อมูล!</div>
              ) : (
                <>
                  {events.map((event) => (
                    <tr key={event._id}>
                      <td>{event.event.title}</td>
                      <td>{event.level}</td>
                      <td>{event.type}</td>
                      <td>{event.name}</td>
                      <td>{event.microchip}</td>
                      <td>{event.birthday}</td>
                    </tr>
                  ))}
                </>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default HistoryTable;
