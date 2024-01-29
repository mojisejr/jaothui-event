import dayjs from "dayjs";
import Link from "next/link";
interface EventCardProps {
  date: Date;
  title: string;
  eventId: number;
  ownerName: string;
  buffaloName: string;
  microchip: string;
}

const Month = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export default function MyEventCard({
  date,
  title,
  ownerName,
  microchip,
  buffaloName,
}: EventCardProps) {
  const day = dayjs(date).date();
  const month = dayjs(date).month();

  return (
    <div className="relative grid min-h-[100px] grid-cols-4 overflow-hidden rounded-md bg-accent px-5 py-6 text-primary-content shadow">
      <div className="relative">
        <div className="cal-span-1 absolute -left-2 -top-6 flex h-[80px] w-[60px] flex-col items-center justify-center rounded-b-md bg-error shadow-sm">
          <div className="text-xl font-bold">{day}</div>
          <div className="text-sm font-bold">{Month[month]}</div>
        </div>
      </div>
      <div className="col-span-3">
        <h3>
          ชื่อควาย: <span className="text-primary">{buffaloName}</span>
        </h3>
        <div>
          เลขประจำตัวสัตว์: <span className="text-primary">{microchip}</span>
        </div>
        <div>
          เจ้าของ: <span className="text-primary">{ownerName}</span>
        </div>
        <div>
          งานประกวด: <span className="text-primary">{title}</span>
        </div>
      </div>
    </div>
  );
}
