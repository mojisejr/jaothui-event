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
    <div className="relative grid min-h-[100px] grid-cols-4 overflow-hidden rounded-md bg-accent bg-primary px-5  py-6 shadow">
      <div className="col-span-4">
        <h3>
          ชื่อควาย: <span className="text-primary-content">{buffaloName}</span>
        </h3>
        <div>
          เลขประจำตัวสัตว์:{" "}
          <span className="text-primary-content">{microchip}</span>
        </div>
        <div>
          เจ้าของ: <span className="text-primary-content">{ownerName}</span>
        </div>
        <div>
          งานประกวด: <span className="text-primary-content">{title}</span>
        </div>
      </div>
    </div>
  );
}
