import dayjs from "dayjs";
import Link from "next/link";
interface EventCardProps {
  id: number;
  date: Date;
  title: string;
  eventId: number;
  ownerName: string;
  microchip: string;
  imageUrl: string;
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
  id,
  date,
  title,
  eventId,
  ownerName,
  microchip,
}: EventCardProps) {
  const day = dayjs(date).date();
  const month = dayjs(date).month();

  return (
    <Link
      href={`/profile/my-events/${id}`}
      className="relative grid min-h-[100px] grid-cols-3 overflow-hidden rounded-md bg-accent px-5 py-6 text-primary-content shadow"
    >
      <div className="relative">
        <div className="cal-span-1 absolute -left-2 -top-6 flex h-[80px] w-[60px] flex-col items-center justify-center rounded-b-md bg-error shadow-sm">
          <div className="text-xl font-bold">{day}</div>
          <div className="text-sm font-bold">{Month[month]}</div>
        </div>
      </div>
      <div className="col-span-2">
        <div>
          งาน: <span className="text-primary">{title}</span>
        </div>
        <div>
          เจ้าของ: <span className="text-primary">{ownerName}</span>
        </div>
        <div>
          microchip: <span className="text-primary">{microchip}</span>
        </div>
      </div>
    </Link>
  );
}
