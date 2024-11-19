import React from "react";
import { api } from "~/utils/api";

interface RegisterGeneralDetailProps {
  userId: string;
}

export default function RegisterGeneralDetail({
  userId,
}: RegisterGeneralDetailProps) {
  const { data, isLoading } = api.registerEvent.getById.useQuery({
    id: userId,
  });

  if (isLoading) {
    return <div className="loading loading-spinner text-white"></div>;
  }

  return (
    <div>
      <h2>ข้อมูลการสมัคร</h2>
      <table className="table">
        <thead>
          <tr>
            <th>หัวข้อ</th>
            <th>รายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>_id</th>
            <td>{data?._id}</td>
          </tr>
          <tr>
            <th>ชื่อควาย</th>
            <td>{data?.name}</td>
          </tr>
          <tr>
            <th>ชื่อเจ้าของ</th>
            <td>{data?.ownerName}</td>
          </tr>
          <tr>
            <th>ชื่อฟาร์ม</th>
            <td>{data?.farmName}</td>
          </tr>
          <tr>
            <th>เบอร์โทรศัพท์</th>
            <td>{data?.ownerTel}</td>
          </tr>
          <tr>
            <th>วันเกิดควาย</th>
            <td>{data?.birthday}</td>
          </tr>
          <tr>
            <th>อายุคำนวนตามกำหนดการรับสมัคร</th>
            <td>{data?.buffaloAge} เดือน</td>
          </tr>
          <tr>
            <th>เพศ</th>
            <td>{data?.sex}</td>
          </tr>
          <tr>
            <th>ชื่อพ่อควาย</th>
            <td>{data?.fatherName}</td>
          </tr>
          <tr>
            <th>ชื่อแม่ควาย</th>
            <td>{data?.motherName}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
