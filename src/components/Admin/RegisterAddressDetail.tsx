import React from "react";
import { api } from "~/utils/api";

interface RegisterEventAddressDetailProps {
  userId: string;
  targetId: string;
}

export default function RegisterAddressDetail({
  userId,
  targetId,
}: RegisterEventAddressDetailProps) {
  const { data, isLoading } = api.royal.getAddress.useQuery({
    userId: userId,
    targetId: targetId,
  });

  if (isLoading) {
    return <div className="loading loading-spinner"></div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div>
      <div>
        <h2>ข้อมูลที่อยู่</h2>
        <table className="table">
          <thead>
            <tr>
              <th>หัวข้อ</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>ที่อยู่</th>
              <td>{data?.address}</td>
            </tr>
            <tr>
              <th>ตำบล</th>
              <td>{data?.district}</td>
            </tr>
            <tr>
              <th>อำเภอ</th>
              <td>{data?.amphoe}</td>
            </tr>
            <tr>
              <th>จังหวัด</th>
              <td>{data?.province}</td>
            </tr>
            <tr>
              <th>รหัสไปรษณี</th>
              <td>{data?.zipcode}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
