import { api } from "~/utils/api";
import Loading1 from "../Shared/Loading1";
import dayjs from "dayjs";

interface DetailTableProp {
  registerId: number;
}

const Month = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export default function DetailTable({ registerId }: DetailTableProp) {
  const { data: event, isLoading } = api.registerEvent.getById.useQuery({
    id: registerId,
  });

  return (
    <>
      {isLoading ? (
        <Loading1 />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid max-w-md grid-cols-2 rounded-xl border-2 border-primary p-2">
            <div className="col-span-2 font-bold text-primary">
              รายละเอียดงาน
            </div>
            <div>งาน</div>
            <div>{event ? event?.event.title : "N/A"}</div>
            <div>วันจัดงาน</div>
            <div>{`${dayjs(new Date(event ? event?.event.startAt : "N/A")).get("date")} / ${Month[dayjs(new Date(event ? event?.event.startAt : "N/A")).get("month")]} / ${+dayjs(new Date(event ? event?.event.startAt : "N/A")).get("year") + 543}`}</div>
          </div>

          <div className="grid max-w-md grid-cols-2 rounded-xl border-2 border-primary p-2">
            <div className="col-span-2 font-bold text-primary">
              ข้อมูลการสมัคร
            </div>
            <div className="col-span-2 flex justify-center py-2">
              {event?.buffaloImage ? (
                <div className="w-48 overflow-hidden rounded-xl shadow">
                  <img src={event?.buffaloImage!} alt="รูปควาย" />
                </div>
              ) : (
                <div>N/A</div>
              )}
            </div>
            <div>microchip</div>
            <div>{event?.microchip}</div>
            <div>วันเกิด</div>
            <div>{`${dayjs(new Date(event ? event?.birthday : "N/A")).get("date")} / ${Month[dayjs(new Date(event ? event?.event.startAt : "N/A")).get("month")]} / ${+dayjs(new Date(event ? event?.event.startAt : "N/A")).get("year") + 543}`}</div>
            <div>ประเภท</div>
            <div>{event?.type}</div>
            <div>ระดับ</div>
            <div>{event?.level}</div>
            <div>เจ้าของ</div>
            <div>{event?.ownerName}</div>
            <div>ติดต่อ</div>
            <div>{event?.ownerTel}</div>
          </div>
        </div>
      )}
    </>
  );
}
